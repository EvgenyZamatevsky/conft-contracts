// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract ListingsErc721 is Ownable(msg.sender) {
    // Using struct packing optimization with two 256-bit slots:
    // 1st slot: 256 bits = 128-bit id + 128-bit price
    // 2nd slot: 256 bits = 160-bit address + 88-bit expireTime + 8-bit comission percent
    struct Listing {
        uint128 id;
        uint128 price;
        address seller;
        uint88 expireTime;
        uint8 commissionPercent;
    }

    // Maximum commission percent
    uint8 public constant MAX_COMMISION_PERCENT = 10;
    // Required to calculate the expiration time of a listing
    uint256 private constant SECONDS_IN_HOUR = 3_600;

    // Commission percent defines what part of the transaction's value the contract
    // keeps for itself. Can be adjusted with setCommissionPercent function
    uint8 public commissionPercent;

    // The map keeps listings, so we can instantly find one with getListing
    // externally or just via contract address and token id internally
    // contractAddress => tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) private _listings;

    // Track listing id, so each listing can have a unique number
    uint128 private _idCounter = 1;

    // Emits when a seller creates a new listing
    event ListingCreated(
        uint128 id,
        address indexed seller,
        address indexed contractAddress,
        uint256 indexed tokenId,
        uint128 price,
        uint88 expireTime,
        uint8 commissionPercent
    );

    // Emits when a seller cancels his listing
    event ListingRemoved(
        uint128 id,
        address indexed seller,
        address indexed contractAddress,
        uint256 indexed tokenId,
        uint128 price,
        uint88 expireTime
    );

    // Emits when a token has been sold to a buyer
    event TokenSold(
        uint128 id,
        address indexed seller,
        address buyer,
        address indexed contractAddress,
        uint256 indexed tokenId,
        uint128 price
    );

    // Emits when commissionPercent has been changed
    event CommissionPercentChanged(uint8 indexed percent);

    // Changes commission percent for purchases
    // The higher the percentage, the larger part of the transaction's value will be
    // kept by the contract. Can be changed only by the owner of the contract
    function setCommissionPercent(uint8 percent) external onlyOwner {
        require(percent <= MAX_COMMISION_PERCENT, "Max commission percent exceeded");

        emit CommissionPercentChanged(percent);

        commissionPercent = percent;
    }

    // Transfers all the weis of the contract to the owner
    function withdraw() external onlyOwner {
        (bool success, ) = payable(msg.sender).call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }

    // Creates a listing for a token
    function addListing(
        address contractAddress,
        uint256 tokenId,
        uint128 price,
        uint16 durationHours
    ) external {
        // Forbid free listings
        require(price > 0, "Price must be > 0");
        // Forbid immediately expiring listings
        require(durationHours > 0, "Duration must be > 0");

        // Forbid listings for tokens of other accounts
        IERC721 nftContract = IERC721(contractAddress);
        address nftOwner = nftContract.ownerOf(tokenId);
        require(nftOwner == msg.sender, "Caller is not the owner");

        // Forbid listings for unapproved tokens
        bool isApproved = nftContract.isApprovedForAll(nftOwner, address(this));
        require(isApproved, "Contract is not approved");

        uint128 id = _idCounter;

        // Calculate the time when this listing becomes unavailable
        uint88 expireTime = uint88(block.timestamp + (durationHours * SECONDS_IN_HOUR));
        uint8 listingCommissionPercent = commissionPercent;
        // Add the listing to the map
        _listings[contractAddress][tokenId] = Listing({
            id: id,
            price: price,
            seller: msg.sender,
            expireTime: expireTime,
            commissionPercent: listingCommissionPercent
        });

        emit ListingCreated(
            id,
            msg.sender,
            contractAddress,
            tokenId,
            price,
            expireTime,
            listingCommissionPercent
        );
        // Increment the counter for the next listing
        _idCounter = id + 1;
    }

    // Allows to manually cancel a listing
    function cancelListing(address contractAddress, uint256 tokenId) external {
        mapping(uint256 => Listing) storage contractListings = _listings[contractAddress];
        Listing memory listing = contractListings[tokenId];
        // Since free listings are forbidden, a found listing with 0 price
        // basically means that there is no such listing
        require(listing.price > 0, "Listing does not exist");
        // Only the creator can cancel his listings
        require(listing.seller == msg.sender, "Caller is not the seller");

        // Remove the listing from the map
        _clearListing(contractListings, tokenId);

        emit ListingRemoved(
            listing.id,
            msg.sender,
            contractAddress,
            tokenId,
            listing.price,
            listing.expireTime
        );
    }

    // Allows to buy a token
    function buyToken(address contractAddress, uint256 tokenId) external payable {
        mapping(uint256 => Listing) storage contractListings = _listings[contractAddress];
        Listing memory listing = contractListings[tokenId];
        // Since free listings are forbidden, a found listing with 0 price
        // basically means that there is no such listing
        require(listing.price > 0, "Listing does not exist");
        // Do not allow buying a token via an expired listing
        require(block.timestamp < listing.expireTime, "Listing is expired");
        // Do not allow accounts to buy their own tokens
        require(msg.sender != listing.seller, "Seller can not buy his tokens");

        // Check if the seller still owns his token
        IERC721 nftContract = IERC721(contractAddress);
        address nftOwner = nftContract.ownerOf(tokenId);
        require(nftOwner == listing.seller, "Seller is not the owner");

        // Check if the token is still approved for this contract
        bool isApproved = nftContract.isApprovedForAll(nftOwner, address(this));
        require(isApproved, "Contract is not approved");

        // Allow the buyer to buy at the price that the seller wants
        // price check must be the last because of Atlas IDE bug
        require(msg.value == listing.price, "Mismatch of funds");

        emit TokenSold(
            listing.id,
            listing.seller,
            msg.sender,
            contractAddress,
            tokenId,
            listing.price
        );

        // Remove the listing from the map
        _clearListing(contractListings, tokenId);
        // Transfer the token to the buyer
        nftContract.safeTransferFrom(nftOwner, msg.sender, tokenId);
        // Calculate the commission for this transaction
        uint256 commission = msg.value * listing.commissionPercent / 100;
        uint256 valueWithoutCommission = msg.value - commission;
        // Transfer money to the seller
        (bool success, ) = payable(listing.seller).call{value: valueWithoutCommission}("");
        require(success, "Transfer failed");
    }

    // Instantly find a listing with a contract address and token id
    function getListing(
        address contractAddress,
        uint256 tokenId
    ) external view returns (Listing memory) {
        return _listings[contractAddress][tokenId];
    }

    // Remove a listing from the state
    function _clearListing(
        mapping(uint256 => Listing) storage contractListings,
        uint256 tokenId
    ) private {
        delete contractListings[tokenId];
    }
}

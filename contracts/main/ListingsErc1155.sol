// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract ListingsErc1155 is Ownable(msg.sender) {
    // Using struct packing optimization with two 256-bit slots:
    // 1st slot: 256 bits = 128-bit id + 128-bit amount
    // 2nd slot: 256 bits = 128-bit price + 120-bit expireTime + 8-bit comission percent
    struct Listing {
        uint128 id;
        uint128 amount;
        uint128 price;
        uint120 expireTime;
        uint8 commissionPercent;
    }

    // Maximum commission percent
    uint8 public constant MAX_COMMISION_PERCENT = 10;
    // Required to calculate the expiration time of a listing
    uint256 private constant SECONDS_IN_HOUR = 3_600;

    // Commission percent defines what part of the transaction's value the contract
    // keeps for itself. Can be adjusted with setCommissionPercent function
    uint8 public commissionPercent;

    // Map keeps listings, so we can instantly find one with getListing externally
    // or just via contract address, token id and seller address internally.
    // We use the seller address here because several sellers can create listings
    // for the same token id, since they own not the whole token but the amount of it
    // contractAddress => tokenId => seller => Listing
    mapping(address => mapping(uint256 => mapping(address => Listing))) private _listings;

    // Track listing id, so each listing can have a unique number
    uint128 private _idCounter = 1;

    // Emits when a seller creates a new listing
    event ListingCreated(
        uint128 id,
        address indexed seller,
        address indexed contractAddress,
        uint256 indexed tokenId,
        uint128 amount,
        uint128 price,
        uint120 expireTime,
        uint8 commissionPercent
    );

    // Emits when a seller cancels his listing
    event ListingRemoved(
        uint128 id,
        address indexed seller,
        address indexed contractAddress,
        uint256 indexed tokenId,
        uint128 amount,
        uint128 price,
        uint120 expireTime
    );

    // Emits when a token has been sold to a buyer
    event TokenSold(
        uint128 id,
        address indexed seller,
        address buyer,
        address indexed contractAddress,
        uint256 indexed tokenId,
        uint128 amount,
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
        uint128 amount,
        uint128 price,
        uint16 durationHours
    ) external {
        // Do not allow empty listings
        require(amount > 0, "Amount must be > 0");
        // Forbid free listings
        require(price > 0, "Price must be > 0");
        // Forbid immediately expiring listings
        require(durationHours > 0, "Duration must be > 0");

        // Do not allow selling more tokens than one has
        IERC1155 nftContract = IERC1155(contractAddress);
        uint256 ownerTokenAmount = nftContract.balanceOf(msg.sender, tokenId);
        require(amount <= ownerTokenAmount, "Not enough tokens");

        // Forbid listings for unapproved tokens
        bool isApproved = nftContract.isApprovedForAll(msg.sender, address(this));
        require(isApproved, "Contract is not approved");

        uint128 id = _idCounter;
        // Calculate the time when this listing becomes unavailable
        uint120 expireTime = uint120(block.timestamp + (durationHours * SECONDS_IN_HOUR));
        uint8 listingCommissionPercent = commissionPercent;
        // Add the listing to the map
        _listings[contractAddress][tokenId][msg.sender] = Listing({
            id: id,
            amount: amount,
            price: price,
            expireTime: expireTime,
            commissionPercent: listingCommissionPercent
        });

        emit ListingCreated(
            id,
            msg.sender,
            contractAddress,
            tokenId,
            amount,
            price,
            expireTime,
            listingCommissionPercent
        );
        // Increment the counter for the next listing
        _idCounter = id + 1;
    }

    // Allows to manually cancel a listing
    function cancelListing(address contractAddress, uint256 tokenId) external {
        mapping(address => Listing) storage tokenListings =
            _listings[contractAddress][tokenId];
        Listing memory listing = tokenListings[msg.sender];
        // Since free listings are forbidden, a found listing with 0 price
        // basically means that there is no such listing
        require(listing.price > 0, "Listing does not exist");

        // Remove the listing from the map
        _clearListing(tokenListings, msg.sender);

        emit ListingRemoved(
            listing.id,
            msg.sender,
            contractAddress,
            tokenId,
            listing.amount,
            listing.price,
            listing.expireTime
        );
    }

    // Allows to buy a token
    function buyToken(
        address contractAddress,
        uint256 tokenId,
        address seller,
        uint256 amount
    ) external payable {
        mapping(address => Listing) storage tokenListings =
            _listings[contractAddress][tokenId];
        Listing memory listing = tokenListings[seller];
        // Since free listings are forbidden, a found listing with 0 price
        // basically means that there is no such listing
        require(listing.price > 0, "Listing does not exist");
        // Do not allow to buy a token via an expired listing
        require(block.timestamp < listing.expireTime, "Listing is expired");
        // Do not allow accounts to buy their own tokens
        require(msg.sender != seller, "Seller can not buy his tokens");
        // Check if the desired and saved amounts are the same
        // Preventing possible race condition. See additional info here:
        // https://github.com/Conft-dev/conft-contracts/issues/32
        require(amount == listing.amount, "Incorrect amount");

        // Check if the seller still owns his tokens
        IERC1155 nftContract = IERC1155(contractAddress);
        uint256 ownerTokenAmount = nftContract.balanceOf(seller, tokenId);
        require(listing.amount <= ownerTokenAmount, "Not enough tokens");

        // Check if the tokens are still approved for this contract
        bool isApproved = nftContract.isApprovedForAll(seller, address(this));
        require(isApproved, "Contract is not approved");

        // Allow the buyer to buy at the price that the seller wants
        // price check must be the last because of Atlas IDE bug
        require(msg.value == listing.price * listing.amount, "Mismatch of funds");

        emit TokenSold(
            listing.id,
            seller,
            msg.sender,
            contractAddress,
            tokenId,
            listing.amount,
            listing.price
        );

        // Remove the listing from the map
        _clearListing(tokenListings, seller);
        // Transfer the tokens to the buyer
        nftContract.safeTransferFrom(seller, msg.sender, tokenId, listing.amount, "");
        // Calculate the commission for this transaction
        uint256 commission = msg.value * listing.commissionPercent / 100;
        uint256 valueWithoutCommission = msg.value - commission;
        // Transfer money to the seller
        (bool success, ) = payable(seller).call{value: valueWithoutCommission}("");
        require(success, "Transfer failed");
    }

    // Instantly find a listing with a contract address and token id
    function getListing(
        address contractAddress,
        uint256 tokenId,
        address seller
    ) external view returns (Listing memory) {
        return _listings[contractAddress][tokenId][seller];
    }

    // Remove a listing from the state
    function _clearListing(
        mapping(address => Listing) storage tokenListings,
        address seller
    ) private {
        delete tokenListings[seller];
    }
}

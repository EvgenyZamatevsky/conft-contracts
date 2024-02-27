// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract ListingsERC721 is Ownable(msg.sender) {
    // Using struct packing optimisation with two 256 bit slots:
    // 1st slot: 256 bit = 128 bit id + 128 bit price
    // 2nd slot: 256 bit = 160 bit address + 96 bit expireTime
    struct Listing {
        uint128 id;
        uint128 price;
        address seller;
        uint96 expireTime;
    }

    // Required to calculate expiration time of a listing
    uint96 constant SECONDS_IN_HOUR = 3600;

    // Comission percent defines what part of transaction's value the contract
    // keeps for itself. Can be adjusted with setComissionPercent function
    uint256 public comissionPercent;

    // The map keeps listings so we can instantly find one with getListing
    // externally or just via contract address and token id internally
    // contractAddress => tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) private _listings;

    // Track listing id so each listing can have unique number
    uint128 private _idCounter = 1;

    // Emits when a seller creates a new listing
    event ListingCreated(
        uint128 id,
        address seller,
        address contractAddress,
        uint256 tokenId,
        uint128 price,
        uint96 expireTime
    );

    // Emits when a seller cancels its listing
    event ListingRemoved(
        uint128 id,
        address seller,
        address contractAddress,
        uint256 tokenId,
        uint128 price,
        uint96 expireTime
    );

    // Emits when a token has been sold to a buyer
    event TokenSold(
        uint128 id,
        address seller,
        address buyer,
        address contractAddress,
        uint256 tokenId,
        uint128 price
    );

    // Changes comission percent for a purchase
    // The higher the percentage, the larger part of transaction's value will be
    // kept by the contract. Can be changed only by the owner of the contract
    function setComissionPercent(uint256 percent) external onlyOwner {
        require(percent < 100, "Comission % must be < 100");

        comissionPercent = percent;
    }

    // Transfers all the weis of the contract to the owner
    function withdraw() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
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
        uint96 expireTime = uint96(block.timestamp + (durationHours * SECONDS_IN_HOUR));
        // Add the listing to the map
        _listings[contractAddress][tokenId] = Listing(id, price, msg.sender, expireTime);

        emit ListingCreated(
            id,
            msg.sender,
            contractAddress,
            tokenId,
            price,
            expireTime
        );
        // Increment the counter for next listing
        ++_idCounter;
    }

    // Allows to manually cancel a listing
    function cancelListing(address contractAddress, uint256 tokenId) external {
        Listing memory listing = _listings[contractAddress][tokenId];
        // Since free listings are forbidden, a found listing with 0 price
        // basically means that there is no such listing
        require(listing.price > 0, "Listing does not exist");
        // Only the creator can cancel his listings
        require(listing.seller == msg.sender, "Caller is not the seller");

        // Only the owner can cancel his listings
        address nftOwner = IERC721(contractAddress).ownerOf(tokenId);
        require(nftOwner == msg.sender, "Caller is not the owner");

        // Remove the listing from the map
        _clearListing(contractAddress, tokenId);

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
        Listing memory listing = _listings[contractAddress][tokenId];
        // Since free listings are forbidden, a found listing with 0 price
        // basically means that there is no such listing
        require(listing.price > 0, "Listing does not exist");
        // Do not allow to buy a token via expired listing
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

        // Allow to buy with the price that seller wants
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
        _clearListing(contractAddress, tokenId);
        // Transfer the token to the buyer
        nftContract.safeTransferFrom(nftOwner, msg.sender, tokenId);
        // Calculate comission for this transaction
        uint256 comission = msg.value * comissionPercent / 100;
        uint256 valueWithoutComission = msg.value - comission;
        // Transfer money to the seller
        payable(listing.seller).transfer(valueWithoutComission);
    }

    // Instantly find a listing with contract address and token id
    function getListing(
        address contractAddress,
        uint256 tokenId
    ) external view returns (Listing memory) {
        return _listings[contractAddress][tokenId];
    }

    // Remove a listing from the state
    function _clearListing(address contractAddress, uint256 tokenId) private {
        delete _listings[contractAddress][tokenId];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract ListingsERC1155 is Ownable(msg.sender) {
    // Using struct packing optimisation with two 256 bit slots:
    // 1st slot: 256 bit = 128 bit id + 128 bit amount
    // 2nd slot: 256 bit = 128 bit price + 128 bit expireTime
    struct Listing {
        uint128 id;
        uint128 amount;
        uint128 price;
        uint128 expireTime;
    }

    // Required to calculate expiration time of a listing
    uint96 constant SECONDS_IN_HOUR = 3600;

    // Comission percent defines what part of transaction's value the contract
    // keeps for itself. Can be adjusted with setComissionPercent function
    uint256 public comissionPercent;

    // Map keeps listings so we can instantly find one with getListing externally
    // or just via contract address, token id and seller address internally
    // We use seller address here because several sellers can create listings
    // for the same token id, since they own not the whole token but amount of it
    // contractAddress => tokenId => seller => Listing
    mapping(address => mapping(uint256 => mapping(address => Listing))) private _listings;

    // Track listing id so each listing can have unique number
    uint128 private _idCounter = 1;

    // Emits when a seller creates a new listing
    event ListingCreated(
        uint128 id,
        address seller,
        address contractAddress,
        uint256 tokenId,
        uint128 amount,
        uint128 price,
        uint128 expireTime
    );

    // Emits when a seller cancels its listing
    event ListingRemoved(
        uint128 id,
        address seller,
        address contractAddress,
        uint256 tokenId,
        uint128 amount,
        uint128 price,
        uint128 expireTime
    );

    // Emits when a token has been sold to a buyer
    event TokenSold(
        uint128 id,
        address seller,
        address buyer,
        address contractAddress,
        uint256 tokenId,
        uint128 amount,
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

        // Do not allow to sell more tokens than one have
        IERC1155 nftContract = IERC1155(contractAddress);
        uint256 ownerTokenAmount = nftContract.balanceOf(msg.sender, tokenId);
        require(amount <= ownerTokenAmount, "Not enough tokens");

        // Forbid listings for unapproved tokens
        bool isApproved = nftContract.isApprovedForAll(msg.sender, address(this));
        require(isApproved, "Contract is not approved");

        uint128 id = _idCounter;
        // Calculate the time when this listing becomes unavailable
        uint128 expireTime = uint128(block.timestamp + (durationHours * SECONDS_IN_HOUR));
        // Add the listing to the map
        _listings[contractAddress][tokenId][msg.sender] = Listing(id, amount, price, expireTime);

        emit ListingCreated(
            id,
            msg.sender,
            contractAddress,
            tokenId,
            amount,
            price,
            expireTime
        );
        // Increment the counter for next listing
        ++_idCounter;
    }

    // Allows to manually cancel a listing
    function cancelListing(address contractAddress, uint256 tokenId) external {
        Listing memory listing = _listings[contractAddress][tokenId][msg.sender];
        // Since free listings are forbidden, a found listing with 0 price
        // basically means that there is no such listing
        require(listing.price > 0, "Listing does not exist");

        // Remove the listing from the map
        _clearListing(contractAddress, tokenId, msg.sender);

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
        address seller
    ) external payable {
        Listing memory listing = _listings[contractAddress][tokenId][seller];
        // Since free listings are forbidden, a found listing with 0 price
        // basically means that there is no such listing
        require(listing.price > 0, "Listing does not exist");
        // Do not allow to buy a token via expired listing
        require(block.timestamp < listing.expireTime, "Listing is expired");
        // Do not allow accounts to buy their own tokens
        require(msg.sender != seller, "Seller can not buy his tokens");

        // Check if the seller still owns his tokens
        IERC1155 nftContract = IERC1155(contractAddress);
        uint256 ownerTokenAmount = nftContract.balanceOf(seller, tokenId);
        require(listing.amount <= ownerTokenAmount, "Not enough tokens");

        // Check if the tokens are still approved for this contract
        bool isApproved = nftContract.isApprovedForAll(seller, address(this));
        require(isApproved, "Contract is not approved");

        // Allow to buy with the price that seller wants
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
        _clearListing(contractAddress, tokenId, seller);
        // Transfer tokens to the buyer
        nftContract.safeTransferFrom(seller, msg.sender, tokenId, listing.amount, "");
        // Calculate comission for this transaction
        uint256 comission = msg.value * comissionPercent / 100;
        uint256 valueWithoutComission = msg.value - comission;
        // Transfer money to the seller
        payable(seller).transfer(valueWithoutComission);
    }

    // Instantly find a listing with contract address and token id
    function getListing(
        address contractAddress,
        uint256 tokenId,
        address seller
    ) external view returns (Listing memory) {
        return _listings[contractAddress][tokenId][seller];
    }

    // Remove a listing from the state
    function _clearListing(address contractAddress, uint256 tokenId, address seller) private {
        delete _listings[contractAddress][tokenId][seller];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract ListingsERC1155 is Ownable(msg.sender) {
    struct Listing {
        uint256 amount;
        uint256 price;
        uint256 expireTime;
    }

    // contractAddress => tokenId => seller => Listing
    mapping(address => mapping(uint256 => mapping(address => Listing))) private _listings;

    uint constant SECONDS_IN_HOUR = 3600;

    event ListingCreated(
        address seller,
        address contractAddress,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        uint256 expireTime
    );

    event ListingRemoved(
        address seller,
        address contractAddress,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        uint256 expireTime
    );

    event TokenSold(
        address seller,
        address buyer,
        address contractAddress,
        uint256 tokenId,
        uint256 amount,
        uint256 price
    );


    function withdraw() public onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    function addListing(
        address contractAddress,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        uint256 durationHours
    ) public {
        require(amount > 0, "Amount must be > 0");
        require(price > 0, "Price must be > 0");
        require(durationHours > 0, "Duration must be > 0");

        IERC1155 nftContract = IERC1155(contractAddress);
        uint256 ownerTokenAmount = nftContract.balanceOf(msg.sender, tokenId);
        require(amount <= ownerTokenAmount, "Not enough tokens");

        bool isApproved = nftContract.isApprovedForAll(msg.sender, address(this));
        require(isApproved, "Contract is not approved");

        // add new listing
        uint256 expireTime = block.timestamp + (durationHours * SECONDS_IN_HOUR);
        _listings[contractAddress][tokenId][msg.sender] = Listing(amount, price, expireTime);

        emit ListingCreated(msg.sender, contractAddress, tokenId, amount, price, expireTime);
    }

    function cancelListing(address contractAddress, uint256 tokenId) public {
        Listing memory listing = _listings[contractAddress][tokenId][msg.sender];
        require(listing.price > 0, "Listing does not exist");

        _clearListing(contractAddress, tokenId, msg.sender);

        emit ListingRemoved(
            msg.sender,
            contractAddress,
            tokenId,
            listing.amount,
            listing.price,
            listing.expireTime
        );
    }

    function buyToken(
        address contractAddress,
        uint256 tokenId,
        address seller
    ) payable public {
        Listing memory listing = _listings[contractAddress][tokenId][seller];
        require(listing.price > 0, "Listing does not exist");
        require(block.timestamp <= listing.expireTime, "Listing is expired");
        require(msg.sender != seller, "Seller can not buy his tokens");

        IERC1155 nftContract = IERC1155(contractAddress);
        uint256 ownerTokenAmount = nftContract.balanceOf(seller, tokenId);
        require(listing.amount <= ownerTokenAmount, "Not enough tokens");

        bool isApproved = nftContract.isApprovedForAll(seller, address(this));
        require(isApproved, "Contract is not approved");

        // price check must be last because of Atlas IDE bug
        require(msg.value == listing.price * listing.amount, "Mismatch of funds");

        // transfer tokens to buyer
        nftContract.safeTransferFrom(seller, msg.sender, tokenId, listing.amount, "");
        // transfer money to seller
        payable(seller).transfer(msg.value);
        // clear listing
        _clearListing(contractAddress, tokenId, seller);

        emit TokenSold(seller, msg.sender, contractAddress, tokenId, listing.amount, listing.price);
    }

    function getListing(
        address contractAddress,
        uint256 tokenId,
        address seller
    ) public view returns (Listing memory) {
        return _listings[contractAddress][tokenId][seller];
    }

    function _clearListing(address contractAddress, uint256 tokenId, address seller) private {
        delete _listings[contractAddress][tokenId][seller];
    }
}
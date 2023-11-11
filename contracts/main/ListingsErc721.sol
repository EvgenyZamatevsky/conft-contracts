// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract ListingsERC721 is Ownable(msg.sender) {
    struct Listing {
        uint256 price;
        address seller;
        uint256 expireTime;
    }

    // contractAddress => tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) private _listings;

    uint constant SECONDS_IN_HOUR = 3600;

    event ListingCreated(
        address seller,
        address contractAddress,
        uint256 tokenId,
        uint256 price,
        uint256 expireTime
    );

    event ListingRemoved(
        address seller,
        address contractAddress,
        uint256 tokenId,
        uint256 price,
        uint256 expireTime
    );

    event TokenSold(
        address seller,
        address buyer,
        address contractAddress,
        uint256 tokenId,
        uint256 price
    );


    function withdraw() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    function addListing(
        address contractAddress,
        uint256 tokenId,
        uint256 price,
        uint256 durationHours
    ) external {
        require(price > 0, "Price must be > 0");
        require(durationHours > 0, "Duration must be > 0");

        IERC721 nftContract = IERC721(contractAddress);
        address nftOwner = nftContract.ownerOf(tokenId);
        require(nftOwner == msg.sender, "Caller is not the owner");

        bool isApproved = nftContract.isApprovedForAll(nftOwner, address(this));
        require(isApproved, "Contract is not approved");

        // add new listing
        uint256 expireTime = block.timestamp + (durationHours * SECONDS_IN_HOUR);
        _listings[contractAddress][tokenId] = Listing(price, msg.sender, expireTime);

        emit ListingCreated(msg.sender, contractAddress, tokenId, price, expireTime);
    }

    function cancelListing(address contractAddress, uint256 tokenId) external {
        Listing memory listing = _listings[contractAddress][tokenId];
        require(listing.price > 0, "Listing does not exist");
        require(listing.seller == msg.sender, "Caller is not the creator of the listing");

        address nftOwner = IERC721(contractAddress).ownerOf(tokenId);
        require(nftOwner == msg.sender, "Caller is not the owner");

        _clearListing(contractAddress, tokenId);

        emit ListingRemoved(
            msg.sender,
            contractAddress,
            tokenId,
            listing.price,
            listing.expireTime
        );
    }

    function buyToken(address contractAddress, uint256 tokenId) external payable {
        Listing memory listing = _listings[contractAddress][tokenId];
        require(listing.price > 0, "Listing does not exist");
        require(block.timestamp <= listing.expireTime, "Listing is expired");
        require(msg.sender != listing.seller, "Seller can not buy his tokens");

        IERC721 nftContract = IERC721(contractAddress);
        address nftOwner = nftContract.ownerOf(tokenId);
        require(nftOwner == listing.seller, "Seller is not the owner");

        bool isApproved = nftContract.isApprovedForAll(nftOwner, address(this));
        require(isApproved, "Contract is not approved");

        // price check must be last because of Atlas IDE bug
        require(msg.value == listing.price, "Mismatch of funds");

        emit TokenSold(listing.seller, msg.sender, contractAddress, tokenId, listing.price);

        // clear listing
        _clearListing(contractAddress, tokenId);
        // transfer tokens to buyer
        nftContract.safeTransferFrom(nftOwner, msg.sender, tokenId);
        // transfer money to seller
        payable(listing.seller).transfer(msg.value);
    }

    function getListing(
        address contractAddress,
        uint256 tokenId
    ) external view returns (Listing memory) {
        return _listings[contractAddress][tokenId];
    }

    function _clearListing(address contractAddress, uint256 tokenId) private {
        delete _listings[contractAddress][tokenId];
    }
}

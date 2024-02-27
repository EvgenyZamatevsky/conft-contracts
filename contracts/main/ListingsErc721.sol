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

    uint96 constant SECONDS_IN_HOUR = 3600;

    uint public comissionPercent = 0;

    // contractAddress => tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) private _listings;
    // count listing ids
    uint128 private _idCounter = 1;

    event ListingCreated(
        uint128 id,
        address seller,
        address contractAddress,
        uint256 tokenId,
        uint128 price,
        uint96 expireTime
    );

    event ListingRemoved(
        uint128 id,
        address seller,
        address contractAddress,
        uint256 tokenId,
        uint128 price,
        uint96 expireTime
    );

    event TokenSold(
        uint128 id,
        address seller,
        address buyer,
        address contractAddress,
        uint256 tokenId,
        uint128 price
    );


    function setComissionPercent(uint256 percent) external onlyOwner {
        require(percent < 100, "Comission percent must be less than 100");

        comissionPercent = percent;
    }

    function withdraw() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    function addListing(
        address contractAddress,
        uint256 tokenId,
        uint128 price,
        uint16 durationHours
    ) external {
        require(price > 0, "Price must be > 0");
        require(durationHours > 0, "Duration must be > 0");

        IERC721 nftContract = IERC721(contractAddress);
        address nftOwner = nftContract.ownerOf(tokenId);
        require(nftOwner == msg.sender, "Caller is not the owner");

        bool isApproved = nftContract.isApprovedForAll(nftOwner, address(this));
        require(isApproved, "Contract is not approved");

        // add new listing
        uint128 id = _idCounter;
        uint96 expireTime = uint96(block.timestamp + (durationHours * SECONDS_IN_HOUR));
        _listings[contractAddress][tokenId] = Listing(id, price, msg.sender, expireTime);

        emit ListingCreated(
            id,
            msg.sender,
            contractAddress,
            tokenId,
            price,
            expireTime
        );
        ++_idCounter;
    }

    function cancelListing(address contractAddress, uint256 tokenId) external {
        Listing memory listing = _listings[contractAddress][tokenId];
        require(listing.price > 0, "Listing does not exist");
        require(listing.seller == msg.sender, "Caller is not the creator of the listing");

        address nftOwner = IERC721(contractAddress).ownerOf(tokenId);
        require(nftOwner == msg.sender, "Caller is not the owner");

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

        emit TokenSold(
            listing.id,
            listing.seller,
            msg.sender,
            contractAddress,
            tokenId,
            listing.price
        );

        // clear listing
        _clearListing(contractAddress, tokenId);
        // transfer tokens to buyer
        nftContract.safeTransferFrom(nftOwner, msg.sender, tokenId);
        // transfer money to seller
        uint256 comission = msg.value * comissionPercent / 100;
        uint256 valueWithoutComission = msg.value - comission;
        payable(listing.seller).transfer(valueWithoutComission);
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

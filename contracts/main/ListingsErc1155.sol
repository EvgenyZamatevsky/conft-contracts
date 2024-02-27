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

    uint96 constant SECONDS_IN_HOUR = 3600;

    uint256 public comissionPercent;

    // contractAddress => tokenId => seller => Listing
    mapping(address => mapping(uint256 => mapping(address => Listing))) private _listings;
    // count listing ids
    uint128 private _idCounter = 1;

    event ListingCreated(
        uint128 id,
        address seller,
        address contractAddress,
        uint256 tokenId,
        uint128 amount,
        uint128 price,
        uint128 expireTime
    );

    event ListingRemoved(
        uint128 id,
        address seller,
        address contractAddress,
        uint256 tokenId,
        uint128 amount,
        uint128 price,
        uint128 expireTime
    );

    event TokenSold(
        uint128 id,
        address seller,
        address buyer,
        address contractAddress,
        uint256 tokenId,
        uint128 amount,
        uint128 price
    );


    function setComissionPercent(uint256 percent) external onlyOwner {
        require(percent < 100, "Comission % must be < 100");

        comissionPercent = percent;
    }

    function withdraw() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    function addListing(
        address contractAddress,
        uint256 tokenId,
        uint128 amount,
        uint128 price,
        uint16 durationHours
    ) external {
        require(amount > 0, "Amount must be > 0");
        require(price > 0, "Price must be > 0");
        require(durationHours > 0, "Duration must be > 0");

        IERC1155 nftContract = IERC1155(contractAddress);
        uint256 ownerTokenAmount = nftContract.balanceOf(msg.sender, tokenId);
        require(amount <= ownerTokenAmount, "Not enough tokens");

        bool isApproved = nftContract.isApprovedForAll(msg.sender, address(this));
        require(isApproved, "Contract is not approved");

        // add new listing
        uint128 id = _idCounter;
        uint128 expireTime = uint128(block.timestamp + (durationHours * SECONDS_IN_HOUR));
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
        ++_idCounter;
    }

    function cancelListing(address contractAddress, uint256 tokenId) external {
        Listing memory listing = _listings[contractAddress][tokenId][msg.sender];
        require(listing.price > 0, "Listing does not exist");

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

    function buyToken(
        address contractAddress,
        uint256 tokenId,
        address seller
    ) external payable {
        Listing memory listing = _listings[contractAddress][tokenId][seller];
        require(listing.price > 0, "Listing does not exist");
        require(block.timestamp < listing.expireTime, "Listing is expired");
        require(msg.sender != seller, "Seller can not buy his tokens");

        IERC1155 nftContract = IERC1155(contractAddress);
        uint256 ownerTokenAmount = nftContract.balanceOf(seller, tokenId);
        require(listing.amount <= ownerTokenAmount, "Not enough tokens");

        bool isApproved = nftContract.isApprovedForAll(seller, address(this));
        require(isApproved, "Contract is not approved");

        // price check must be last because of Atlas IDE bug
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

        // clear listing
        _clearListing(contractAddress, tokenId, seller);
        // transfer tokens to buyer
        nftContract.safeTransferFrom(seller, msg.sender, tokenId, listing.amount, "");
        // transfer money to seller
        uint256 comission = msg.value * comissionPercent / 100;
        uint256 valueWithoutComission = msg.value - comission;
        payable(seller).transfer(valueWithoutComission);
    }

    function getListing(
        address contractAddress,
        uint256 tokenId,
        address seller
    ) external view returns (Listing memory) {
        return _listings[contractAddress][tokenId][seller];
    }

    function _clearListing(address contractAddress, uint256 tokenId, address seller) private {
        delete _listings[contractAddress][tokenId][seller];
    }
}

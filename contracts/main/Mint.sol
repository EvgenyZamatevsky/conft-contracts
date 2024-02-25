// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract CoNFT is ERC721Enumerable, Ownable(msg.sender) {
    event Minted(address indexed to, uint256 indexed tokenId);

    uint256 public mintPrice;

    constructor(uint256 initialMintPrice) ERC721("coNFT", "CNFT") {
        mintPrice = initialMintPrice;
    }

    function mint() external payable {
        require(msg.value >= mintPrice, "Insufficient funds");

        uint256 tokenId = totalSupply() + 1;
        _safeMint(msg.sender, tokenId);
        emit Minted(msg.sender, tokenId);
    }

    function withdraw() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
    }

    function tokenURI(uint256 tokenId) public pure override returns (string memory) {
        return string.concat("https://conft.app/minting/eth/testnet/", Strings.toString(tokenId));
    }
}

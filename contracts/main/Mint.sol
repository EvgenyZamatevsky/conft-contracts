// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract CoNFT is ERC721Enumerable, Ownable(msg.sender) {
    event Minted(address indexed to, uint256 indexed tokenId);

    constructor() ERC721("coNFT", "CNFT") {}

    function mint() external {
        uint256 tokenId = totalSupply() + 1;

        emit Minted(msg.sender, tokenId);

        _safeMint(msg.sender, tokenId);
    }

    function withdraw() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    function tokenURI(uint256 tokenId) public pure override returns (string memory) {
        return string.concat("https://conft.app/minting/eth/testnet/", Strings.toString(tokenId));
    }
}

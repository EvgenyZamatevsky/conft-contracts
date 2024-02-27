// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract CoNFT is ERC721("coNFT", "CNFT"), Ownable(msg.sender) {
    event Minted(address indexed to, uint256 indexed tokenId);

    uint256 public mintPrice;

    uint256 private _currentTokenId = 1;

    constructor(uint256 initialMintPrice) {
        mintPrice = initialMintPrice;
    }

    function mint() external payable {
        require(msg.value >= mintPrice, "Insufficient funds");

        uint256 tokenId = _currentTokenId;

        _currentTokenId++;

        emit Minted(msg.sender, tokenId);

        _safeMint(msg.sender, tokenId);
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

    function totalSupply() external view returns (uint256) {
        return _currentTokenId - 1;
    }
}

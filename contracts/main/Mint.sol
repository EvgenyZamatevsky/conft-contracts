// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

using Strings for uint256;

contract Mint is ERC721, Ownable {
    uint256 public maxSupply;
    uint256 public mintPrice;

    string private _tokenUriPrefix;
    uint256 private _currentTokenId;

    event Minted(
        address indexed to,
        uint256 indexed tokenId,
        uint256 price,
        uint256 timestamp
    );
    event MaxSupplyChanged(uint256 indexed newSupply);
    event MintPriceChanged(uint256 indexed newPrice);
    event TokenUriPrefixChanged(string indexed newPrefix);

    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        string memory tokenUriPrefix,
        uint256 initialMaxSupply,
        uint256 initialMintPrice
    ) ERC721(tokenName, tokenSymbol) Ownable(msg.sender) {
        maxSupply = initialMaxSupply;
        mintPrice = initialMintPrice;
        _tokenUriPrefix = tokenUriPrefix;
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(msg.sender).call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }

    function setMaxSupply(uint256 newMaxSupply) external onlyOwner {
        emit MaxSupplyChanged(newMaxSupply);

        maxSupply = newMaxSupply;
    }

    function setMintPrice(uint256 newPrice) external onlyOwner {
        emit MintPriceChanged(newPrice);

        mintPrice = newPrice;
    }

    function setTokenUriPrefix(string memory newPrefix) external onlyOwner {
        emit TokenUriPrefixChanged(newPrefix);

        _tokenUriPrefix = newPrefix;
    }

    function mint() external payable {
        require(_currentTokenId < maxSupply, "Max supply reached");
        require(msg.value == mintPrice, "Mismatch of funds");

        uint256 tokenId = _currentTokenId;

        unchecked {
            _currentTokenId = tokenId + 1;
        }

        emit Minted(msg.sender, tokenId, mintPrice, block.timestamp);

        _safeMint(msg.sender, tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return string.concat(_tokenUriPrefix, tokenId.toString());
    }

    function totalSupply() external view returns (uint256) {
        return _currentTokenId;
    }
}

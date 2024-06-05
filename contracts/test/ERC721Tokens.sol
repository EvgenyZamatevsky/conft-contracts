// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ERC721Tokens is ERC721("TToken", "TT") {
    uint256 private _currentTokenId;

    constructor() {
        _currentTokenId = 0;
    }

    function safeMint() public {
        uint256 tokenId = _currentTokenId;
        _safeMint(msg.sender, tokenId);
        _currentTokenId += 1;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract ERC1155Tokens is ERC1155("Mytokens") {
    uint256 private _currentTokenId;

    constructor() {
        _currentTokenId = 0;
    }

    function mint(uint256 amount) public {
        uint256 tokenId = _currentTokenId;
        _mint(msg.sender, tokenId, amount, "");
        _currentTokenId += 1;
    }
}

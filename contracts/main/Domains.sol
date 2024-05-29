// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Domains is ERC721, Ownable {
    // Domain struct that holds name and expiration timestamp
    struct Domain { string name; uint256 expiredAt; }

    string public constant TOP_LEVEL_DOMAIN = '.bob';
    // Base URI for token info. Used by tokenURI function.
    string public currentBaseURI;
    // The amount of time after expiration that the name will still belong to
    // the old owner. After that time, another account can lease it.
    uint256 public safePeriodDays = 60;

    uint256 private constant SECONDS_IN_DAY = 24 * 60 * 60;
    uint256 private constant SECONDS_IN_YEAR = SECONDS_IN_DAY * 365;

    // Token id counter. Starts with 1, since 0 is interpreted as absence.
    uint256 private _currentTokenId = 1;
    // Absolute prices for the length of the name till 5 chars. So a price for
    // a name with one char is at index 0, a name with two chars is at index 1
    // and so on.
    uint256[5] private _pricesPerNameLength = [
        0.08 ether,
        0.0321 ether,
        0.0161 ether,
        0.0064 ether,
        0.0013 ether
    ];
    // Percents of discounts per each year till 5. So discount for 1 year
    // is at index 0, for 2 years at index 1 and so on.
    uint256[5] private _discountsPerYear = [0, 10, 15, 20, 25];

    // Instantly map a name to a tokenId
    mapping(string => uint256) private _domainNameToTokenId;
    // Instantly map a tokenId to a domain
    mapping(uint256 => Domain) private _tokenIdToDomain;
    // Instantly find a primary token id of the owner
    mapping(address => uint256) private _primaryTokenId;
    // Instantly find a price for specific name
    mapping(string => uint256) private _customPrices;

    event Withdrawal();
    event BaseURIChanged(string newBaseURI);
    event SafePeriodChanged(uint256 newSafePeriodDays);
    event PricePerNameLengthChanged(uint256 length, uint256 price);
    event DiscountPerYearChanged(uint256 yearAmount, uint256 discount);
    event CustomPriceChanged(string domainName, uint256 price);
    event PrimaryNameChanged(
        address indexed owner,
        uint256 indexed tokenId,
        string domainName,
        bool isPrimary
    );
    event Leased(
        address indexed to,
        uint256 indexed tokenId,
        string domainName,
        bool isPrimary,
        uint256 expiredAt,
        uint256 price,
        uint256 timestamp
    );

    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        string memory baseURI
    ) ERC721(tokenName, tokenSymbol) Ownable(msg.sender) {
        currentBaseURI = baseURI;
    }

    // Owner's functions. Contract variables adjustement

    function withdraw() external onlyOwner {
        emit Withdrawal();
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        emit BaseURIChanged(newBaseURI);
        currentBaseURI = newBaseURI;
    }

    function setSafePeriod(uint256 newSafePeriodDays) external onlyOwner {
        emit SafePeriodChanged(newSafePeriodDays);
        safePeriodDays = newSafePeriodDays;
    }

    function setPricePerNameLength(uint256 length, uint256 price) external onlyOwner {
        require(length > 0, "Length must be > 0");
        require(length < 6, "Length must be < 6");
        require(price > 0, "Price must be > 0");

        emit PricePerNameLengthChanged(length, price);
        _pricesPerNameLength[length - 1] = price;
    }

    function setDiscountPerYear(uint256 yearAmount, uint256 percent) external onlyOwner {
        require(yearAmount > 0, "Year number must be > 0");
        require(yearAmount < 6, "Year number must be < 6");
        require(percent <= 100, "Percent must be <= 100");

        emit DiscountPerYearChanged(yearAmount, percent);
        _discountsPerYear[yearAmount - 1] = percent;
    }

    function setCustomPrice(string calldata domainName, uint256 price) external onlyOwner {
        require(bytes(domainName).length > 0, "Name can not be blank");
        require(price > 0, "Price must be > 0");

        emit CustomPriceChanged(domainName, price);
        _customPrices[domainName] = price;
    }

    // Client's functions

    // Set primary tokenId for account
    function setPrimary(string calldata domainName, bool isPrimary) external {
        uint256 tokenId = _domainNameToTokenId[domainName];
        require(tokenId > 0, "The name does not exist");
        require(ownerOf(tokenId) == msg.sender, "The caller does not own the name");

        emit PrimaryNameChanged(msg.sender, tokenId, domainName, isPrimary);
        if (isPrimary) {
            _primaryTokenId[msg.sender] = tokenId;
        } else {
            uint256 currentPrimaryTokenId = _primaryTokenId[msg.sender];
            if (currentPrimaryTokenId == tokenId) {
                delete _primaryTokenId[msg.sender];
            }
        }
    }

    // Lease a name
    function lease(
        string calldata domainName,
        uint256 yearAmount,
        bool isPrimary
    ) external payable returns(uint256) {
        require(bytes(domainName).length > 0, "Name can not be blank");
        require(yearAmount > 0, "Lease time can not be zero");
        require(_strvalid(domainName), "Name has forbidden characters");
        require(msg.value == calcNamePrice(domainName, yearAmount), "Mismatch of funds");

        uint256 tokenId = _domainNameToTokenId[domainName];
        uint256 expiredAt = uint256(block.timestamp + yearAmount * SECONDS_IN_YEAR);
        if (tokenId == 0) {
            return _createNewName(domainName, expiredAt, isPrimary);
        }

        emit Leased(
            msg.sender,
            tokenId,
            domainName,
            isPrimary,
            expiredAt,
            msg.value,
            block.timestamp
        );

        if (isPrimary) {
            _primaryTokenId[msg.sender] = tokenId;
        }
        Domain storage domain = _tokenIdToDomain[tokenId];
        address currentOwner = ownerOf(tokenId);
        if (currentOwner == msg.sender) {
            domain.expiredAt = expiredAt;
        } else {
            uint256 releasedAt = _calcReleaseTime(domain.expiredAt);
            if (releasedAt > block.timestamp) {
                revert("The name is still in use");
            }
            domain.expiredAt = expiredAt;
            _transfer(currentOwner, msg.sender, tokenId);
        }
        return tokenId;
    }

    // View functions

    // Get a full name for a token id
    function tokenIdToFullName(uint256 tokenId) public view returns(string memory) {
        Domain memory domain = _tokenIdToDomain[tokenId];
        if (bytes(domain.name).length > 0) {
            return string.concat(domain.name, TOP_LEVEL_DOMAIN);
        }

        return "";
    }

    // Get address for a domain name
    function nameToAdress(string calldata domainName) public view returns(address) {
        uint256 tokenId = _domainNameToTokenId[domainName];
        Domain memory domain = _tokenIdToDomain[tokenId];
        if (domain.expiredAt < block.timestamp) {
            return address(0); 
        }

        return ownerOf(tokenId);
    }

    // Get address for a full domain name
    function fullNameToAddress(string calldata fullDomainName) public view returns(address) {
        uint256 length = bytes(fullDomainName).length;
        require(length > 4, "Name is too short");

        string calldata suffix = fullDomainName[length - 4:length];
        require(
            keccak256(bytes(TOP_LEVEL_DOMAIN)) == keccak256(bytes(suffix)),
            "Incorrect name"
        );

        string calldata domainName = fullDomainName[0:length - 4];
        return nameToAdress(domainName);
    }

    // Get a domain name for an address. Only primary name used.
    // If account does not have primary address, it returns empty string
    // indicating absence of the name
    function addressToName(address account) public view returns(string memory) {
        uint256 tokenId = _primaryTokenId[account];
        Domain memory domain = _tokenIdToDomain[tokenId];
        if (domain.expiredAt > block.timestamp && ownerOf(tokenId) == account) {
            return domain.name;
        }

        return "";
    }

    // Get a domain name with top level suffix for an address. Only primary name used.
    // If account does not have primary address, it returns empty string
    // indicating absence of the name
    function addressToFullName(address account) public view returns(string memory) {
        string memory domainName = addressToName(account);
        if (bytes(domainName).length > 0) {
            return string.concat(domainName, TOP_LEVEL_DOMAIN);
        }

        return "";
    }

    // Get timestamp when the name becomes expired. After that time the name
    // still CAN NOT be leased by other accounts
    function getExpirationTime(string calldata domainName) public view returns(uint256) {
        uint256 tokenId = _domainNameToTokenId[domainName];
        Domain memory domain = _tokenIdToDomain[tokenId];
        return domain.expiredAt;
    }

    // Get timestamp when the name becomes vacant. After that time the name
    // can be leased by other accounts
    function getReleaseTime(string calldata domainName) public view returns(uint256) {
        uint256 tokenId = _domainNameToTokenId[domainName];
        if (tokenId == 0) {
            return 0;
        }

        Domain memory domain = _tokenIdToDomain[tokenId];
        return _calcReleaseTime(domain.expiredAt);
    }

    // Get current price for amount of name's characters
    function getPricePerNameLength(uint256 length) public view returns(uint256) {
        require(length > 0, "Length must be > 0");

        uint256 clampedLength = length > 5 ? 5 : length;
        return _pricesPerNameLength[clampedLength - 1];
    }

    // Get current percent discount for amount of years leased
    function getDiscountPerYear(uint256 yearAmount) public view returns(uint256) {
        require(yearAmount > 0, "Year number must be > 0");

        uint256 clampedYearsNum = yearAmount > 5 ? 5 : yearAmount;
        return _discountsPerYear[clampedYearsNum - 1];
    }

    // Get custom price for a name
    function getCustomPrice(string calldata domainName) public view returns(uint256) {
        return _customPrices[domainName];
    }

    // Precalculate full price for name
    function calcNamePrice(
        string calldata domainName,
        uint256 yearAmount
    ) public view returns(uint256) {
        // set custom price by default
        uint256 basePrice = _customPrices[domainName];
        // recalculate price for name length if there is no custom price
        if (basePrice == 0) {
            uint256 domainNameLength = _strlen(domainName);
            basePrice = getPricePerNameLength(domainNameLength);
        }
        uint256 discountPerYear = getDiscountPerYear(yearAmount);

        return basePrice * yearAmount * (100 - discountPerYear) / 100;
    }

    // Check if name can be leased
    function isVacant(string calldata domainName) public view returns(bool) {
        require(bytes(domainName).length > 0, "Name can not be blank");

        uint256 tokenId = _domainNameToTokenId[domainName];
        if (tokenId == 0) {
            return true;
        }

        Domain memory domain = _tokenIdToDomain[tokenId];
        return _calcReleaseTime(domain.expiredAt) < block.timestamp;
    }

    // Check total amount of tokens
    function totalSupply() external view returns(uint256) {
        return _currentTokenId - 1;
    }

    // internal and private

    function _createNewName(
        string calldata domainName,
        uint256 expiredAt,
        bool isPrimary
    ) private returns(uint256) {
        uint256 tokenId = _currentTokenId;
        _currentTokenId = tokenId + 1;
        if (isPrimary) {
            _primaryTokenId[msg.sender] = tokenId;
        }
        _domainNameToTokenId[domainName] = tokenId;
        _tokenIdToDomain[tokenId] = Domain({name: domainName, expiredAt: expiredAt});
        emit Leased(
            msg.sender,
            tokenId,
            domainName,
            isPrimary,
            expiredAt,
            msg.value,
            block.timestamp
        );
        _mint(msg.sender, tokenId);
        return tokenId;
    }

    function _calcReleaseTime(uint256 expiredAt) private view returns(uint256) {
        return expiredAt + safePeriodDays * SECONDS_IN_DAY;
    }

    function _baseURI() internal view override returns(string memory) {
        return currentBaseURI;
    }

    // Forbid first 32 bytes of UTF8/ASCII char list including whitespace (0x20)
    function _strvalid(string calldata s) private pure returns(bool) {
        bytes memory b = bytes(s);
        uint256 i = 0;

        while (i < b.length) {
            bytes1 char = b[i];

            // Pass if the char is between '0' and '9'
            if (char >= 0x30 && char <= 0x39) {
                i++;
                continue;
            }

            // Pass if the char is between 'a' and 'z'
            if (char >= 0x61 && char <= 0x7A) {
                i++;
                continue;
            }

            // Pass if it is a valid 4-bytes utf8 F0-9F-x-x sequence
            if (char == 0xf0 && i + 3 < b.length) {
                bytes1 secondByte = b[i + 1];
                bytes1 thirdByte = b[i + 2];
                bytes1 fourthByte = b[i + 3];

                if (
                    secondByte == 0x9f &&
                    thirdByte >= 0x80 && thirdByte <= 0xbf &&
                    fourthByte >= 0x80 && fourthByte <= 0xbf
                ) {
                    i += 4;
                    continue;
                }
            }

            return false;
        }

        return true;
    }

    // Using ENS function that helps to calculate length of a string
    // with multibyte characters
    function _strlen(string calldata s) private pure returns(uint256) {
        uint256 len;
        uint256 i = 0;
        uint256 bytelength = bytes(s).length;

        for (len = 0; i < bytelength; len++) {
            bytes1 b = bytes(s)[i];
            if (b < 0x80) {
                i += 1;
            } else if (b < 0xE0) {
                i += 2;
            } else if (b < 0xF0) {
                i += 3;
            } else if (b < 0xF8) {
                i += 4;
            } else if (b < 0xFC) {
                i += 5;
            } else {
                i += 6;
            }
        }
        return len;
    }
}

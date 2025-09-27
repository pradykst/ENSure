// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IENSRegistry} from "./interfaces/IENSRegistry.sol";
import {IAddrResolver} from "./interfaces/IAddrResolver.sol";
import {Namehash} from "./utils/Namehash.sol";

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title EventEscrow
/// @notice One contract per event. Organizer funds it; finalize by ENS names -> payouts + winner badge NFTs.
contract EventEscrow is ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;

    IENSRegistry public immutable ensRegistry;
    address public immutable organizer;
    string  public eventLabel;

    uint256 private _nextTokenId = 1;
    mapping(uint256 => string) private _badgeLabel; // tokenId -> "hackathon_name_winner_1"

    event Funded(address indexed from, uint256 amount);
    event WinnerPaid(string ensName, address indexed to, uint256 amount, uint256 tokenId, string badgeLabel);

    modifier onlyOrganizer() {
        require(msg.sender == organizer, "not organizer");
        _;
    }

    constructor(address _organizer, string memory _eventLabel, address _ensRegistry)
        ERC721("EventBadge", "EVB")
        Ownable(_organizer) // OZ v5 constructor
        payable
    {
        organizer = _organizer;
        eventLabel = _eventLabel;
        ensRegistry = IENSRegistry(_ensRegistry);
        if (msg.value > 0) emit Funded(_organizer, msg.value);
    }

    receive() external payable { emit Funded(msg.sender, msg.value); }

    function fund() external payable onlyOrganizer {
        require(msg.value > 0, "no value");
        emit Funded(msg.sender, msg.value);
    }

    /// @notice ENS name -> address via registry & resolver
    function resolveENS(string memory name) public view returns (address) {
        bytes32 node = Namehash.namehash(name);
        address resolverAddr = ensRegistry.resolver(node);
        require(resolverAddr != address(0), "ENS: no resolver");
        address resolved = IAddrResolver(resolverAddr).addr(node);
        require(resolved != address(0), "ENS: no addr");
        return resolved;
    }

    /// @notice Pay winners by ENS + mint badge NFTs
    function finalize(
        string[] calldata winnerENS,
        uint256[] calldata amounts,
        string[] calldata badgeLabels,
        bool strictExact // if true, total must equal balance; else total <= balance
    ) external onlyOrganizer nonReentrant {
        require(
            winnerENS.length == amounts.length && amounts.length == badgeLabels.length,
            "length mismatch"
        );

        uint256 total;
        for (uint256 i = 0; i < amounts.length; i++) total += amounts[i];

        if (strictExact) require(total == address(this).balance, "sum != balance");
        else require(total <= address(this).balance, "sum > balance");

        for (uint256 i = 0; i < winnerENS.length; i++) {
            address to = resolveENS(winnerENS[i]);

            (bool ok, ) = to.call{value: amounts[i]}("");
            require(ok, "transfer failed");

            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
            _badgeLabel[tokenId] = badgeLabels[i];

            emit WinnerPaid(winnerENS[i], to, amounts[i], tokenId, badgeLabels[i]);
        }
    }

    function withdrawRemainder() external onlyOrganizer nonReentrant {
        uint256 bal = address(this).balance;
        require(bal > 0, "no balance");
        (bool ok, ) = organizer.call{value: bal}("");
        require(ok, "withdraw failed");
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        string memory label = _badgeLabel[tokenId];
        string memory name_ = string.concat(eventLabel, " - ", label);
        string memory json = string.concat(
            '{"name":"', name_,
            '","description":"Winner badge for ', eventLabel,
            '","image":"data:image/svg+xml;utf8,',
            '<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%27400%27 height=%27400%27>',
            '<rect width=%27400%27 height=%27400%27 fill=%27#f2f2f2%27/>',
            '<text x=%2750%27 y=%27180%27 font-size=%2720%27>Winner</text>',
            '<text x=%2750%27 y=%27220%27 font-size=%2716%27>', name_, '</text>',
            '</svg>"}'
        );
        return string.concat("data:application/json;utf8,", json);
    }
}

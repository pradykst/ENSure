// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IdentityEvents} from "../common/Events.sol";
import {IIdentityAttestations} from "../interfaces/IIdentityAttestations.sol";

contract IdentityAttestations is IIdentityAttestations {
    mapping(address => mapping(bytes32 => bool)) private _verified;
    address public owner;
    address public selfAdapterOnCelo; // trusted sender for bridge messages

    constructor(address _trusted) {
        owner = msg.sender;
        selfAdapterOnCelo = _trusted;
        emit IdentityEvents.OwnerSet(msg.sender);
        emit IdentityEvents.BridgeSet(_trusted);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "OWN");
        _;
    }

    function setOwner(address o) external onlyOwner {
        owner = o;
        emit IdentityEvents.OwnerSet(o);
    }

    function setTrustedSender(address a) external onlyOwner {
        selfAdapterOnCelo = a;
        emit IdentityEvents.BridgeSet(a);
    }

    // Bridge entrypoint (if using a bridge/adapter)
    function receiveAttestation(address user, bytes32 scope, bool ok) external {
        require(msg.sender == selfAdapterOnCelo, "NOT_TRUSTED");
        _verified[user][scope] = ok;
        emit IdentityEvents.Verified(user, scope, ok);
    }

    // Dev/manual switch for testing; REMOVE or lock before mainnet
    function setVerified(address user, bytes32 scope, bool ok) external onlyOwner {
        _verified[user][scope] = ok;
        emit IdentityEvents.Verified(user, scope, ok);
    }

    function isVerified(address user, bytes32 scope) external view returns (bool) {
        return _verified[user][scope];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IAttestationSink} from "../interfaces/IAttestationSink.sol";

/**
 * Thin adapter that would verify a Self proof on Celo and then relay
 * the attestation to Rootstock's IdentityAttestations via your bridge.
 *
 * For hackathon: this shows the shape; you can replace the direct call
 * with a bridge send (LayerZero, etc.) and handle receive on Rootstock.
 */
contract SelfVerifierAdapter {
    address public owner;
    address public sinkOnRootstock; // IdentityAttestations on Rootstock

    event OwnerSet(address indexed owner);
    event SinkSet(address indexed sink);

    constructor(address sink) {
        owner = msg.sender;
        sinkOnRootstock = sink;
        emit OwnerSet(owner);
        emit SinkSet(sink);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "OWN");
        _;
    }

    function setOwner(address o) external onlyOwner {
        owner = o;
        emit OwnerSet(o);
    }

    function setSink(address sink) external onlyOwner {
        sinkOnRootstock = sink;
        emit SinkSet(sink);
    }

    // In production: call Self Hub V2 to verify zk proof before relaying.
    function verifyAndBridge(bytes calldata /*zkProof*/, bytes32 scope, address user) external payable {
        // require(_verifyWithSelf(zkProof, user, scope), "SELF_FAIL");
        IAttestationSink(sinkOnRootstock).receiveAttestation(user, scope, true);
    }
}

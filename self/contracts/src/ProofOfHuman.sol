// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import {SelfStructs} from "@selfxyz/contracts/contracts/libraries/SelfStructs.sol";
import {SelfUtils} from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";
import {IIdentityVerificationHubV2} from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol";

contract ProofOfHuman is SelfVerificationRoot {
    // minimal state we actually need
    mapping(address => bool) public isVerified;
    event Verified(address indexed user, bytes32 nullifier);
    event SelfVerified(address indexed user);

    // (keep these if you still want debug info)
    bool public verificationSuccessful;
    ISelfVerificationRoot.GenericDiscloseOutputV2 public lastOutput;
    bytes public lastUserData;
    SelfStructs.VerificationConfigV2 public verificationConfig;
    bytes32 public verificationConfigId;
    address public lastUserAddress;

    constructor(
        address hub,
        string memory scope,
        SelfUtils.UnformattedVerificationConfigV2 memory _cfg
    ) SelfVerificationRoot(hub, scope) {
        verificationConfig = SelfUtils.formatVerificationConfigV2(_cfg);
        verificationConfigId = IIdentityVerificationHubV2(hub)
            .setVerificationConfigV2(verificationConfig);
    }

    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal override {
        // optional debug tracking
        verificationSuccessful = true;
        lastOutput = output;
        lastUserData = userData;
        lastUserAddress = address(uint160(output.userIdentifier));

        // ✅ bind to wallet & mark verified
        address user = address(uint160(output.userIdentifier));
        require(!isVerified[user], "AlreadyVerified");
        isVerified[user] = true;
        emit Verified(user, output.nullifier);
        emit SelfVerified(user);
    }

    function setConfigId(bytes32 configId) external {
        verificationConfigId = configId;
    }

    function getConfigId(
        bytes32,
        bytes32,
        bytes memory
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }
}

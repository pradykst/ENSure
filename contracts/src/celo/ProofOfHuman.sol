// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { SelfVerificationRoot } from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import { ISelfVerificationRoot } from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import { SelfStructs } from "@selfxyz/contracts/contracts/libraries/SelfStructs.sol";
import { SelfUtils } from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";
import { IIdentityVerificationHubV2 } from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol";

/**
 * @title ProofOfHuman
 * @notice ENSure implementation of SelfVerificationRoot for Proof of Human verification
 * @dev Verifies users via Self Protocol ZK identity proofs (supports Aadhaar)
 */
contract ProofOfHuman is SelfVerificationRoot {
    // Verification result storage
    mapping(address => bool) private _verified;
    
    // Verification config storage
    SelfStructs.VerificationConfigV2 public verificationConfig;
    bytes32 public verificationConfigId;

    // Events
    event VerificationCompleted(address indexed user, bool status);

    /**
     * @notice Constructor
     * @param identityVerificationHubV2Address The address of the Identity Verification Hub V2
     * @param scopeSeed The scope seed that is used to create the scope of the contract
     * @param _verificationConfig The verification configuration
     */
    constructor(
        address identityVerificationHubV2Address,
        string memory scopeSeed, 
        SelfUtils.UnformattedVerificationConfigV2 memory _verificationConfig
    )
        SelfVerificationRoot(identityVerificationHubV2Address, scopeSeed)
    {
        verificationConfig = SelfUtils.formatVerificationConfigV2(_verificationConfig);
        verificationConfigId =
            IIdentityVerificationHubV2(identityVerificationHubV2Address).setVerificationConfigV2(verificationConfig);
    }

    /**
     * @notice Check if a user is verified
     * @param user The user address to check
     * @return True if the user is verified
     */
    function isVerified(address user) external view returns (bool) {
        return _verified[user];
    }

    /**
     * @notice Implementation of customVerificationHook from SelfVerificationRoot
     * @param output The verification output from the hub
     * @param userData The user data passed through verification
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    )
        internal
        override
    {
        address user = address(uint160(output.userIdentifier));
        _verified[user] = true;
        emit VerificationCompleted(user, true);
    }

    /**
     * @notice Implementation of getConfigId from SelfVerificationRoot
     * @return The verification configuration ID
     */
    function getConfigId(
        bytes32, /* destinationChainId */
        bytes32, /* userIdentifier */
        bytes memory /* userDefinedData */
    )
        public
        view
        override
        returns (bytes32)
    {
        return verificationConfigId;
    }
}

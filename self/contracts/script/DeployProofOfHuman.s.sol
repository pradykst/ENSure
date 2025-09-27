// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ProofOfHuman} from "../src/ProofOfHuman.sol";
import {BaseScript} from "./Base.s.sol";
import {console} from "forge-std/console.sol";
import {SelfUtils} from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";

/// @title DeployProofOfHuman
/// @notice Deployment script for ProofOfHuman contract using standard deployment
contract DeployProofOfHuman is BaseScript {
    // Custom errors for deployment verification
    error DeploymentFailed();

    /// @notice Main deployment function using standard deployment
    /// @return proofOfHuman The deployed ProofOfHuman contract instance
    /// @dev Requires the following environment variables:
    ///      - IDENTITY_VERIFICATION_HUB_ADDRESS: Address of the Self Protocol verification hub
    ///      - SCOPE_SEED: Scope seed value (defaults to "mydapp-scope")

    function run() public broadcast returns (ProofOfHuman proofOfHuman) {
        address hubAddress = vm.envAddress("IDENTITY_VERIFICATION_HUB_ADDRESS");
        string memory scopeSeed = vm.envString("SCOPE_SEED");

        // ⬇️ zero-length array => no country filters
        string[] memory forbiddenCountries = new string[](0);

        SelfUtils.UnformattedVerificationConfigV2 memory cfg = SelfUtils
            .UnformattedVerificationConfigV2({
                olderThan: 18,
                forbiddenCountries: forbiddenCountries,
                ofacEnabled: false
            });

        proofOfHuman = new ProofOfHuman(hubAddress, scopeSeed, cfg);

        // Log deployment information
        console.log("ProofOfHuman deployed to:", address(proofOfHuman));
        console.log("Identity Verification Hub:", hubAddress);
        console.log("Scope Value:", proofOfHuman.scope());

        // Verify deployment was successful
        if (address(proofOfHuman) == address(0)) revert DeploymentFailed();

        console.log("Deployment verification completed successfully!");
        console.log(
            "Scope automatically generated from SCOPE_SEED:",
            scopeSeed
        );
    }
}

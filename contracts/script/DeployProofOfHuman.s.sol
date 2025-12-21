// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ProofOfHuman} from "../src/celo/ProofOfHuman.sol";
import {SelfUtils} from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";
import {SelfStructs} from "@selfxyz/contracts/contracts/libraries/SelfStructs.sol";

/**
 * @title DeployProofOfHuman
 * @notice Deploys the ProofOfHuman contract on Celo Sepolia
 * @dev Run with: forge script script/DeployProofOfHuman.s.sol --rpc-url $CELO_SEPOLIA_RPC --broadcast --private-key $PRIVATE_KEY
 */
contract DeployProofOfHuman is Script {
    // Celo Testnet IdentityVerificationHub V2 (mock passports)
    address constant HUB_V2 = 0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74;
    
    // Our unique scope seed - MUST be less than 31 chars
    string constant SCOPE_SEED = "ENSure-Verify";

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        // Empty forbidden countries array
        string[] memory forbiddenCountries = new string[](0);

        // Build verification config - minimal for Aadhaar/passport verification
        SelfUtils.UnformattedVerificationConfigV2 memory config = SelfUtils.UnformattedVerificationConfigV2({
            olderThan: 18, // Minimum age 18
            forbiddenCountries: forbiddenCountries,
            ofacEnabled: false
        });

        // Deploy ProofOfHuman contract
        ProofOfHuman proofOfHuman = new ProofOfHuman(
            HUB_V2,
            SCOPE_SEED,
            config
        );

        vm.stopBroadcast();

        console.log("=================================");
        console.log("ProofOfHuman deployed to:", address(proofOfHuman));
        console.log("Scope seed:", SCOPE_SEED);
        console.log("Hub V2:", HUB_V2);
        console.log("=================================");
        console.log("");
        console.log("Update your frontend .env.local:");
        console.log("NEXT_PUBLIC_SELF_ENDPOINT=%s", address(proofOfHuman));
        console.log("NEXT_PUBLIC_SELF_SCOPE=%s", SCOPE_SEED);
    }
}

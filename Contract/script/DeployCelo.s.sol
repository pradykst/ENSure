// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import {SelfVerifierAdapter} from "../src/celo/SelfVerifierAdapter.sol";
import {IdentityAttestations} from "../src/rootstock/IdentityAttestations.sol";

contract DeployCelo is Script {
   
    address constant SINK_ON_ROOTSTOCK = 0x0000000000000000000000000000000000000000;

    function run() external {
        vm.startBroadcast();

        SelfVerifierAdapter adapter = new SelfVerifierAdapter(SINK_ON_ROOTSTOCK);

        vm.stopBroadcast();

        console2.log("SelfVerifierAdapter:", address(adapter));
    }
}
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import {IdentityAttestations} from "../src/rootstock/IdentityAttestations.sol";
import {PrizeEscrow} from "../src/rootstock/PrizeEscrow.sol";

contract DeployRootstock is Script {
    function run() external {
        vm.startBroadcast();

        
        IdentityAttestations attest = new IdentityAttestations(address(0));

       
        PrizeEscrow escrow = new PrizeEscrow(address(attest));

        vm.stopBroadcast();

        console2.log("IdentityAttestations:", address(attest));
        console2.log("PrizeEscrow:", address(escrow));
    }
}

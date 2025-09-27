// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;


import "forge-std/Script.sol";
import {IdentityAttestations} from "../src/rootstock/IdentityAttestations.sol";
import {PrizeEscrow} from "../src/rootstock/PrizeEscrow.sol";


contract DeployRootstock is Script {
function run() external {
// pick up PRIVATE_KEY_RSK from .env automatically
uint256 pk = vm.envUint("PRIVATE_KEY_RSK");
vm.startBroadcast(pk);


// deploy IdentityAttestations (constructor may take a trusted sender; use address(0) for now)
IdentityAttestations attest = new IdentityAttestations(address(0));


// deploy PrizeEscrow with the attestations contract address
PrizeEscrow escrow = new PrizeEscrow(address(attest));


vm.stopBroadcast();


console2.log("Rootstock testnet deploys:");
console2.log("- IdentityAttestations:", address(attest));
console2.log("- PrizeEscrow:", address(escrow));
}
}
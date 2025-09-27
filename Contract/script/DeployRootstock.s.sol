// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import {PrizeEscrow} from "../src/rootstock/PrizeEscrow.sol";

contract DeployRootstock is Script {
    function run() external {
        // Option A: use env var
        uint256 pk = vm.envUint("PRIVATE_KEY_RSK");
        vm.startBroadcast(pk);

        // If you prefer CLI key, comment the two lines above and use:
        // vm.startBroadcast();

        PrizeEscrow escrow = new PrizeEscrow();
        vm.stopBroadcast();
        console2.log("PrizeEscrow:", address(escrow));
    }
}

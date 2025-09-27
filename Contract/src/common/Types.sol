// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

library Types {
    struct CreateParams {
        address token;            // address(0) = native RBTC, else ERC20 token
        uint96  depositAmount;    // prize to lock now
        uint64  registerDeadline; // signups close
        uint64  finalizeDeadline; // last moment to finalize payouts
        address[] judges;         // optional initial judges
        uint8   judgeThreshold;   // optional quorum (<= judges.length)
        bytes32 scope;            // verification scope (saved now, used later)
    }
}

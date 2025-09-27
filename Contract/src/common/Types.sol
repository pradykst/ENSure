// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

library Types {
    struct CreateParams {
        address token;            // address(0) = native RBTC, else ERC20
        uint96  depositAmount;    // initial prize to lock
        uint64  registerDeadline; // signups close
        uint64  finalizeDeadline; // last moment to finalize payouts
        address[] judges;         // optional initial judges
        uint8   judgeThreshold;   // optional quorum (<= judges.length)
        bytes32 scope;            // verification scope (used at register)
    }

    // NEW: used by finalize()
    struct Winner {
        address payable to;
        uint96 amount;
    }
}

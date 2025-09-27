// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

library EscrowEvents {
    event EventCreated(
        uint256 indexed eventId,
        address indexed organizer,
        address token,
        uint96 depositAmount,
        uint64 registerDeadline,
        uint64 finalizeDeadline,
        bytes32 scope
    );

    event ToppedUp(uint256 indexed eventId, uint96 amount);

    // NEW
    event Registered(uint256 indexed eventId, address indexed user);
    event Finalized(uint256 indexed eventId, address[] winners, uint96[] amounts);

    event JudgesAdded(uint256 indexed eventId, address[] judges);
    event JudgesRemoved(uint256 indexed eventId, address[] judges);
    event JudgeThresholdSet(uint256 indexed eventId, uint8 newThreshold);
    event Canceled(uint256 indexed eventId, uint96 refunded);
}

library IdentityEvents {
    event Verified(address indexed user, bytes32 indexed scope, bool status);
    event BridgeSet(address indexed srcAdapter);
    event OwnerSet(address indexed owner);
}

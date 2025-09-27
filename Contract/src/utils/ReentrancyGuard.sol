// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

abstract contract ReentrancyGuard {
    uint256 private _locked;
    modifier nonReentrant() {
        require(_locked == 0, "REENTRANCY");
        _locked = 1;
        _;
        _locked = 0;
    }
}

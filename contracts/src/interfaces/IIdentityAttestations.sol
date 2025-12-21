// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IIdentityAttestations {
    function isVerified(address user, bytes32 scope) external view returns (bool);
}

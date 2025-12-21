// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// Minimal interface exposed by the Rootstock sink to receive cross-chain attestations.
interface IAttestationSink {
    function receiveAttestation(address user, bytes32 scope, bool ok) external;
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

library Errors {
    error NotOrganizer();
    error EventNotFound();
    error AlreadyFinalized();
    error AlreadyCanceled();
    error RegistrationClosed();
    error FinalizationClosed();
    error InvalidParams();
    error TooManyJudges();
    error TooEarly();
    error TransferFailed();
    error Reentrancy();
}

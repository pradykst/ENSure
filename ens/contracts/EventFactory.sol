// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EventEscrow} from "./EventEscrow.sol";

contract EventFactory {
    address public immutable ensRegistry;
    mapping(bytes32 => address) public eventById; // keccak256(label) -> deployed event

    event EventCreated(string label, address eventContract, address organizer, uint256 funded);

    constructor(address _ensRegistry) {
        ensRegistry = _ensRegistry;
    }

    function createEvent(string calldata label) external payable returns (address) {
        bytes32 id = keccak256(bytes(label));
        require(eventById[id] == address(0), "label taken");
        EventEscrow evc = new EventEscrow{value: msg.value}(msg.sender, label, ensRegistry);
        eventById[id] = address(evc);
        emit EventCreated(label, address(evc), msg.sender, msg.value);
        return address(evc);
    }

    function getEvent(string calldata label) external view returns (address) {
        return eventById[keccak256(bytes(label))];
    }
}

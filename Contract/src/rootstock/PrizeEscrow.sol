// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Types} from "../common/Types.sol";
import {Errors} from "../common/Errors.sol"; 
import {EscrowEvents} from "../common/Events.sol";
import {IIdentityAttestations} from "../interfaces/IIdentityAttestations.sol";
import {IERC20} from "../interfaces/IERC20.sol";
import {SafeERC20} from "../libs/SafeERC20.sol";
import {ReentrancyGuard} from "../utils/ReentrancyGuard.sol";


contract PrizeEscrow is ReentrancyGuard {
    using SafeERC20 for address;

    uint256 public constant MAX_JUDGES = 64;

    struct EventData {
        address organizer;
        address token;  // address(0) = RBTC
        uint96  prizeRemaining;
        uint64  registerDeadline;
        uint64  finalizeDeadline;
        bytes32 scope;
        bool    finalized; // future stage
        bool    canceled;

        // judges
        mapping(address => bool) isJudge;
        uint16  judgeCount;
        uint8   judgeThreshold;
    }

    uint256 public nextId;
    mapping(uint256 => EventData) private _events;

    // Optional: wire later when we gate registration (next milestone)
    IIdentityAttestations public attestations;

    constructor(address attestations_) {
        attestations = IIdentityAttestations(attestations_);
    }

    // -------- Modifiers --------
    modifier exists(uint256 id) {
        if (_events[id].organizer == address(0)) revert Errors.EventNotFound();
        _;
    }
    modifier onlyOrganizer(uint256 id) {
        if (msg.sender != _events[id].organizer) revert Errors.NotOrganizer();
        _;
    }
    modifier open(uint256 id) {
        EventData storage e = _events[id];
        if (e.finalized) revert Errors.AlreadyFinalized();
        if (e.canceled) revert Errors.AlreadyCanceled();
        _;
    }

    // -------- Views --------
    function getEvent(uint256 id)
        external
        view
        exists(id)
        returns (
            address organizer,
            address token,
            uint96  prizeRemaining,
            uint64  registerDeadline,
            uint64  finalizeDeadline,
            bytes32 scope,
            bool    finalized,
            bool    canceled,
            uint16  judgeCount,
            uint8   judgeThreshold
        )
    {
        EventData storage e = _events[id];
        organizer         = e.organizer;
        token             = e.token;
        prizeRemaining    = e.prizeRemaining;
        registerDeadline  = e.registerDeadline;
        finalizeDeadline  = e.finalizeDeadline;
        scope             = e.scope;
        finalized         = e.finalized;
        canceled          = e.canceled;
        judgeCount        = e.judgeCount;
        judgeThreshold    = e.judgeThreshold;
    }

    function isJudge(uint256 id, address user) external view exists(id) returns (bool) {
        return _events[id].isJudge[user];
    }

    function getPrizeRemaining(uint256 id) external view exists(id) returns (uint96) {
        return _events[id].prizeRemaining;
    }

    function getJudgeThreshold(uint256 id) external view exists(id) returns (uint8) {
        return _events[id].judgeThreshold;
    }

    // -------- Create --------
    function createEvent(Types.CreateParams calldata p) external payable returns (uint256 id) {
        if (p.depositAmount == 0) revert Errors.InvalidParams();
        if (p.finalizeDeadline <= p.registerDeadline) revert Errors.InvalidParams();
        if (p.registerDeadline <= block.timestamp) revert Errors.InvalidParams();
        if (p.finalizeDeadline <= block.timestamp) revert Errors.InvalidParams();
        if (p.judges.length > MAX_JUDGES) revert Errors.TooManyJudges();
        if (p.judgeThreshold > p.judges.length) revert Errors.InvalidParams();

        _collect(p.token, p.depositAmount);

        id = ++nextId;
        EventData storage e = _events[id];
        e.organizer        = msg.sender;
        e.token            = p.token;
        e.prizeRemaining   = p.depositAmount;
        e.registerDeadline = p.registerDeadline;
        e.finalizeDeadline = p.finalizeDeadline;
        e.scope            = p.scope;

        // Initial judges
        for (uint256 i = 0; i < p.judges.length; i++) {
            address j = p.judges[i];
            if (j == address(0)) revert Errors.InvalidParams();
            if (!e.isJudge[j]) {
                e.isJudge[j] = true;
                e.judgeCount += 1;
            }
        }
        e.judgeThreshold = uint8(p.judgeThreshold);

        emit EscrowEvents.EventCreated(id, e.organizer, e.token, e.prizeRemaining, e.registerDeadline, e.finalizeDeadline, e.scope);
    }

    // -------- Top up --------
    function topUp(uint256 id, uint96 amount) external payable exists(id) open(id) {
        if (amount == 0) revert Errors.InvalidParams();
        EventData storage e = _events[id];

        _collect(e.token, amount);

        unchecked { e.prizeRemaining += amount; }
        emit EscrowEvents.ToppedUp(id, amount);
    }

    // -------- Judge management --------
    function addJudges(uint256 id, address[] calldata judges)
        external
        exists(id)
        onlyOrganizer(id)
        open(id)
    {
        if (judges.length == 0) revert Errors.InvalidParams();
        EventData storage e = _events[id];

        for (uint256 i = 0; i < judges.length; i++) {
            address j = judges[i];
            if (j == address(0)) revert Errors.InvalidParams();
            if (!e.isJudge[j]) {
                if (e.judgeCount + 1 > MAX_JUDGES) revert Errors.TooManyJudges();
                e.isJudge[j] = true;
                e.judgeCount += 1;
            }
        }
        if (e.judgeThreshold > e.judgeCount) {
            e.judgeThreshold = uint8(e.judgeCount);
        }
        emit EscrowEvents.JudgesAdded(id, judges);
    }

    function removeJudges(uint256 id, address[] calldata judges)
        external
        exists(id)
        onlyOrganizer(id)
        open(id)
    {
        if (judges.length == 0) revert Errors.InvalidParams();
        EventData storage e = _events[id];

        for (uint256 i = 0; i < judges.length; i++) {
            address j = judges[i];
            if (e.isJudge[j]) {
                e.isJudge[j] = false;
                e.judgeCount -= 1;
            }
        }
        if (e.judgeThreshold > e.judgeCount) {
            e.judgeThreshold = uint8(e.judgeCount);
        }
        emit EscrowEvents.JudgesRemoved(id, judges);
    }

    function setJudgeThreshold(uint256 id, uint8 newThreshold)
        external
        exists(id)
        onlyOrganizer(id)
        open(id)
    {
        EventData storage e = _events[id];
        if (newThreshold > e.judgeCount) revert Errors.InvalidParams();
        e.judgeThreshold = newThreshold;
        emit EscrowEvents.JudgeThresholdSet(id, newThreshold);
    }

    // -------- Cancel (after finalize deadline) --------
    function cancel(uint256 id)
        external
        exists(id)
        onlyOrganizer(id)
        open(id)
        nonReentrant
    {
        EventData storage e = _events[id];
        if (block.timestamp <= e.finalizeDeadline) revert Errors.TooEarly();

        uint96 amt = e.prizeRemaining;
        e.prizeRemaining = 0;
        e.canceled = true;

        _pay(e.token, e.organizer, amt);
        emit EscrowEvents.Canceled(id, amt);
    }

    // -------- Internal pay/collect --------
    function _collect(address token, uint256 amount) internal {
        if (token == address(0)) {
            if (msg.value != amount) revert Errors.InvalidParams();
        } else {
            if (msg.value != 0) revert Errors.InvalidParams();
            token.safeTransferFrom(msg.sender, address(this), amount);
        }
    }

    function _pay(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (token == address(0)) {
            (bool ok, ) = to.call{value: amount}("");
            if (!ok) revert Errors.TransferFailed();
        } else {
            token.safeTransfer(to, amount);
        }
    }

    // accept native RBTC
    receive() external payable {}
    fallback() external payable {}
}

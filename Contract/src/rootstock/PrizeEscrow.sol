// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Types} from "../common/Types.sol";
import {Errors} from "../common/Errors.sol";
import {EscrowEvents} from "../common/Events.sol";
import {IIdentityAttestations} from "../interfaces/IIdentityAttestations.sol";
import {IERC20} from "../interfaces/IERC20.sol";
import {SafeERC20} from "../libs/SafeERC20.sol";
import {ReentrancyGuard} from "../utils/ReentrancyGuard.sol";

/**
 * Milestone-2 additions:
 * - register(eventId): only verified humans (via IdentityAttestations) can register before registerDeadline.
 * - finalize(eventId, winners[]): organizer-only; sum(amounts) must equal prizeRemaining exactly; pays everyone, marks finalized.
 */
contract PrizeEscrow is ReentrancyGuard {
    using SafeERC20 for address;

    uint256 public constant MAX_JUDGES   = 64;
    uint256 public constant MAX_WINNERS  = 64;

    struct EventData {
        address organizer;
        address token;  // address(0) = RBTC
        uint96  prizeRemaining;
        uint64  registerDeadline;
        uint64  finalizeDeadline;
        bytes32 scope;
        bool    finalized;
        bool    canceled;

        // judges
        mapping(address => bool) isJudge;
        uint16  judgeCount;
        uint8   judgeThreshold;

        // NEW: registrations
        mapping(address => bool) registered;
    }

    uint256 public nextId;
    mapping(uint256 => EventData) private _events;

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
        return (
            e.organizer,
            e.token,
            e.prizeRemaining,
            e.registerDeadline,
            e.finalizeDeadline,
            e.scope,
            e.finalized,
            e.canceled,
            e.judgeCount,
            e.judgeThreshold
        );
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

    function isRegistered(uint256 id, address user) external view exists(id) returns (bool) {
        return _events[id].registered[user];
    }

    function createEvent(Types.CreateParams calldata p) external payable returns (uint256 id)
     {
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

    // -------- Top up -------- (unchanged)
    function topUp(uint256 id, uint96 amount) external payable exists(id) open(id) {
        if (amount == 0) revert Errors.InvalidParams();
        EventData storage e = _events[id];

        _collect(e.token, amount);

        unchecked { e.prizeRemaining += amount; }
        emit EscrowEvents.ToppedUp(id, amount);
    }

    // -------- Judge management -------- (unchanged)
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

    // -------- Register (NEW) --------
    // Student clicks "Register" after being verified in-app (we check attestation here).
    function register(uint256 id) external exists(id) open(id) {
        EventData storage e = _events[id];
        if (block.timestamp > e.registerDeadline) revert Errors.RegistrationClosed();
        if (e.registered[msg.sender]) revert Errors.AlreadyRegistered();

        // Gate on Self verification (bridge fills this later; for tests you can call setVerified on IdentityAttestations)
        if (!attestations.isVerified(msg.sender, e.scope)) revert Errors.NotVerified();

        e.registered[msg.sender] = true;
        emit EscrowEvents.Registered(id, msg.sender);
    }

    // -------- Finalize (NEW) --------
    // Organizer inputs winners + amounts in the frontend (e.g., 6000/4000/2000 for a 12000 pot).
    // Enforces sum(winners.amount) == prizeRemaining. Pays and closes the event.
    function finalize(uint256 id, Types.Winner[] calldata winners)
        external
        nonReentrant
        exists(id)
        onlyOrganizer(id)
        open(id)
    {
        EventData storage e = _events[id];
        if (block.timestamp > e.finalizeDeadline) revert Errors.FinalizationClosed();

        uint256 n = winners.length;
        if (n == 0 || n > MAX_WINNERS) revert Errors.TooManyWinners();

        // Sum & checks
        uint256 sum;
        address[] memory addrs = new address[](n);
        uint96[]  memory amts  = new uint96[](n);

        for (uint256 i = 0; i < n; i++) {
            address to = winners[i].to;
            uint96  a  = winners[i].amount;
            if (to == address(0) || a == 0) revert Errors.InvalidParams();
            if (!e.registered[to]) revert Errors.NotRegistered();

            // check duplicates (O(n^2) ok for MAX_WINNERS <= 64)
            for (uint256 j = 0; j < i; j++) {
                if (addrs[j] == to) revert Errors.DuplicateWinner();
            }

            addrs[i] = to;
            amts[i]  = a;
            sum += a;
        }

        if (sum != e.prizeRemaining) revert Errors.WrongSum();

        // Effects then interactions
        e.prizeRemaining = 0;
        e.finalized = true;

        for (uint256 i = 0; i < n; i++) {
            _pay(e.token, addrs[i], amts[i]);
        }

        emit EscrowEvents.Finalized(id, addrs, amts);
    }

    // -------- Cancel (unchanged) --------
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

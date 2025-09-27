// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title PrizeEscrow (no-attestor version)
/// @notice Event escrow for prize pools with simple registration (no on-chain verification)

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/// --------------------
/// Custom Errors
/// --------------------
error InvalidParams();
error BadValue();
error NotOrganizer();
error EventClosed();
error RegistrationClosed();
error AlreadyRegistered();
error AlreadyFinalized();
error AlreadyCanceled();
error NotFound();
error TransferFailed();

/// --------------------
/// Reentrancy Guard
/// --------------------
abstract contract ReentrancyGuard {
    uint256 private constant _ENTERED = 1;
    uint256 private constant _NOT_ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;

    modifier nonReentrant() {
        if (_status == _ENTERED) revert();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

/// --------------------
/// Main Contract
/// --------------------
contract PrizeEscrow is ReentrancyGuard {
    /// --- Types
    struct CreateEventParams {
        address token;               // address(0) => native tRBTC
        uint96  depositAmount;       // initial pool to lock
        uint64  registerDeadline;    // unix ts
        uint64  finalizeDeadline;    // unix ts
        address[] judges;            // optional list for UI (not enforced in this version)
        uint8   judgeThreshold;      // optional for UI (not enforced in this version)
        bytes32 scope;               // kept for UI/reference only
    }

    struct Winner {
        address to;
        uint96 amount;
    }

    struct EventData {
        // config
        address organizer;
        address token;
        uint64  registerDeadline;
        uint64  finalizeDeadline;
        bytes32 scope;

        // state
        bool    finalized;
        bool    canceled;
        uint96  prizeRemaining;

        // judges (kept for UI; not enforced here)
        uint16 judgeCount;
        uint8  judgeThreshold;
        mapping(address => bool) isJudge;

        // participants
        mapping(address => bool) registered;
    }

    /// --- Storage
    uint256 private _eventCount;
    mapping(uint256 => EventData) private _events;

    /// --- Events
    event EventCreated(
        uint256 indexed id,
        address indexed organizer,
        address indexed token,
        uint96 deposit,
        uint64 registerDeadline,
        uint64 finalizeDeadline,
        bytes32 scope
    );

    event ToppedUp(uint256 indexed id, uint96 amount);
    event Registered(uint256 indexed id, address indexed user);
    event Finalized(uint256 indexed id, Winner[] winners);
    event Canceled(uint256 indexed id);
    event JudgesAdded(uint256 indexed id, address[] judges);
    event JudgesRemoved(uint256 indexed id, address[] judges);

    /// --- Modifiers
    modifier exists(uint256 id) {
        if (id == 0 || id > _eventCount) revert NotFound();
        _;
    }
    modifier onlyOrganizer(uint256 id) {
        if (_events[id].organizer != msg.sender) revert NotOrganizer();
        _;
    }
    modifier open(uint256 id) {
        EventData storage e = _events[id];
        if (e.finalized || e.canceled) revert EventClosed();
        _;
    }

    /// --- Views
    function totalEvents() external view returns (uint256) {
        return _eventCount;
    }

    /// Packed read for UI
    function getEvent(uint256 id)
        external
        view
        exists(id)
        returns (
            address organizer,
            address token,
            uint96 prizeRemaining,
            uint64 registerDeadline,
            uint64 finalizeDeadline,
            bytes32 scope,
            bool finalized,
            bool canceled,
            uint16 judgeCount,
            uint8 judgeThreshold
        )
    {
        EventData storage e = _events[id];
        organizer = e.organizer;
        token = e.token;
        prizeRemaining = e.prizeRemaining;
        registerDeadline = e.registerDeadline;
        finalizeDeadline = e.finalizeDeadline;
        scope = e.scope;
        finalized = e.finalized;
        canceled = e.canceled;
        judgeCount = e.judgeCount;
        judgeThreshold = e.judgeThreshold;
    }

    function isRegistered(uint256 id, address user) external view exists(id) returns (bool) {
        return _events[id].registered[user];
    }

    function isJudge(uint256 id, address user) external view exists(id) returns (bool) {
        return _events[id].isJudge[user];
    }

    /// --- Create
    function createEvent(CreateEventParams calldata p) external payable returns (uint256 id) {
        if (
            p.depositAmount == 0 ||
            p.finalizeDeadline <= p.registerDeadline ||
            p.registerDeadline <= block.timestamp ||
            (p.judgeThreshold > 0 && p.judgeThreshold > p.judges.length) ||
            p.judges.length > type(uint16).max
        ) revert InvalidParams();

        // collect initial deposit
        _collect(p.token, p.depositAmount);

        id = ++_eventCount;
        EventData storage e = _events[id];
        e.organizer = msg.sender;
        e.token = p.token;
        e.prizeRemaining = p.depositAmount;
        e.registerDeadline = p.registerDeadline;
        e.finalizeDeadline = p.finalizeDeadline;
        e.scope = p.scope;
        e.judgeCount = uint16(p.judges.length);
        e.judgeThreshold = p.judgeThreshold;

        // seed judges
        for (uint256 i = 0; i < p.judges.length; i++) {
            address j = p.judges[i];
            if (j == address(0)) revert InvalidParams();
            if (e.isJudge[j]) continue;
            e.isJudge[j] = true;
        }

        emit EventCreated(
            id,
            msg.sender,
            p.token,
            p.depositAmount,
            p.registerDeadline,
            p.finalizeDeadline,
            p.scope
        );
    }

    /// --- Top Up
    function topUp(uint256 id, uint96 amount) external payable exists(id) open(id) {
        if (amount == 0) revert InvalidParams();
        EventData storage e = _events[id];
        _collect(e.token, amount);
        unchecked { e.prizeRemaining += amount; }
        emit ToppedUp(id, amount);
    }

    /// --- Register (NO on-chain verification)
    /// Anyone can register during the registration window, once per address.
    function register(uint256 id) external exists(id) open(id) {
        EventData storage e = _events[id];
        if (block.timestamp > e.registerDeadline) revert RegistrationClosed();
        if (e.registered[msg.sender]) revert AlreadyRegistered();
        e.registered[msg.sender] = true;
        emit Registered(id, msg.sender);
    }

    /// --- Finalize & Payout
    /// @dev organizer-only in this version; judges metadata is informational for UI
    /// Enforces sum(winners.amount) == prizeRemaining to avoid leftovers
    function finalize(uint256 id, Winner[] calldata winners)
        external
        exists(id)
        open(id)
        onlyOrganizer(id)
        nonReentrant
    {
        EventData storage e = _events[id];
        if (block.timestamp > e.finalizeDeadline) revert EventClosed(); // organizer missed deadline

        uint256 n = winners.length;
        if (n == 0) revert InvalidParams();

        uint256 total;
        for (uint256 i = 0; i < n; i++) {
            Winner calldata w = winners[i];
            if (w.to == address(0) || w.amount == 0) revert InvalidParams();
            total += uint256(w.amount);
        }

        if (total != uint256(e.prizeRemaining)) revert InvalidParams();

        // mark finalized first to block reentrancy into open paths
        e.finalized = true;

        // pay all
        for (uint256 i = 0; i < n; i++) {
            Winner calldata w = winners[i];
            _pay(e.token, w.to, uint256(w.amount));
        }

        e.prizeRemaining = 0;
        emit Finalized(id, winners);
    }

    /// --- Cancel (organizer can cancel before finalize; refund remaining)
    function cancel(uint256 id) external exists(id) open(id) onlyOrganizer(id) nonReentrant {
        EventData storage e = _events[id];
        e.canceled = true;

        uint96 remaining = e.prizeRemaining;
        e.prizeRemaining = 0;

        if (remaining > 0) {
            _pay(e.token, e.organizer, remaining);
        }
        emit Canceled(id);
    }

    /// --- Judges admin (optional / UI only)
    function addJudges(uint256 id, address[] calldata addrs) external exists(id) onlyOrganizer(id) open(id) {
        EventData storage e = _events[id];
        uint16 count = e.judgeCount;

        for (uint256 i = 0; i < addrs.length; i++) {
            address a = addrs[i];
            if (a == address(0)) revert InvalidParams();
            if (e.isJudge[a]) continue;
            e.isJudge[a] = true;
            count++;
        }
        if (count < e.judgeCount) revert InvalidParams(); // overflow check
        e.judgeCount = count;
        emit JudgesAdded(id, addrs);
    }

    function removeJudges(uint256 id, address[] calldata rem) external exists(id) onlyOrganizer(id) open(id) {
        EventData storage e = _events[id];
        uint16 count = e.judgeCount;

        for (uint256 i = 0; i < rem.length; i++) {
            address a = rem[i];
            if (!e.isJudge[a]) continue;
            e.isJudge[a] = false;
            count--;
        }
        e.judgeCount = count;
        if (e.judgeThreshold > count) {
            // keep threshold sane
            e.judgeThreshold = uint8(count);
        }
        emit JudgesRemoved(id, rem);
    }

    /// --- Internal money movement
    function _collect(address token, uint96 amount) internal {
        if (token == address(0)) {
            if (msg.value != uint256(amount)) revert BadValue();
        } else {
            if (msg.value != 0) revert BadValue();
            bool ok = IERC20(token).transferFrom(msg.sender, address(this), amount);
            if (!ok) revert TransferFailed();
        }
    }

    function _pay(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (token == address(0)) {
            (bool ok, ) = to.call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            bool ok = IERC20(token).transfer(to, amount);
            if (!ok) revert TransferFailed();
        }
    }

    /// accept native
    receive() external payable {}
}

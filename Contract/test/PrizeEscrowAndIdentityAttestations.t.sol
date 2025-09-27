// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Test.sol";
import {PrizeEscrow} from "../src/rootstock/PrizeEscrow.sol";
import {IdentityAttestations} from "../src/rootstock/IdentityAttestations.sol";
import {SelfVerifierAdapter} from "../src/celo/SelfVerifierAdapter.sol";
import {Types} from "../src/common/Types.sol";
import {EscrowEvents, IdentityEvents} from "../src/common/Events.sol";
import {Errors} from "../src/common/Errors.sol";

contract PrizeEscrowAndIdentityAttestationsTest is Test {
    // Actors
    address internal ORG = address(0xA11CE);
    address internal J1  = address(0xBEEF1);
    address internal J2  = address(0xBEEF2);
    address internal J3  = address(0xBEEF3);
    address internal USER = address(0xCAFE);
    address internal RANDOM = address(0xD00D);

    // Contracts
    IdentityAttestations internal attest;
    PrizeEscrow internal escrow;
    SelfVerifierAdapter internal adapter;

    // Common scope
    bytes32 internal SCOPE = keccak256("DEV_SCOPE");

    function setUp() public {
        // Fund actors with native coin
        vm.deal(ORG, 100 ether);
        vm.deal(RANDOM, 10 ether);

        // Deploy identity sink (trusted will be set later)
        attest = new IdentityAttestations(address(0));

        // Deploy escrow (wire attestations; escrow doesn’t use it yet for gating in this milestone)
        escrow = new PrizeEscrow(address(attest));

        // Deploy Celo-side adapter and wire to Rootstock sink
        adapter = new SelfVerifierAdapter(address(attest));

        // Now trust the adapter as sender on the sink
        vm.prank(attest.owner()); // owner is deployer: this test contract
        attest.setTrustedSender(address(adapter));
    }

    // ---------------------------
    // IdentityAttestations tests
    // ---------------------------

    function testOwnerCanSetVerified_AndRead() public {
        // initially false
        assertFalse(_isVerified(USER, SCOPE));

        // owner flips it on
        vm.prank(attest.owner());
        attest.setVerified(USER, SCOPE, true);

        assertTrue(_isVerified(USER, SCOPE));

        // owner flips it off
        vm.prank(attest.owner());
        attest.setVerified(USER, SCOPE, false);

        assertFalse(_isVerified(USER, SCOPE));
    }

    function testReceiveAttestationViaAdapter_SetsVerified() public {
        // adapter verifies & bridges to sink
        vm.prank(RANDOM); // any caller; adapter doesn’t restrict in this hackathon version
        adapter.verifyAndBridge(hex"", SCOPE, USER);

        assertTrue(_isVerified(USER, SCOPE));
    }

    function testOnlyOwnerGuardsOnIdentity() public {
        // setOwner: only owner can call
        vm.prank(RANDOM);
        vm.expectRevert(); // "OWN" or onlyOwner require — contract uses a require with "OWN"
        attest.setOwner(RANDOM);

        // setTrustedSender: only owner can call
        vm.prank(RANDOM);
        vm.expectRevert();
        attest.setTrustedSender(RANDOM);
    }

    // ---------------------------
    // PrizeEscrow tests (native)
    // ---------------------------

    function testCreateEvent_Getters_TopUp_Cancel_Native() public {
        // Compose params: native token (address(0))
        Types.CreateParams memory p;
        p.token            = address(0); // native
        p.depositAmount    = 1 ether;
        p.registerDeadline = uint64(block.timestamp + 1 days);
        p.finalizeDeadline = uint64(block.timestamp + 10 days);
        p.judges           = _arr(J1, J2);
        p.judgeThreshold   = 1;
        p.scope            = SCOPE;

        // Expect EventCreated
        
        vm.expectEmit(true, true, false, true);
        emit EscrowEvents.EventCreated(
            1,               
            ORG,
            address(0),
            uint96(p.depositAmount),
            p.registerDeadline,
            p.finalizeDeadline,
            p.scope
        );

        // Create with native deposit
        vm.prank(ORG);
        uint256 id = escrow.createEvent{value: p.depositAmount}(p);
        assertEq(id, 1);

        // Read back via getter
        (
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
        ) = escrow.getEvent(id);

        assertEq(organizer, ORG);
        assertEq(token, address(0));
        assertEq(prizeRemaining, uint96(1 ether));
        assertEq(registerDeadline, p.registerDeadline);
        assertEq(finalizeDeadline, p.finalizeDeadline);
        assertEq(scope, p.scope);
        assertFalse(finalized);
        assertFalse(canceled);
        assertEq(judgeCount, 2);
        assertEq(judgeThreshold, 1);

        // isJudge checks
        assertTrue(escrow.isJudge(id, J1));
        assertTrue(escrow.isJudge(id, J2));
        assertFalse(escrow.isJudge(id, J3));

        // Top up native
        vm.prank(ORG);
        vm.expectEmit(true, false, false, true);
        emit EscrowEvents.ToppedUp(id, uint96(0.5 ether));
        escrow.topUp{value: 0.5 ether}(id, uint96(0.5 ether));

        assertEq(escrow.getPrizeRemaining(id), uint96(1.5 ether));

        // Add another judge
        vm.prank(ORG);
        address[] memory add = new address[](1);
        add[0] = J3;
        escrow.addJudges(id, add);
        assertTrue(escrow.isJudge(id, J3));

        // Threshold can be set up to judgeCount
        vm.prank(ORG);
        escrow.setJudgeThreshold(id, 2);
        assertEq(escrow.getJudgeThreshold(id), 2);

        // Cancel after finalize deadline -> refund to organizer
        uint256 balBefore = ORG.balance;
        vm.warp(p.finalizeDeadline + 1);

        vm.prank(ORG);
        escrow.cancel(id);

        // Organizer received refund (1.5 ether)
        assertEq(ORG.balance, balBefore + 1.5 ether);

        // prizeRemaining should now be zero
        assertEq(escrow.getPrizeRemaining(id), 0);
    }

    function testCreateEvent_RevertsOnBadParams() public {
        Types.CreateParams memory p;

        // 1) depositAmount == 0
        p.token            = address(0);
        p.depositAmount    = 0;
        p.registerDeadline = uint64(block.timestamp + 1 days);
        p.finalizeDeadline = uint64(block.timestamp + 2 days);
        p.scope            = SCOPE;

        vm.prank(ORG);
        vm.expectRevert(abi.encodeWithSelector(Errors.InvalidParams.selector));
        escrow.createEvent(p);

        // 2) finalize <= register
        p.depositAmount    = 1 ether;
        p.finalizeDeadline = p.registerDeadline;
        vm.prank(ORG);
        vm.expectRevert(abi.encodeWithSelector(Errors.InvalidParams.selector));
        escrow.createEvent(p);

        // 3) register in the past
        p.registerDeadline = uint64(block.timestamp - 1);
        p.finalizeDeadline = uint64(block.timestamp + 2 days);
        vm.prank(ORG);
        vm.expectRevert(abi.encodeWithSelector(Errors.InvalidParams.selector));
        escrow.createEvent(p);
    }

    function testTopUp_RevertsOnZeroAmount() public {
        Types.CreateParams memory p;
        p.token            = address(0);
        p.depositAmount    = 1 ether;
        p.registerDeadline = uint64(block.timestamp + 1 days);
        p.finalizeDeadline = uint64(block.timestamp + 2 days);
        p.scope            = SCOPE;

        vm.prank(ORG);
        uint256 id = escrow.createEvent{value: 1 ether}(p);

        vm.prank(ORG);
        vm.expectRevert(abi.encodeWithSelector(Errors.InvalidParams.selector));
        escrow.topUp{value: 0}(id, 0);
    }

    function testOnlyOrganizerGuardsOnJudgesAndCancel() public {
        Types.CreateParams memory p;
        p.token            = address(0);
        p.depositAmount    = 1 ether;
        p.registerDeadline = uint64(block.timestamp + 1 days);
        p.finalizeDeadline = uint64(block.timestamp + 2 days);
        p.scope            = SCOPE;

        vm.prank(ORG);
        uint256 id = escrow.createEvent{value: 1 ether}(p);

        address[] memory add = new address[](1);
        add[0] = J3;

        // Non-organizer cannot add judges
        vm.prank(RANDOM);
        vm.expectRevert(abi.encodeWithSelector(Errors.NotOrganizer.selector));
        escrow.addJudges(id, add);

        // Non-organizer cannot set threshold
        vm.prank(RANDOM);
        vm.expectRevert(abi.encodeWithSelector(Errors.NotOrganizer.selector));
        escrow.setJudgeThreshold(id, 1);

        // Non-organizer cannot cancel
        vm.warp(p.finalizeDeadline + 1);
        vm.prank(RANDOM);
        vm.expectRevert(abi.encodeWithSelector(Errors.NotOrganizer.selector));
        escrow.cancel(id);
    }

    // ---------------------------
    // Helpers
    // ---------------------------

    function _isVerified(address user, bytes32 scope) internal view returns (bool ok) {
        (bool success, bytes memory data) =
            address(attest).staticcall(abi.encodeWithSignature("isVerified(address,bytes32)", user, scope));
        require(success, "isVerified call failed");
        ok = abi.decode(data, (bool));
    }

    function _arr(address a, address b) internal pure returns (address[] memory out) {
        out = new address[](2);
        out[0] = a;
        out[1] = b;
    }
}

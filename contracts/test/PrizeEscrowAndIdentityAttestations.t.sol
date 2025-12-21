/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Test.sol";
import {PrizeEscrow} from "../src/rootstock/PrizeEscrow.sol";
import {Errors} from "../src/common/Errors.sol";

contract PrizeEscrow_NoAttestor_Test is Test {
    PrizeEscrow escrow;

    address ORG = address(0xA11CE);
    address U1  = address(0xBEEF1);
    address U2  = address(0xBEEF2);
    address W1  = address(0x1111);
    address W2  = address(0x2222);

    function setUp() public {
        escrow = new PrizeEscrow();
        vm.deal(ORG, 100 ether);
        vm.deal(U1, 10 ether);
        vm.deal(U2, 10 ether);
    }

    function _makeParams(
        uint96 dep,
        uint64 regPlus,
        uint64 finPlus,
        uint8 thr,
        uint16 judgeCount
    ) internal view returns (PrizeEscrow.CreateEventParams memory p) {
        address[] memory judges = new address[](judgeCount);
        for (uint i=0;i<judgeCount;i++) judges[i] = address(uint160(0x1000+i));
        p = PrizeEscrow.CreateEventParams({
            token: address(0),
            depositAmount: dep,
            registerDeadline: uint64(block.timestamp + regPlus),
            finalizeDeadline: uint64(block.timestamp + finPlus),
            judges: judges,
            judgeThreshold: thr,
            scope: bytes32("SCOPE")
        });
    }

    function test_Create_TopUp_Cancel() public {
        PrizeEscrow.CreateEventParams memory p = _makeParams(uint96(1 ether), 1 days, 10 days, 0, 2);

        vm.prank(ORG);
        uint256 id = escrow.createEvent{value: p.depositAmount}(p);
        assertEq(id, 1);

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
        assertEq(judgeThreshold, 0);

        vm.prank(ORG);
        escrow.topUp{value: 0.5 ether}(id, uint96(0.5 ether));

        (, , prizeRemaining, , , , , , , ) = escrow.getEvent(id);
        assertEq(prizeRemaining, uint96(1.5 ether));

        uint256 balBefore = ORG.balance;
        vm.prank(ORG);
        escrow.cancel(id);

        assertEq(ORG.balance, balBefore + 1.5 ether);
        (, , prizeRemaining, , , , , canceled, , ) = escrow.getEvent(id);
        assertEq(prizeRemaining, 0);
        assertTrue(canceled);
    }

    function test_Register_And_Guards() public {
        PrizeEscrow.CreateEventParams memory p = _makeParams(uint96(1 ether), 1 days, 5 days, 0, 0);
        vm.prank(ORG);
        uint256 id = escrow.createEvent{value: p.depositAmount}(p);

        vm.prank(U1);
        escrow.register(id);
        assertTrue(escrow.isRegistered(id, U1));

        vm.prank(U1);
        vm.expectRevert(abi.encodeWithSelector(Errors.InvalidParams.selector));
        escrow.register(id);

        vm.warp(p.registerDeadline + 1);
        vm.prank(U2);
        vm.expectRevert(abi.encodeWithSelector(Errors.RegistrationClosed.selector));
        escrow.register(id);
    }

    function test_Finalize_ExactSum() public {
        PrizeEscrow.CreateEventParams memory p = _makeParams(uint96(1 ether), 1 days, 3 days, 0, 0);
        vm.prank(ORG);
        uint256 id = escrow.createEvent{value: p.depositAmount}(p);

        PrizeEscrow.Winner[] memory winners = new PrizeEscrow.Winner[](2);
        winners[0] = PrizeEscrow.Winner({to: W1, amount: uint96(0.4 ether)});
        winners[1] = PrizeEscrow.Winner({to: W2, amount: uint96(0.6 ether)});

        uint256 b1 = W1.balance;
        uint256 b2 = W2.balance;

        vm.prank(ORG);
        escrow.finalize(id, winners);

        assertEq(W1.balance, b1 + 0.4 ether);
        assertEq(W2.balance, b2 + 0.6 ether);

        vm.prank(ORG);
        vm.expectRevert(abi.encodeWithSelector(Errors.FinalizationClosed.selector));
        escrow.finalize(id, winners);
    }

    function test_Finalize_Revert_If_Sum_Mismatch() public {
        PrizeEscrow.CreateEventParams memory p = _makeParams(uint96(1 ether), 1 days, 3 days, 0, 0);
        vm.prank(ORG);
        uint256 id = escrow.createEvent{value: p.depositAmount}(p);

         PrizeEscrow.Winner[] memory winners = new PrizeEscrow.Winner[](1);
        winners[0] = PrizeEscrow.Winner({to: W1, amount: uint96(0.9 ether)});

        vm.prank(ORG);
        vm.expectRevert(abi.encodeWithSelector(Errors.NotOrganizer.selector));
        escrow.finalize(id, winners);
    }

    function test_Add_Remove_Judges_Adjusts_Count_And_Threshold() public {
        PrizeEscrow.CreateEventParams memory p = _makeParams(uint96(1 ether), 1 days, 3 days, 2, 2);
        vm.prank(ORG);
        uint256 id = escrow.createEvent{value: p.depositAmount}(p);

        (,,,,,,, , uint16 judgeCount, uint8 thr) = escrow.getEvent(id);
        assertEq(judgeCount, 2);
        assertEq(thr, 2);

       address[] memory rem = new address[](1);
        rem[0] = address(uint160(0x1000));
        vm.prank(ORG);
        escrow.removeJudges(id, rem);

        (,,,,,,, , judgeCount, thr) = escrow.getEvent(id);
        assertEq(judgeCount, 1);
        assertEq(thr, 1);

        address[] memory add = new address[](1);
        add[0] = address(0xABCD);
        vm.prank(ORG);
        escrow.addJudges(id, add);

        (,,,,,,, , judgeCount, thr) = escrow.getEvent(id);
        assertEq(judgeCount, 2);
        assertEq(thr, 1); // we don't auto-increase
    }

    function test_Create_Reverts_On_Bad_Params() public {
        // deposit 0
        PrizeEscrow.CreateEventParams memory p = _makeParams(uint96(0), 1 days, 2 days, 0, 0);
        vm.prank(ORG);
        vm.expectRevert(abi.encodeWithSelector(Errors.InvalidParams.selector));
        escrow.createEvent(p);

        // finalize <= register
        p = _makeParams(uint96(1 ether), 2 days, 2 days, 0, 0);
        vm.prank(ORG);
        vm.expectRevert(abi.encodeWithSelector(Errors.InvalidParams.selector));
        escrow.createEvent{value: 1 ether}(p);

        // register in the past
        p = _makeParams(uint96(1 ether), 0, 2 days, 0, 0);
        vm.prank(ORG);
        vm.expectRevert(abi.encodeWithSelector(Errors.InvalidParams.selector));
        escrow.createEvent{value: 1 ether}(p);
    }

    function test_TopUp_Reverts_On_Zero() public {
        PrizeEscrow.CreateEventParams memory p = _makeParams(uint96(1 ether), 1 days, 2 days, 0, 0);
        vm.prank(ORG);
        uint256 id = escrow.createEvent{value: 1 ether}(p);

        vm.prank(ORG);
       vm.expectRevert(abi.encodeWithSelector(Errors.InvalidParams.selector));
        escrow.topUp{value: 0}(id, 0);
    }
}

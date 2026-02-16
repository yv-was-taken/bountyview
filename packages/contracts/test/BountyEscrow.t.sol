// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import { BountyEscrow } from "../src/BountyEscrow.sol";
import { MockUSDC } from "../src/MockUSDC.sol";

contract BountyEscrowTest is Test {
    MockUSDC internal usdc;
    BountyEscrow internal escrow;

    address internal employer = address(0x1001);
    address internal candidate = address(0x1002);
    address internal treasury = address(0x9999);

    uint256 internal constant BOUNTY_AMOUNT = 1_000_000_000; // 1000 USDC (6 decimals)

    function setUp() external {
        usdc = new MockUSDC();
        escrow = new BountyEscrow(address(usdc), treasury);

        usdc.mint(employer, 2_000_000_000);

        vm.startPrank(employer);
        usdc.approve(address(escrow), type(uint256).max);
        vm.stopPrank();
    }

    function testCreateBountyStoresStateAndEscrow() external {
        vm.prank(employer);
        uint256 bountyId = escrow.createBounty(BOUNTY_AMOUNT, block.timestamp + 1 days, 7);

        (
            address bountyEmployer,
            uint256 amount,
            uint256 fee,,
            uint256 gracePeriodEnd,
            address winner,
            uint8 status
        ) = escrow.bounties(bountyId);

        assertEq(bountyEmployer, employer);
        assertEq(amount, BOUNTY_AMOUNT);
        assertEq(fee, (BOUNTY_AMOUNT * 300) / 10_000);
        assertEq(winner, address(0));
        assertEq(uint256(status), uint256(BountyEscrow.BountyStatus.OPEN));
        assertTrue(gracePeriodEnd > block.timestamp + 1 days);

        uint256 escrowBalance = usdc.balanceOf(address(escrow));
        assertEq(escrowBalance, BOUNTY_AMOUNT + ((BOUNTY_AMOUNT * 300) / 10_000));
    }

    function testWithdrawRefundsBountyAndFee() external {
        vm.prank(employer);
        uint256 bountyId = escrow.createBounty(BOUNTY_AMOUNT, block.timestamp + 1 days, 7);

        uint256 beforeBalance = usdc.balanceOf(employer);

        vm.prank(employer);
        escrow.withdrawBounty(bountyId);

        uint256 afterBalance = usdc.balanceOf(employer);
        assertEq(afterBalance, beforeBalance + BOUNTY_AMOUNT + ((BOUNTY_AMOUNT * 300) / 10_000));
    }

    function testClaimTransfersWinnerAndTreasury() external {
        vm.prank(employer);
        uint256 bountyId = escrow.createBounty(BOUNTY_AMOUNT, block.timestamp + 1 days, 7);

        vm.prank(employer);
        escrow.claimBounty(bountyId, candidate);

        assertEq(usdc.balanceOf(candidate), BOUNTY_AMOUNT);
        assertEq(usdc.balanceOf(treasury), (BOUNTY_AMOUNT * 300) / 10_000);
    }

    function testUnauthorizedClaimReverts() external {
        vm.prank(employer);
        uint256 bountyId = escrow.createBounty(BOUNTY_AMOUNT, block.timestamp + 1 days, 7);

        vm.prank(candidate);
        vm.expectRevert(BountyEscrow.Unauthorized.selector);
        escrow.claimBounty(bountyId, candidate);
    }

    function testRefundExpiredAfterGracePeriod() external {
        vm.prank(employer);
        uint256 bountyId = escrow.createBounty(BOUNTY_AMOUNT, block.timestamp + 1 days, 1);

        vm.warp(block.timestamp + 2 days + 1);

        escrow.refundExpired(bountyId);

        (,,,,,, uint8 status) = escrow.bounties(bountyId);
        assertEq(uint256(status), uint256(BountyEscrow.BountyStatus.EXPIRED));
    }

    function testCannotRefundBeforeExpiry() external {
        vm.prank(employer);
        uint256 bountyId = escrow.createBounty(BOUNTY_AMOUNT, block.timestamp + 1 days, 7);

        vm.expectRevert(BountyEscrow.ExpiryNotReached.selector);
        escrow.refundExpired(bountyId);
    }
}

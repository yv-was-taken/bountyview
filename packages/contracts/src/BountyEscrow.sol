// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

abstract contract ReentrancyGuard {
    uint256 private _status;

    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = 1;
    }

    modifier nonReentrant() {
        if (_status == 2) {
            revert ReentrancyGuardReentrantCall();
        }
        _status = 2;
        _;
        _status = 1;
    }
}

contract BountyEscrow is ReentrancyGuard {
    enum BountyStatus {
        OPEN,
        CLAIMED,
        CANCELLED,
        EXPIRED
    }

    struct Bounty {
        address employer;
        uint256 bountyAmount;
        uint256 feeAmount;
        uint256 deadline;
        uint256 gracePeriodEnd;
        address winner;
        BountyStatus status;
    }

    error InvalidAmount();
    error InvalidDeadline();
    error InvalidGracePeriod();
    error Unauthorized();
    error InvalidStatus();
    error ExpiryNotReached();
    error TransferFailed();

    event BountyCreated(
        uint256 indexed bountyId, address indexed employer, uint256 amount, uint256 deadline
    );
    event BountyCancelled(uint256 indexed bountyId);
    event BountyClaimed(uint256 indexed bountyId, address indexed winner, uint256 amount);
    event BountyExpired(uint256 indexed bountyId);

    uint256 public constant FEE_BPS = 300;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    IERC20 public immutable usdc;
    address public immutable treasury;
    uint256 public nextBountyId;

    mapping(uint256 => Bounty) public bounties;

    constructor(address usdcAddress, address treasuryAddress) {
        if (usdcAddress == address(0) || treasuryAddress == address(0)) {
            revert Unauthorized();
        }

        usdc = IERC20(usdcAddress);
        treasury = treasuryAddress;
        nextBountyId = 1;
    }

    function createBounty(uint256 bountyAmount, uint256 deadline, uint256 gracePeriodDays)
        external
        nonReentrant
        returns (uint256 bountyId)
    {
        if (bountyAmount == 0) {
            revert InvalidAmount();
        }

        if (deadline <= block.timestamp) {
            revert InvalidDeadline();
        }

        if (gracePeriodDays == 0 || gracePeriodDays > 30) {
            revert InvalidGracePeriod();
        }

        uint256 feeAmount = (bountyAmount * FEE_BPS) / BPS_DENOMINATOR;
        uint256 escrowAmount = bountyAmount + feeAmount;
        uint256 gracePeriodEnd = deadline + (gracePeriodDays * 1 days);

        bountyId = nextBountyId;
        nextBountyId = bountyId + 1;

        bounties[bountyId] = Bounty({
            employer: msg.sender,
            bountyAmount: bountyAmount,
            feeAmount: feeAmount,
            deadline: deadline,
            gracePeriodEnd: gracePeriodEnd,
            winner: address(0),
            status: BountyStatus.OPEN
        });

        if (!usdc.transferFrom(msg.sender, address(this), escrowAmount)) {
            revert TransferFailed();
        }

        emit BountyCreated(bountyId, msg.sender, bountyAmount, deadline);
    }

    function withdrawBounty(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = bounties[bountyId];
        if (bounty.employer != msg.sender) {
            revert Unauthorized();
        }

        if (bounty.status != BountyStatus.OPEN) {
            revert InvalidStatus();
        }

        bounty.status = BountyStatus.CANCELLED;

        uint256 refundAmount = bounty.bountyAmount + bounty.feeAmount;
        if (!usdc.transfer(bounty.employer, refundAmount)) {
            revert TransferFailed();
        }

        emit BountyCancelled(bountyId);
    }

    function claimBounty(uint256 bountyId, address winnerAddress) external nonReentrant {
        Bounty storage bounty = bounties[bountyId];
        if (bounty.employer != msg.sender) {
            revert Unauthorized();
        }

        if (winnerAddress == address(0)) {
            revert Unauthorized();
        }

        if (bounty.status != BountyStatus.OPEN) {
            revert InvalidStatus();
        }

        bounty.status = BountyStatus.CLAIMED;
        bounty.winner = winnerAddress;

        if (!usdc.transfer(winnerAddress, bounty.bountyAmount)) {
            revert TransferFailed();
        }

        if (!usdc.transfer(treasury, bounty.feeAmount)) {
            revert TransferFailed();
        }

        emit BountyClaimed(bountyId, winnerAddress, bounty.bountyAmount);
    }

    function refundExpired(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = bounties[bountyId];
        if (bounty.status != BountyStatus.OPEN) {
            revert InvalidStatus();
        }

        if (block.timestamp <= bounty.gracePeriodEnd) {
            revert ExpiryNotReached();
        }

        bounty.status = BountyStatus.EXPIRED;

        uint256 refundAmount = bounty.bountyAmount + bounty.feeAmount;
        if (!usdc.transfer(bounty.employer, refundAmount)) {
            revert TransferFailed();
        }

        emit BountyExpired(bountyId);
    }
}

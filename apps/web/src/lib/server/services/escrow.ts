import { createPublicClient, decodeEventLog, http, parseAbiItem, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { getEnv } from '../env';

const bountyCreatedEvent = parseAbiItem(
  'event BountyCreated(uint256 indexed bountyId, address indexed employer, uint256 amount, uint256 deadline)'
);
const bountyClaimedEvent = parseAbiItem(
  'event BountyClaimed(uint256 indexed bountyId, address indexed winner, uint256 amount)'
);
const bountyCancelledEvent = parseAbiItem('event BountyCancelled(uint256 indexed bountyId)');

function getClient() {
  const env = getEnv();
  return createPublicClient({
    chain: base,
    transport: http(env.BASE_RPC_URL)
  });
}

function normalizeAddress(address: string | null | undefined) {
  return address?.toLowerCase() ?? null;
}

export async function verifyFundingTransaction(params: {
  txHash: `0x${string}`;
  expectedAmountUsdc: string;
  expectedDeadline: Date;
  expectedEmployerWalletAddress?: string | null;
}) {
  const env = getEnv();
  const client = getClient();
  const receipt = await client.getTransactionReceipt({ hash: params.txHash });

  if (receipt.status !== 'success') {
    throw new Error('Funding transaction failed on-chain');
  }

  const expectedAmount = parseUnits(params.expectedAmountUsdc, 6);
  const expectedDeadlineUnix = BigInt(Math.floor(params.expectedDeadline.getTime() / 1000));
  const escrowAddress = env.ESCROW_CONTRACT_ADDRESS.toLowerCase();

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== escrowAddress) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi: [bountyCreatedEvent],
        data: log.data,
        topics: log.topics
      });

      const employer = normalizeAddress(decoded.args.employer);
      const bountyId = decoded.args.bountyId;
      const amount = decoded.args.amount;
      const deadline = decoded.args.deadline;

      if (amount !== expectedAmount) {
        continue;
      }

      if (deadline !== expectedDeadlineUnix) {
        continue;
      }

      if (!employer) {
        throw new Error('BountyCreated event missing employer address');
      }

      const expectedEmployer = normalizeAddress(params.expectedEmployerWalletAddress);
      if (expectedEmployer && employer !== expectedEmployer) {
        continue;
      }

      return {
        onchainBountyId: bountyId.toString(),
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber.toString(),
        employerAddress: employer
      };
    } catch {
      // Ignore unrelated logs.
    }
  }

  throw new Error('No matching BountyCreated event found in transaction receipt');
}

export async function verifyClaimTransaction(params: {
  txHash: `0x${string}`;
  expectedOnchainBountyId: string;
  expectedWinnerAddress: string;
  expectedAmountUsdc: string;
}) {
  const env = getEnv();
  const client = getClient();
  const receipt = await client.getTransactionReceipt({ hash: params.txHash });

  if (receipt.status !== 'success') {
    throw new Error('Claim transaction failed on-chain');
  }

  const expectedAmount = parseUnits(params.expectedAmountUsdc, 6);
  const expectedBountyId = BigInt(params.expectedOnchainBountyId);
  const expectedWinner = params.expectedWinnerAddress.toLowerCase();
  const escrowAddress = env.ESCROW_CONTRACT_ADDRESS.toLowerCase();

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== escrowAddress) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi: [bountyClaimedEvent],
        data: log.data,
        topics: log.topics
      });

      if (decoded.args.bountyId !== expectedBountyId) {
        continue;
      }

      if ((decoded.args.winner ?? '').toLowerCase() !== expectedWinner) {
        continue;
      }

      if (decoded.args.amount !== expectedAmount) {
        continue;
      }

      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber.toString()
      };
    } catch {
      // Ignore unrelated logs.
    }
  }

  throw new Error('No matching BountyClaimed event found in transaction receipt');
}

export async function verifyCancelTransaction(params: {
  txHash: `0x${string}`;
  expectedOnchainBountyId: string;
}) {
  const env = getEnv();
  const client = getClient();
  const receipt = await client.getTransactionReceipt({ hash: params.txHash });

  if (receipt.status !== 'success') {
    throw new Error('Cancel transaction failed on-chain');
  }

  const expectedBountyId = BigInt(params.expectedOnchainBountyId);
  const escrowAddress = env.ESCROW_CONTRACT_ADDRESS.toLowerCase();

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== escrowAddress) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi: [bountyCancelledEvent],
        data: log.data,
        topics: log.topics
      });

      if (decoded.args.bountyId !== expectedBountyId) {
        continue;
      }

      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber.toString()
      };
    } catch {
      // Ignore unrelated logs.
    }
  }

  throw new Error('No matching BountyCancelled event found in transaction receipt');
}

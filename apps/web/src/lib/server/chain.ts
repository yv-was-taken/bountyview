import { createPublicClient, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';
import { getEnv } from './env';

const bountyCreatedEvent = parseAbiItem(
  'event BountyCreated(uint256 indexed bountyId, address indexed employer, uint256 amount, uint256 deadline)'
);

const bountyClaimedEvent = parseAbiItem(
  'event BountyClaimed(uint256 indexed bountyId, address indexed winner, uint256 amount)'
);

const bountyCancelledEvent = parseAbiItem('event BountyCancelled(uint256 indexed bountyId)');
const bountyExpiredEvent = parseAbiItem('event BountyExpired(uint256 indexed bountyId)');

function getClient() {
  const env = getEnv();
  return createPublicClient({
    chain: base,
    transport: http(env.BASE_RPC_URL)
  });
}

export async function getEscrowEvents(fromBlock: bigint, toBlock: bigint) {
  const env = getEnv();
  const client = getClient();

  const [created, claimed, cancelled, expired] = await Promise.all([
    client.getLogs({
      address: env.ESCROW_CONTRACT_ADDRESS as `0x${string}`,
      event: bountyCreatedEvent,
      fromBlock,
      toBlock
    }),
    client.getLogs({
      address: env.ESCROW_CONTRACT_ADDRESS as `0x${string}`,
      event: bountyClaimedEvent,
      fromBlock,
      toBlock
    }),
    client.getLogs({
      address: env.ESCROW_CONTRACT_ADDRESS as `0x${string}`,
      event: bountyCancelledEvent,
      fromBlock,
      toBlock
    }),
    client.getLogs({
      address: env.ESCROW_CONTRACT_ADDRESS as `0x${string}`,
      event: bountyExpiredEvent,
      fromBlock,
      toBlock
    })
  ]);

  return { created, claimed, cancelled, expired };
}

export async function getLatestBlockNumber() {
  const client = getClient();
  return client.getBlockNumber();
}

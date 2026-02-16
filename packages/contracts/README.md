# BountyView Contracts

Escrow contract for BountyView interview bounties on Base using USDC.

## Setup

```bash
forge install foundry-rs/forge-std
```

## Test

```bash
forge test
```

## Deploy

```bash
forge script script/Deploy.s.sol:DeployEscrow --rpc-url $BASE_RPC_URL --broadcast
```

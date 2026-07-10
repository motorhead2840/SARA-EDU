# SARA Token Contracts

**SRI Adaptive Response Asset (SARA)** — ERC-20 governance + utility token for the SRI Learn global homeschooling platform, deployed on **Ethereum Sepolia testnet** via **AWS Managed Blockchain**.

---

## Token Overview

| Property        | Value                            |
|-----------------|----------------------------------|
| Name            | SRI Adaptive Response Asset      |
| Symbol          | SARA                             |
| Decimals        | 18                               |
| Max Supply      | 100,000,000 SARA                 |
| Genesis Mint    | 10,000,000 SARA (to deployer)    |
| Network         | Ethereum Sepolia Testnet          |
| Standards       | ERC-20, ERC-20 Votes, ERC-20 Permit, ERC-20 Burnable |

## Token Economy (allocation plan)

| Tranche          | Tokens       | %   | Purpose                          |
|------------------|-------------|-----|----------------------------------|
| Treasury (DAO)   | 40,000,000  | 40% | Protocol treasury, DAO-controlled |
| Ecosystem Grants | 25,000,000  | 25% | Developer grants, integrations   |
| Team & Advisors  | 15,000,000  | 15% | Vesting schedule (4yr/1yr cliff) |
| Community Rewards| 10,000,000  | 10% | Learning milestones, homeschool awards |
| Genesis Mint     | 10,000,000  | 10% | Deployer / initial treasury seed |

---

## Setup

```bash
cd contracts
npm install
```

Create a `.env` file (copy from `.env.example`):
```
DEPLOYER_PRIVATE_KEY=0x...          # Deployer wallet private key
SEPOLIA_RPC_URL=https://...         # Standard Sepolia RPC (Infura/Alchemy)
ETHERSCAN_API_KEY=...               # For contract verification
AWS_BLOCKCHAIN_NODE_URL=https://... # AWS Managed Blockchain node endpoint
AWS_REGION=us-east-1
```

## Compile

```bash
npm run compile
```

## Test

```bash
npm test
```

## Deploy to Sepolia

### Option A — Standard Sepolia RPC (recommended for first deployment)

```bash
npm run deploy:sepolia
```

This uses the `SEPOLIA_RPC_URL` from your `.env`. Use Infura or Alchemy for a standard endpoint.

### Option B — AWS Managed Blockchain Node

The AWS Managed Blockchain Ethereum node requires **SigV4-authenticated** HTTP requests. Standard Hardhat providers don't support this natively.

For deployment via AWS, use the AWS CLI approach:

```bash
# Export AWS credentials
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=us-east-1

# Deploy using the custom aws-signing provider (see scripts/aws-provider.ts)
npm run deploy:sepolia
```

Set `SEPOLIA_RPC_URL` to your AWS Managed Blockchain node URL. The node endpoint is:
```
https://bn-ethereum-sepolia.<node-id>.managedblockchain.<region>.amazonaws.com
```

> **Note:** AWS Managed Blockchain signs each request with SigV4. You may need to configure a signing proxy or use the AWS SDK directly for raw JSON-RPC calls. The API server in `artifacts/api-server` handles this for all read operations.

## After Deployment

1. Copy the `CONTRACT_ADDRESS` printed by the deploy script
2. Set it in environment variables:
   ```
   SARA_CONTRACT_ADDRESS=0x...       (for API server)
   VITE_SARA_CONTRACT_ADDRESS=0x...  (for frontend)
   ```
3. Verify on Etherscan:
   ```bash
   npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <DEPLOYER_ADDRESS>
   ```
4. Transfer ownership to the DAO Governor once governance is set up:
   ```solidity
   sara.transferOwnership(daoGovernorAddress);
   // Then the new owner must call acceptOwnership()
   sara.acceptOwnership();
   ```

## DAO Governance (coming soon)

The token includes `ERC20Votes` which enables:
- Vote delegation (`delegate(address)`)
- Snapshot-based voting power (`getPastVotes(account, blockNumber)`)
- Compatible with OpenZeppelin `Governor` contracts

DAO voting economy and governance parameters will be configured separately.

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

/**
 * Hardhat configuration for SARA token deployment.
 *
 * Two networks are pre-configured for Sepolia testnet:
 *
 *  1. sepolia  — Standard public Sepolia via Infura/Alchemy.
 *                Use this for local development and CI.
 *                Set SEPOLIA_RPC_URL + DEPLOYER_PRIVATE_KEY in .env
 *
 *  2. aws      — AWS Managed Blockchain Ethereum node (Sepolia).
 *                Requires SigV4-signed requests — see scripts/aws-provider.ts
 *                Set AWS_BLOCKCHAIN_NODE_URL + AWS_REGION + AWS creds in .env
 *
 * Run:
 *   npx hardhat run scripts/deploy.ts --network sepolia
 *   npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
 */

import * as dotenv from "dotenv";
dotenv.config();

const DEPLOYER_PK = process.env.DEPLOYER_PRIVATE_KEY ?? "";
const SEPOLIA_URL = process.env.SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org";
const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,   // higher runs = cheaper calls, slightly larger bytecode
      },
      viaIR: true,   // Yul IR pipeline: enables cross-function optimisations
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_URL,
      accounts: DEPLOYER_PK ? [DEPLOYER_PK] : [],
      chainId: 11155111,
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_KEY,
    },
  },
  paths: {
    sources:   "./",        // SaraToken.sol is at root of contracts/
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "./typechain-types",
    target: "ethers-v6",
  },
};

export default config;

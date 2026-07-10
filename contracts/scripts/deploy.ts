/**
 * Deployment script for SaraToken on Ethereum Sepolia.
 *
 * Usage (standard Sepolia RPC):
 *   SEPOLIA_RPC_URL=https://... DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/deploy.ts --network sepolia
 *
 * After deployment:
 *   1. Copy the printed CONTRACT_ADDRESS into your environment variables:
 *        SARA_CONTRACT_ADDRESS=<address>
 *        VITE_SARA_CONTRACT_ADDRESS=<address>
 *   2. Verify on Etherscan:
 *        npx hardhat verify --network sepolia <address> <deployer_address>
 *   3. Transfer ownership to the DAO Governor contract once deployed.
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Deploying SARA Token — SRI Adaptive Response Asset");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Deployer  : ${deployer.address}`);
  console.log(`  Balance   : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log(`  Network   : ${(await ethers.provider.getNetwork()).name}`);
  console.log("───────────────────────────────────────────────────────────");

  const SaraToken = await ethers.getContractFactory("SaraToken");
  console.log("  Deploying…");

  const sara = await SaraToken.deploy(deployer.address);
  await sara.waitForDeployment();

  const address = await sara.getAddress();

  console.log("───────────────────────────────────────────────────────────");
  console.log(`  CONTRACT_ADDRESS : ${address}`);
  console.log(`  Token name       : ${await sara.name()}`);
  console.log(`  Token symbol     : ${await sara.symbol()}`);
  console.log(`  Decimals         : ${await sara.decimals()}`);
  console.log(`  Total supply     : ${ethers.formatEther(await sara.totalSupply())} SARA`);
  console.log(`  Max supply       : ${ethers.formatEther(await sara.MAX_SUPPLY())} SARA`);
  console.log(`  Owner            : ${await sara.owner()}`);
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log("  Next steps:");
  console.log("  1. Set SARA_CONTRACT_ADDRESS=" + address + " in environment variables");
  console.log("  2. Set VITE_SARA_CONTRACT_ADDRESS=" + address + " in environment variables");
  console.log("  3. Verify: npx hardhat verify --network sepolia " + address + " " + deployer.address);
  console.log("═══════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

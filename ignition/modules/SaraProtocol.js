const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

/**
 * SaraProtocol Ignition deployment module.
 *
 * Deploys:
 * 1) SaraToken
 * 2) SaraKnowledgeRegistry (owned by deployer by default)
 *
 * Usage example:
 * npx hardhat ignition deploy ignition/modules/SaraProtocol.js --network sepolia
 */
module.exports = buildModule("SaraProtocolModule", (m) => {
  // Deployer account from the configured signer list (account index 0).
  const deployer = m.getAccount(0);

  // Deploy SARA governance token (ERC20 + ERC20Votes).
  const saraToken = m.contract("SaraToken");

  // Deploy registry contract and set deployer as the initial owner.
  const saraKnowledgeRegistry = m.contract("SaraKnowledgeRegistry", [deployer]);

  // Hardhat Ignition prints deployed addresses for returned contracts automatically.
  // Returning both contracts ensures their final addresses are shown in deploy output.
  return {
    saraToken,
    saraKnowledgeRegistry,
  };
});

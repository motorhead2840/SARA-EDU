/**
 * Blockchain API routes — SARA token via Etherscan API v2.
 *
 * GET  /api/blockchain/token                 — token metadata + supply
 * GET  /api/blockchain/balance/:address      — SARA balance for an address
 * GET  /api/blockchain/votes/:address        — ERC-20Votes voting power
 * GET  /api/blockchain/holders               — top SARA holders
 * GET  /api/blockchain/transactions/:address — ERC-20 transfer history
 * GET  /api/blockchain/abi                   — verified contract ABI
 * GET  /api/blockchain/verification          — Etherscan verification status
 * POST /api/blockchain/call                  — raw eth_call proxy via Etherscan
 */

import { Router } from "express";
import {
  getSaraTokenInfo,
  getSaraBalance,
  getVotingPower,
  listSaraHolders,
  listTokenTransfers,
  getContractAbi,
  getVerificationStatus,
  ethCall,
} from "../lib/etherscanClient.js";

const router = Router();

// ─── Token metadata ───────────────────────────────────────────────────────────

router.get("/token", async (_req, res) => {
  try {
    const contract = process.env.SARA_CONTRACT_ADDRESS;
    if (!contract) {
      res.status(503).json({
        error: "SARA_CONTRACT_ADDRESS not configured",
        hint: "Deploy SaraToken.sol and set the env var",
      });
      return;
    }
    const info = await getSaraTokenInfo();
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: toMsg(err) });
  }
});

// ─── Balance by address ───────────────────────────────────────────────────────

router.get("/balance/:address", async (req, res) => {
  try {
    const { address } = req.params;
    if (!isValidAddress(address)) {
      res.status(400).json({ error: "Invalid Ethereum address" });
      return;
    }
    if (!process.env.SARA_CONTRACT_ADDRESS) {
      res.status(503).json({ error: "SARA_CONTRACT_ADDRESS not configured" });
      return;
    }
    const balance = await getSaraBalance(address);
    res.json(balance);
  } catch (err) {
    res.status(500).json({ error: toMsg(err) });
  }
});

// ─── Voting power by address ──────────────────────────────────────────────────

router.get("/votes/:address", async (req, res) => {
  try {
    const { address } = req.params;
    if (!isValidAddress(address)) {
      res.status(400).json({ error: "Invalid Ethereum address" });
      return;
    }
    if (!process.env.SARA_CONTRACT_ADDRESS) {
      res.status(503).json({ error: "SARA_CONTRACT_ADDRESS not configured" });
      return;
    }
    const votes = await getVotingPower(address);
    res.json({ address, votingPower: votes.formattedBalance, votingPowerWei: votes.rawBalance });
  } catch (err) {
    res.status(500).json({ error: toMsg(err) });
  }
});

// ─── Top holders ──────────────────────────────────────────────────────────────

router.get("/holders", async (req, res) => {
  try {
    const limit = safeLimit(req.query.limit, 10, 10);
    const holders = await listSaraHolders(limit);
    res.json({ holders, count: holders.length });
  } catch (err) {
    res.status(500).json({ error: toMsg(err) });
  }
});

// ─── Token transfer history ───────────────────────────────────────────────────

router.get("/transactions/:address", async (req, res) => {
  try {
    const { address } = req.params;
    if (!isValidAddress(address)) {
      res.status(400).json({ error: "Invalid Ethereum address" });
      return;
    }
    const limit = safeLimit(req.query.limit, 20, 100);
    const transfers = await listTokenTransfers(address, limit);
    res.json({ address, transactions: transfers, count: transfers.length });
  } catch (err) {
    res.status(500).json({ error: toMsg(err) });
  }
});

// ─── Contract ABI ─────────────────────────────────────────────────────────────

router.get("/abi", async (_req, res) => {
  try {
    const abi = await getContractAbi();
    if (!abi) {
      res.status(404).json({
        error: "Contract ABI not available",
        hint: "The contract may not be verified on Etherscan yet",
      });
      return;
    }
    res.json({ abi, contractAddress: process.env.SARA_CONTRACT_ADDRESS });
  } catch (err) {
    res.status(500).json({ error: toMsg(err) });
  }
});

// ─── Verification status ──────────────────────────────────────────────────────

router.get("/verification", async (_req, res) => {
  try {
    const status = await getVerificationStatus();
    res.json({
      ...status,
      contractAddress: process.env.SARA_CONTRACT_ADDRESS,
      etherscanUrl: `https://sepolia.etherscan.io/address/${process.env.SARA_CONTRACT_ADDRESS}`,
    });
  } catch (err) {
    res.status(500).json({ error: toMsg(err) });
  }
});

// ─── Raw eth_call proxy ───────────────────────────────────────────────────────

router.post("/call", async (req, res) => {
  try {
    const { to, data } = req.body as { to?: string; data?: string };

    if (!to || !data) {
      res.status(400).json({ error: "Body must include 'to' (address) and 'data' (hex calldata)" });
      return;
    }
    if (!isValidAddress(to)) {
      res.status(400).json({ error: "Invalid 'to' address" });
      return;
    }
    if (!/^0x[0-9a-fA-F]*$/.test(data)) {
      res.status(400).json({ error: "Invalid 'data' — must be hex string starting with 0x" });
      return;
    }

    const result = await ethCall(to, data);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: toMsg(err) });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

function safeLimit(raw: unknown, defaultVal: number, max: number): number {
  const n = parseInt(String(raw ?? defaultVal), 10);
  if (!Number.isFinite(n) || n < 1) return defaultVal;
  return Math.min(n, max);
}

function toMsg(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

export default router;

/**
 * Blockchain API routes — SARA token via AWS Managed Blockchain.
 *
 * GET  /api/blockchain/token                 — token metadata
 * GET  /api/blockchain/balance/:address      — SARA balance for an address
 * GET  /api/blockchain/holders               — top SARA holders (paginated)
 * GET  /api/blockchain/transactions/:address — tx history for an address
 * POST /api/blockchain/rpc                   — SigV4-signed JSON-RPC proxy
 */

import { Router } from "express";
import {
  listSaraHolders,
  listTransactions,
  proxyJsonRpc,
  SEPOLIA_NETWORK,
  formatUnits,
  type JsonRpcRequest,
} from "../lib/awsBlockchain.js";

const router = Router();

// ─── Token metadata ───────────────────────────────────────────────────────────

router.get("/token", async (_req, res) => {
  try {
    const contractAddress = process.env.SARA_CONTRACT_ADDRESS;

    if (!contractAddress) {
      res.status(503).json({
        error: "SARA_CONTRACT_ADDRESS not configured",
        hint: "Deploy SaraToken.sol and set the env var",
      });
      return;
    }

    // Fetch totalSupply and maxSupply via JSON-RPC (eth_call)
    // Function selectors: totalSupply() = 0x18160ddd, MAX_SUPPLY() = 0xd5abeb01
    const [tsResponse, msResponse] = await Promise.allSettled([
      proxyJsonRpc({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{ to: contractAddress, data: "0x18160ddd" }, "latest"],
        id: 1,
      }),
      proxyJsonRpc({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{ to: contractAddress, data: "0xd5abeb01" }, "latest"],
        id: 2,
      }),
    ]);

    const toSafeHex = (hex: string | undefined) =>
      hex && hex.length > 2 ? hex : "0x0";

    const totalSupplyHex = tsResponse.status === "fulfilled" ? toSafeHex(tsResponse.value.result as string) : "0x0";
    const maxSupplyHex   = msResponse.status === "fulfilled" ? toSafeHex(msResponse.value.result as string) : "0x0";

    const totalSupplyWei = BigInt(totalSupplyHex);
    const maxSupplyWei   = BigInt(maxSupplyHex);
    const DECIMALS = 18n;
    const DIV = 10n ** DECIMALS;

    res.json({
      contractAddress,
      network: String(SEPOLIA_NETWORK),
      chainId: 11155111,
      name: "SRI Adaptive Response Asset",
      symbol: "SARA",
      decimals: 18,
      totalSupply: (totalSupplyWei / DIV).toString(),
      totalSupplyWei: totalSupplyWei.toString(),
      maxSupply: (maxSupplyWei / DIV).toString(),
      maxSupplyWei: maxSupplyWei.toString(),
      circulatingPct:
        maxSupplyWei > 0n
          ? Number((totalSupplyWei * 10000n) / maxSupplyWei) / 100
          : 0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

// ─── Balance by address ───────────────────────────────────────────────────────
// Uses eth_call directly (balanceOf selector 0x70a08231) instead of MBQ SDK,
// because MBQ only indexes tokens it has ingested — custom ERC-20s return 404.

router.get("/balance/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const contractAddress = process.env.SARA_CONTRACT_ADDRESS;

    if (!isValidAddress(address)) {
      res.status(400).json({ error: "Invalid Ethereum address" });
      return;
    }
    if (!contractAddress) {
      res.status(503).json({ error: "SARA_CONTRACT_ADDRESS not configured" });
      return;
    }

    // ABI-encode balanceOf(address): selector + address left-padded to 32 bytes
    const paddedAddr = address.slice(2).padStart(64, "0");
    const data = "0x70a08231" + paddedAddr;

    const response = await proxyJsonRpc({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{ to: contractAddress, data }, "latest"],
      id: 1,
    });

    if (response.error) {
      res.status(502).json({ error: response.error.message });
      return;
    }

    // eth_call returns "0x" (empty) when the contract doesn't exist at that address
    const resultHex = (response.result as string) || "0x0";
    const rawWei = BigInt(resultHex.length > 2 ? resultHex : "0x0");
    res.json({
      address,
      rawBalance: rawWei.toString(),
      formattedBalance: formatUnits(rawWei, 18),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

// ─── Voting power by address ──────────────────────────────────────────────────

router.get("/votes/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const contractAddress = process.env.SARA_CONTRACT_ADDRESS;

    if (!isValidAddress(address) || !contractAddress) {
      res.status(400).json({ error: "Invalid address or contract not configured" });
      return;
    }

    // getVotes(address) selector: 0x9ab24eb0 + padded address
    const paddedAddr = address.slice(2).padStart(64, "0");
    const data = "0x9ab24eb0" + paddedAddr;

    const response = await proxyJsonRpc({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{ to: contractAddress, data }, "latest"],
      id: 1,
    });

    const votesWei = BigInt((response.result as string) ?? "0x0");
    const DECIMALS = 18n;

    res.json({
      address,
      votingPower: (votesWei / 10n ** DECIMALS).toString(),
      votingPowerWei: votesWei.toString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

// ─── Token holders ────────────────────────────────────────────────────────────

router.get("/holders", async (req, res) => {
  try {
    const maxResults = safeLimit(req.query.limit, 20, 100);
    const holders = await listSaraHolders(maxResults);
    res.json({ holders, count: holders.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

// ─── Transaction history ──────────────────────────────────────────────────────

router.get("/transactions/:address", async (req, res) => {
  try {
    const { address } = req.params;

    if (!isValidAddress(address)) {
      res.status(400).json({ error: "Invalid Ethereum address" });
      return;
    }

    const maxResults = safeLimit(req.query.limit, 20, 100);
    const transactions = await listTransactions(address, maxResults);
    res.json({ address, transactions, count: transactions.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

// ─── Raw JSON-RPC proxy (server-side SigV4 signing) ──────────────────────────
//
// SECURITY NOTES:
//  • Only whitelisted read-only methods are forwarded — no state-changing calls.
//  • eth_getLogs is intentionally excluded to prevent broad unbounded queries
//    that could amplify AWS node costs.
//  • TODO: Add rate-limiting middleware (e.g. express-rate-limit) and API key
//    auth before exposing this in a public production environment.

const ALLOWED_RPC_METHODS = new Set([
  "eth_call",
  "eth_blockNumber",
  "eth_getBalance",
  "eth_getCode",
  "eth_getTransactionByHash",
  "eth_getTransactionReceipt",
  "eth_getBlockByNumber",
  "net_version",
]);

router.post("/rpc", async (req, res) => {
  try {
    const body = req.body as unknown;

    // Validate request shape before forwarding
    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as Record<string, unknown>).method !== "string" ||
      typeof (body as Record<string, unknown>).id !== "number" ||
      (body as Record<string, unknown>).jsonrpc !== "2.0" ||
      !Array.isArray((body as Record<string, unknown>).params)
    ) {
      res.status(400).json({
        error: "Invalid JSON-RPC body — must include jsonrpc:'2.0', method, id (number), params (array)",
      });
      return;
    }

    const rpcBody = body as JsonRpcRequest;

    if (!ALLOWED_RPC_METHODS.has(rpcBody.method)) {
      res.status(403).json({
        error: `Method "${rpcBody.method}" not allowed via proxy`,
        allowedMethods: [...ALLOWED_RPC_METHODS],
      });
      return;
    }

    const result = await proxyJsonRpc(rpcBody);

    // Normalize JSON-RPC error payloads into HTTP errors
    if (result.error) {
      res.status(502).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

/** Parse a query-string limit param: must be a positive integer, clamped to [1, max]. */
function safeLimit(raw: unknown, defaultVal: number, max: number): number {
  const n = parseInt(String(raw ?? defaultVal), 10);
  if (!Number.isFinite(n) || n < 1) return defaultVal;
  return Math.min(n, max);
}

export default router;

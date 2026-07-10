/**
 * AWS Managed Blockchain — Ethereum Sepolia client module.
 *
 * Two interaction modes:
 *  1. ManagedBlockchainQuery SDK  — high-level: token balances, tx history
 *  2. SigV4-signed JSON-RPC proxy — low-level: eth_call, contract reads
 *
 * All credentials are sourced from environment variables.
 * Required env vars:
 *   AWS_ACCESS_KEY_ID     (secret)
 *   AWS_SECRET_ACCESS_KEY (secret)
 *   AWS_REGION            (e.g. "us-east-1")
 *   AWS_BLOCKCHAIN_NODE_URL (e.g. "https://bn-ethereum-sepolia.*.managedblockchain.*.amazonaws.com")
 *   SARA_CONTRACT_ADDRESS (deployed ERC-20 address on Sepolia)
 */

import {
  ManagedBlockchainQueryClient,
  GetTokenBalanceCommand,
  ListTokenBalancesCommand,
  ListTransactionsCommand,
  QueryNetwork,
  type ListTransactionsCommandInput,
} from "@aws-sdk/client-managedblockchain-query";

// ─── AWS SDK client ─────────────────────────────────────────────────────────

function getQueryClient(): ManagedBlockchainQueryClient {
  const region = process.env.AWS_REGION ?? "us-east-1";
  return new ManagedBlockchainQueryClient({ region });
}

// ─── Network constants ───────────────────────────────────────────────────────

export const SEPOLIA_NETWORK = QueryNetwork.ETHEREUM_SEPOLIA_TESTNET;
export const SARA_TOKEN_STANDARD = "ERC20" as const;

function getContractAddress(): string {
  return process.env.SARA_CONTRACT_ADDRESS ?? "";
}

// ─── Type helpers ────────────────────────────────────────────────────────────

export interface TokenBalance {
  address: string;
  rawBalance: string;
  formattedBalance: string; // 18-decimal formatted
}

export interface TransactionSummary {
  transactionHash: string;
  transactionTimestamp: string;
  to?: string;
  from?: string;
  confirmationStatus?: string;
}

export interface TokenInfo {
  contractAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  maxSupply: string;
  network: string;
}

// ─── Query operations ─────────────────────────────────────────────────────────

/**
 * Get SARA token balance for a given wallet address.
 * Uses the AWS ManagedBlockchainQuery GetTokenBalance API.
 */
export async function getSaraBalance(walletAddress: string): Promise<TokenBalance> {
  const contractAddress = getContractAddress();
  if (!contractAddress) {
    throw new Error("SARA_CONTRACT_ADDRESS is not configured");
  }

  const client = getQueryClient();
  const command = new GetTokenBalanceCommand({
    tokenIdentifier: {
      network: SEPOLIA_NETWORK,
      contractAddress,
      tokenId: undefined, // ERC-20 does not use tokenId
    },
    ownerIdentifier: {
      address: walletAddress,
    },
  });

  const response = await client.send(command);
  const rawBalance = response.balance ?? "0";

  // Convert from wei string to human-readable (18 decimals)
  const formatted = formatUnits(BigInt(rawBalance), 18);

  return {
    address: walletAddress,
    rawBalance,
    formattedBalance: formatted,
  };
}

/**
 * List all addresses holding SARA tokens (paginated).
 * Uses ListTokenBalances — useful for holder dashboards.
 */
export async function listSaraHolders(maxResults = 10): Promise<TokenBalance[]> {
  const contractAddress = getContractAddress();
  if (!contractAddress) return [];

  const client = getQueryClient();
  const command = new ListTokenBalancesCommand({
    tokenFilter: {
      network: SEPOLIA_NETWORK,
      contractAddress,
    },
    maxResults,
  });

  const response = await client.send(command);
  const items = response.tokenBalances ?? [];

  return items.map((item) => {
    const raw = item.balance ?? "0";
    return {
      address: item.ownerIdentifier?.address ?? "unknown",
      rawBalance: raw,
      formattedBalance: formatUnits(BigInt(raw), 18),
    };
  });
}

/**
 * List recent transactions for a wallet address on Sepolia.
 */
export async function listTransactions(
  walletAddress: string,
  maxResults = 20
): Promise<TransactionSummary[]> {
  const client = getQueryClient();

  const input: ListTransactionsCommandInput = {
    address: walletAddress,
    network: SEPOLIA_NETWORK,
    maxResults,
    sort: {
      sortBy: "TRANSACTION_TIMESTAMP",
      sortOrder: "DESCENDING",
    },
  };

  const response = await client.send(new ListTransactionsCommand(input));
  const txns = response.transactions ?? [];

  return txns.map((tx) => ({
    transactionHash: tx.transactionHash ?? "",
    transactionTimestamp: tx.transactionTimestamp?.toISOString() ?? "",
    confirmationStatus: tx.confirmationStatus,
  }));
}

// ─── SigV4-signed JSON-RPC proxy ────────────────────────────────────────────
// Used for eth_call, eth_blockNumber, and other raw RPC methods on the node.

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params: unknown[];
  id: number;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

/**
 * Forward a JSON-RPC request to the AWS Managed Blockchain Ethereum node.
 * Signs the HTTP request with AWS SigV4 using the AWS SDK's built-in signing.
 */
export async function proxyJsonRpc(body: JsonRpcRequest): Promise<JsonRpcResponse> {
  const nodeUrl = process.env.AWS_BLOCKCHAIN_NODE_URL;
  if (!nodeUrl) {
    throw new Error("AWS_BLOCKCHAIN_NODE_URL is not configured");
  }

  const region = process.env.AWS_REGION ?? "us-east-1";
  const url = new URL(nodeUrl);

  // Use AWS SDK's request signer
  const { fromEnv } = await import("@aws-sdk/credential-providers");
  const { SignatureV4 } = await import("@smithy/signature-v4");
  const { Sha256 } = await import("@aws-crypto/sha256-js");

  const bodyStr = JSON.stringify(body);

  const signer = new SignatureV4({
    credentials: fromEnv(),
    region,
    service: "managedblockchain",
    sha256: Sha256,
  });

  const request = {
    method: "POST",
    hostname: url.hostname,
    path: url.pathname || "/",
    protocol: "https:",
    headers: {
      "Content-Type": "application/json",
      "host": url.hostname,
    },
    body: bodyStr,
  };

  const signed = await signer.sign(request);

  const response = await fetch(nodeUrl, {
    method: "POST",
    headers: signed.headers as Record<string, string>,
    body: bodyStr,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AWS node returned ${response.status}: ${text}`);
  }

  return response.json() as Promise<JsonRpcResponse>;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

export function formatUnits(value: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const intPart = value / divisor;
  const fracPart = value % divisor;
  if (fracPart === 0n) return intPart.toString();
  const fracStr = fracPart.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${intPart}.${fracStr}`;
}

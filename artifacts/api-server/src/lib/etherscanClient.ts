/**
 * Etherscan API v2 client — Sepolia testnet.
 *
 * Replaces AWS Managed Blockchain as the primary data source for SARA token
 * reads. Uses the official Etherscan v2 API (chainid=11155111).
 *
 * Required env var:
 *   ETHERSCAN_API_KEY  — from etherscan.io/myapikey
 *   SARA_CONTRACT_ADDRESS — deployed ERC-20 on Sepolia
 */

const BASE = "https://api.etherscan.io/v2/api";
const CHAIN = "11155111"; // Ethereum Sepolia

function apiKey(): string {
  return process.env.ETHERSCAN_API_KEY ?? "";
}

function contractAddress(): string {
  return process.env.SARA_CONTRACT_ADDRESS ?? "";
}

/** Low-level fetch wrapper with error handling */
async function escan(params: Record<string, string>): Promise<unknown> {
  const qs = new URLSearchParams({
    chainid: CHAIN,
    apikey: apiKey(),
    ...params,
  });

  const url = `${BASE}?${qs.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Etherscan HTTP ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { status: string; message: string; result: unknown };

  if (json.status === "0") {
    // "No transactions found" is a normal empty result, not an error
    if (
      typeof json.result === "string" &&
      (json.result.toLowerCase().includes("no transactions") ||
        json.result.toLowerCase().includes("no records"))
    ) {
      return [];
    }
    throw new Error(`Etherscan error: ${json.message} — ${json.result}`);
  }

  return json.result;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TokenInfo {
  contractAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;         // human-readable (18 dec)
  totalSupplyWei: string;
  maxSupply: string;
  maxSupplyWei: string;
  circulatingPct: number;
  network: string;
  chainId: number;
  etherscanUrl: string;
}

export interface TokenBalance {
  address: string;
  rawBalance: string;          // wei string
  formattedBalance: string;    // human-readable
}

export interface TokenTransfer {
  hash: string;
  blockNumber: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;               // wei string
  formattedValue: string;
  tokenName: string;
  tokenSymbol: string;
  confirmations: string;
}

export interface EtherscanTokenInfo {
  contractAddress: string;
  tokenName: string;
  symbol: string;
  divisor: string;
  tokenType: string;
  totalSupply: string;
  blueCheckmark: string;
  description: string;
  website: string;
  holdersCount: string;
}

// ─── Token metadata ──────────────────────────────────────────────────────────

/**
 * Get full SARA token info: combines tokeninfo (name/symbol/holders)
 * with eth_call reads for totalSupply and MAX_SUPPLY.
 */
export async function getSaraTokenInfo(): Promise<TokenInfo> {
  const contract = contractAddress();
  if (!contract) throw new Error("SARA_CONTRACT_ADDRESS not configured");

  // Fetch on-chain supply figures via eth_call proxy
  const [tsResult, msResult, tokenInfoResult] = await Promise.allSettled([
    escan({ module: "proxy", action: "eth_call",
      to: contract, data: "0x18160ddd", tag: "latest" }),           // totalSupply()
    escan({ module: "proxy", action: "eth_call",
      to: contract, data: "0xd5abeb01", tag: "latest" }),           // MAX_SUPPLY()
    escan({ module: "token", action: "tokeninfo",
      contractaddress: contract }),
  ]);

  const tsHex  = tsResult.status === "fulfilled" ? String(tsResult.value ?? "0x0") : "0x0";
  const msHex  = msResult.status === "fulfilled" ? String(msResult.value ?? "0x0") : "0x0";
  const tokenData = tokenInfoResult.status === "fulfilled"
    ? (tokenInfoResult.value as EtherscanTokenInfo[])?.[0] ?? null
    : null;

  const totalSupplyWei = BigInt(tsHex.length > 2 ? tsHex : "0x0");
  const maxSupplyWei   = BigInt(msHex.length > 2 ? msHex : "0x0");
  const DIV = 10n ** 18n;

  return {
    contractAddress: contract,
    name:    tokenData?.tokenName   ?? "SRI Adaptive Response Asset",
    symbol:  tokenData?.symbol      ?? "SARA",
    decimals: 18,
    totalSupply:    formatUnits(totalSupplyWei, 18),
    totalSupplyWei: totalSupplyWei.toString(),
    maxSupply:    maxSupplyWei > 0n ? formatUnits(maxSupplyWei, 18) : "100000000",
    maxSupplyWei: maxSupplyWei > 0n ? maxSupplyWei.toString() : (100_000_000n * DIV).toString(),
    circulatingPct: maxSupplyWei > 0n
      ? Number((totalSupplyWei * 10000n) / maxSupplyWei) / 100
      : 0,
    network: "Ethereum Sepolia",
    chainId: 11155111,
    etherscanUrl: `https://sepolia.etherscan.io/token/${contract}`,
  };
}

// ─── Balance ─────────────────────────────────────────────────────────────────

/**
 * Get SARA token balance for a wallet address.
 * Uses Etherscan account/tokenbalance (reads latest confirmed block).
 */
export async function getSaraBalance(walletAddress: string): Promise<TokenBalance> {
  const contract = contractAddress();
  if (!contract) throw new Error("SARA_CONTRACT_ADDRESS not configured");

  const rawBalance = String(
    await escan({
      module: "account",
      action: "tokenbalance",
      contractaddress: contract,
      address: walletAddress,
      tag: "latest",
    })
  );

  return {
    address: walletAddress,
    rawBalance,
    formattedBalance: formatUnits(BigInt(rawBalance), 18),
  };
}

// ─── Voting power ─────────────────────────────────────────────────────────────

/**
 * Get ERC-20Votes voting power (delegates) for an address via eth_call.
 * getVotes(address) selector: 0x9ab24eb0
 */
export async function getVotingPower(walletAddress: string): Promise<TokenBalance> {
  const contract = contractAddress();
  if (!contract) throw new Error("SARA_CONTRACT_ADDRESS not configured");

  const paddedAddr = walletAddress.slice(2).padStart(64, "0");
  const data = "0x9ab24eb0" + paddedAddr;

  const resultHex = String(
    await escan({ module: "proxy", action: "eth_call", to: contract, data, tag: "latest" })
  );
  const votesWei = BigInt(resultHex.length > 2 ? resultHex : "0x0");

  return {
    address: walletAddress,
    rawBalance: votesWei.toString(),
    formattedBalance: formatUnits(votesWei, 18),
  };
}

// ─── Token transfer history ───────────────────────────────────────────────────

/**
 * List ERC-20 transfer events for a wallet address (newest first).
 */
export async function listTokenTransfers(
  walletAddress: string,
  limit = 20
): Promise<TokenTransfer[]> {
  const contract = contractAddress();
  if (!contract) return [];

  const raw = await escan({
    module: "account",
    action: "tokentx",
    contractaddress: contract,
    address: walletAddress,
    startblock: "0",
    endblock: "99999999",
    page: "1",
    offset: String(Math.min(limit, 100)),
    sort: "desc",
  });

  const items = Array.isArray(raw) ? raw : [];
  return items.map((tx: Record<string, string>) => ({
    hash:           tx.hash ?? "",
    blockNumber:    tx.blockNumber ?? "",
    timeStamp:      tx.timeStamp ?? "",
    from:           tx.from ?? "",
    to:             tx.to ?? "",
    value:          tx.value ?? "0",
    formattedValue: formatUnits(BigInt(tx.value ?? "0"), 18),
    tokenName:      tx.tokenName ?? "SARA",
    tokenSymbol:    tx.tokenSymbol ?? "SARA",
    confirmations:  tx.confirmations ?? "0",
  }));
}

// ─── Top holders ─────────────────────────────────────────────────────────────

/**
 * List top SARA token holders via Etherscan token/tokenholderlist.
 * Note: requires a Pro API key for large results; returns up to 10 for free.
 */
export async function listSaraHolders(limit = 10): Promise<TokenBalance[]> {
  const contract = contractAddress();
  if (!contract) return [];

  try {
    const raw = await escan({
      module: "token",
      action: "tokenholderlist",
      contractaddress: contract,
      page: "1",
      offset: String(Math.min(limit, 10)),
    });

    const items = Array.isArray(raw) ? raw : [];
    return items.map((h: Record<string, string>) => ({
      address: h.TokenHolderAddress ?? h.address ?? "",
      rawBalance: h.TokenHolderQuantity ?? "0",
      formattedBalance: formatUnits(BigInt(h.TokenHolderQuantity ?? "0"), 18),
    }));
  } catch {
    // tokenholderlist may require Pro key — return empty gracefully
    return [];
  }
}

// ─── ABI fetch ───────────────────────────────────────────────────────────────

/**
 * Fetch the verified contract ABI from Etherscan.
 * Returns null if the contract is not verified.
 */
export async function getContractAbi(): Promise<unknown[] | null> {
  const contract = contractAddress();
  if (!contract) return null;

  try {
    const abi = await escan({
      module: "contract",
      action: "getabi",
      address: contract,
    });
    return JSON.parse(String(abi)) as unknown[];
  } catch {
    return null;
  }
}

// ─── Contract verification status ────────────────────────────────────────────

export interface VerificationStatus {
  verified: boolean;
  contractName: string;
  compilerVersion: string;
  optimizationUsed: boolean;
  runs: number;
  sourceCodeLength: number;
}

export async function getVerificationStatus(): Promise<VerificationStatus> {
  const contract = contractAddress();
  if (!contract) {
    return { verified: false, contractName: "", compilerVersion: "", optimizationUsed: false, runs: 0, sourceCodeLength: 0 };
  }

  try {
    const raw = await escan({ module: "contract", action: "getsourcecode", address: contract });
    const items = Array.isArray(raw) ? raw : [raw];
    const r = items[0] as Record<string, string>;

    return {
      verified:         r.ABI !== "Contract source code not verified",
      contractName:     r.ContractName ?? "",
      compilerVersion:  r.CompilerVersion ?? "",
      optimizationUsed: r.OptimizationUsed === "1",
      runs:             parseInt(r.Runs ?? "0", 10) || 0,
      sourceCodeLength: (r.SourceCode ?? "").length,
    };
  } catch {
    return { verified: false, contractName: "", compilerVersion: "", optimizationUsed: false, runs: 0, sourceCodeLength: 0 };
  }
}

// ─── Raw eth_call proxy ───────────────────────────────────────────────────────

/**
 * Proxy any eth_call through the Etherscan API.
 * Useful for one-off contract reads.
 */
export async function ethCall(to: string, data: string): Promise<string> {
  const result = await escan({ module: "proxy", action: "eth_call", to, data, tag: "latest" });
  return String(result ?? "0x");
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

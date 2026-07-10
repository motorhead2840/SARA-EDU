/**
 * SARA Token — frontend contract interface.
 * Uses ethers v6 + MetaMask (window.ethereum) for wallet interaction.
 * Uses the API server for AWS-backed read operations when wallet is not connected.
 */

// ─── ABI (human-readable, ethers v6) ─────────────────────────────────────────

export const SARA_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function getVotes(address account) view returns (uint256)",
  "function delegate(address delegatee)",
  "function delegates(address account) view returns (address)",
  "function getPastVotes(address account, uint256 blockNumber) view returns (uint256)",
  "function burn(uint256 amount)",
  "function owner() view returns (address)",
  "function MAX_SUPPLY() view returns (uint256)",
  "function GENESIS_ALLOC() view returns (uint256)",
  "function TREASURY_ALLOC() view returns (uint256)",
  "function ECOSYSTEM_ALLOC() view returns (uint256)",
  "function TEAM_ALLOC() view returns (uint256)",
  "function COMMUNITY_ALLOC() view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate)",
  "event TokensMinted(address indexed to, uint256 amount, string reason)",
] as const;

// ─── Network config ───────────────────────────────────────────────────────────

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

export const SEPOLIA_NETWORK_PARAMS = {
  chainId: SEPOLIA_CHAIN_ID_HEX,
  chainName: "Sepolia Testnet",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://rpc.sepolia.org"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
} as const;

/** Contract address — set via VITE_SARA_CONTRACT_ADDRESS after deployment */
export const SARA_CONTRACT_ADDRESS: string =
  import.meta.env.VITE_SARA_CONTRACT_ADDRESS ?? "";

// ─── API base URL ─────────────────────────────────────────────────────────────

export const API_BASE = (import.meta.env.VITE_API_URL as string) ?? "";

// ─── Token economy metadata (static, matches contract constants) ──────────────

export const TOKEN_ECONOMY = {
  maxSupply:  100_000_000,
  tranches: [
    { label: "Treasury (DAO)",    tokens: 40_000_000, pct: 40, color: "#7C3AED" },
    { label: "Ecosystem Grants",  tokens: 25_000_000, pct: 25, color: "#3B82F6" },
    { label: "Team & Advisors",   tokens: 15_000_000, pct: 15, color: "#F59E0B" },
    { label: "Community Rewards", tokens: 10_000_000, pct: 10, color: "#10B981" },
    { label: "Genesis Mint",      tokens: 10_000_000, pct: 10, color: "#6B7280" },
  ],
} as const;

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatSara(wei: bigint, decimals = 4): string {
  const divisor = 10n ** 18n;
  const whole = wei / divisor;
  const frac = wei % divisor;
  if (frac === 0n) return Number(whole).toLocaleString();
  const fracStr = frac.toString().padStart(18, "0").slice(0, decimals);
  return `${Number(whole).toLocaleString()}.${fracStr}`;
}

export function shortenAddress(addr: string, chars = 4): string {
  return `${addr.slice(0, chars + 2)}…${addr.slice(-chars)}`;
}

// ─── API helpers (server-backed AWS queries) ──────────────────────────────────

export async function fetchTokenInfo() {
  const url = `${API_BASE}/blockchain/token`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Token info fetch failed: ${res.status}`);
  return res.json() as Promise<{
    contractAddress: string;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
    maxSupply: string;
    circulatingPct: number;
  }>;
}

export async function fetchBalance(address: string) {
  const url = `${API_BASE}/blockchain/balance/${address}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Balance fetch failed: ${res.status}`);
  return res.json() as Promise<{
    address: string;
    rawBalance: string;
    formattedBalance: string;
  }>;
}

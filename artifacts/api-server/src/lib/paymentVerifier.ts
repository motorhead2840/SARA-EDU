/**
 * On-chain payment verification for crypto subscription payments.
 *
 * - ETH   : Etherscan API (configurable chain)
 * - USDC  : Etherscan ERC-20 tokentx (mainnet USDC contract)
 * - SARA  : Etherscan ERC-20 tokentx (Sepolia, SARA contract)
 * - BTC   : blockstream.info public API (no key required)
 *
 * Required env vars:
 *   CRYPTO_ETH_WALLET      — Ethereum address that receives ETH/USDC/SARA
 *   CRYPTO_BTC_WALLET      — Bitcoin address that receives BTC
 *   ETHERSCAN_API_KEY      — for ETH/USDC/SARA verification
 *   SARA_CONTRACT_ADDRESS  — SARA ERC-20 contract on Sepolia
 *   PAYMENT_NETWORK        — "mainnet" (default) or "sepolia" for ETH/USDC
 */

import type { CryptoCurrency } from './coinGecko.js';

const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api';

// Chain IDs
const ETH_CHAIN    = () => process.env.PAYMENT_NETWORK === 'sepolia' ? '11155111' : '1';
const SARA_CHAIN   = '11155111'; // SARA stays on Sepolia

// USDC contract addresses
const USDC_MAINNET = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDC_SEPOLIA = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const USDC_CONTRACT = () =>
  process.env.PAYMENT_NETWORK === 'sepolia' ? USDC_SEPOLIA : USDC_MAINNET;

const USDC_DECIMALS = 6;
const ETH_DECIMALS  = 18;

function ethWallet(): string { return process.env.CRYPTO_ETH_WALLET ?? ''; }
function btcWallet(): string { return process.env.CRYPTO_BTC_WALLET ?? ''; }
function etherscanKey(): string { return process.env.ETHERSCAN_API_KEY ?? ''; }

// ─── ETH/USDC/SARA via Etherscan ─────────────────────────────────────────────

async function etherscanFetch(params: Record<string, string>, chainId: string): Promise<unknown> {
  const qs = new URLSearchParams({ chainid: chainId, apikey: etherscanKey(), ...params });
  const res = await fetch(`${ETHERSCAN_BASE}?${qs}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`);
  const json = await res.json() as { status: string; result: unknown };
  if (json.status === '0') return [];
  return json.result;
}

function fromWei(value: string, decimals: number): number {
  return parseInt(value, 10) / Math.pow(10, decimals);
}

/** Check for an incoming ETH transfer ≥ expectedEth after createdAt */
async function verifyEth(expectedEth: number, createdAtMs: number): Promise<string | null> {
  const wallet = ethWallet();
  if (!wallet) return null;

  const txs = await etherscanFetch({
    module: 'account', action: 'txlist',
    address: wallet,
    startblock: '0', endblock: '99999999',
    page: '1', offset: '50', sort: 'desc',
  }, ETH_CHAIN()) as Array<Record<string, string>>;

  if (!Array.isArray(txs)) return null;

  for (const tx of txs) {
    const ts = parseInt(tx.timeStamp ?? '0', 10) * 1000;
    if (ts < createdAtMs) break; // Sorted desc — stop once older than payment
    if (tx.to?.toLowerCase() !== wallet.toLowerCase()) continue;
    if (tx.isError === '1') continue;
    const received = fromWei(tx.value ?? '0', ETH_DECIMALS);
    // Accept if within 5% tolerance (covers gas/rounding)
    if (received >= expectedEth * 0.95) return tx.hash ?? null;
  }
  return null;
}

/** Check for an incoming USDC ERC-20 transfer ≥ expectedUsdc after createdAt */
async function verifyUsdc(expectedUsdc: number, createdAtMs: number): Promise<string | null> {
  const wallet = ethWallet();
  if (!wallet) return null;

  const txs = await etherscanFetch({
    module: 'account', action: 'tokentx',
    contractaddress: USDC_CONTRACT(),
    address: wallet,
    startblock: '0', endblock: '99999999',
    page: '1', offset: '50', sort: 'desc',
  }, ETH_CHAIN()) as Array<Record<string, string>>;

  if (!Array.isArray(txs)) return null;

  for (const tx of txs) {
    const ts = parseInt(tx.timeStamp ?? '0', 10) * 1000;
    if (ts < createdAtMs) break;
    if (tx.to?.toLowerCase() !== wallet.toLowerCase()) continue;
    const received = fromWei(tx.value ?? '0', USDC_DECIMALS);
    if (received >= expectedUsdc * 0.95) return tx.hash ?? null;
  }
  return null;
}

/** Check for an incoming SARA ERC-20 transfer ≥ expectedSara after createdAt */
async function verifySara(expectedSara: number, createdAtMs: number): Promise<string | null> {
  const wallet = ethWallet();
  const contract = process.env.SARA_CONTRACT_ADDRESS ?? '';
  if (!wallet || !contract) return null;

  const txs = await etherscanFetch({
    module: 'account', action: 'tokentx',
    contractaddress: contract,
    address: wallet,
    startblock: '0', endblock: '99999999',
    page: '1', offset: '50', sort: 'desc',
  }, SARA_CHAIN) as Array<Record<string, string>>;

  if (!Array.isArray(txs)) return null;

  for (const tx of txs) {
    const ts = parseInt(tx.timeStamp ?? '0', 10) * 1000;
    if (ts < createdAtMs) break;
    if (tx.to?.toLowerCase() !== wallet.toLowerCase()) continue;
    const received = fromWei(tx.value ?? '0', ETH_DECIMALS); // SARA has 18 decimals
    if (received >= expectedSara * 0.95) return tx.hash ?? null;
  }
  return null;
}

// ─── BTC via blockstream.info ─────────────────────────────────────────────────

interface BlockstreamTx {
  txid: string;
  status: { confirmed: boolean; block_time?: number };
  vout: Array<{ scriptpubkey_address?: string; value: number }>; // value in satoshis
}

/** Check for an incoming BTC transfer ≥ expectedBtc after createdAt */
async function verifyBtc(expectedBtc: number, createdAtMs: number): Promise<string | null> {
  const wallet = btcWallet();
  if (!wallet) return null;

  const network = process.env.PAYMENT_NETWORK === 'sepolia' ? 'testnet/' : '';
  const url = `https://blockstream.info/${network}api/address/${wallet}/txs`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const txs = await res.json() as BlockstreamTx[];

  for (const tx of txs) {
    const ts = (tx.status.block_time ?? 0) * 1000;
    if (ts > 0 && ts < createdAtMs) continue; // Confirmed but before payment creation
    // Find output to our wallet
    for (const vout of tx.vout) {
      if (vout.scriptpubkey_address !== wallet) continue;
      const receivedBtc = vout.value / 1e8;
      if (receivedBtc >= expectedBtc * 0.95) return tx.txid;
    }
  }
  return null;
}

// ─── Public interface ─────────────────────────────────────────────────────────

export interface VerifyResult {
  confirmed: boolean;
  txHash: string | null;
}

/**
 * Verify whether a crypto payment has been received on-chain.
 * Returns { confirmed: true, txHash } on success.
 */
export async function verifyPayment(opts: {
  currency: CryptoCurrency;
  cryptoAmount: string;  // exact expected amount (string for precision)
  createdAt: Date;
}): Promise<VerifyResult> {
  const { currency, cryptoAmount, createdAt } = opts;
  const amount = parseFloat(cryptoAmount);
  const createdAtMs = createdAt.getTime();

  try {
    let txHash: string | null = null;
    if      (currency === 'eth')  txHash = await verifyEth(amount, createdAtMs);
    else if (currency === 'usdc') txHash = await verifyUsdc(amount, createdAtMs);
    else if (currency === 'sara') txHash = await verifySara(amount, createdAtMs);
    else if (currency === 'btc')  txHash = await verifyBtc(amount, createdAtMs);

    return { confirmed: txHash !== null, txHash };
  } catch {
    return { confirmed: false, txHash: null };
  }
}

/** Returns wallet address for the given currency */
export function walletAddress(currency: CryptoCurrency): string | null {
  if (currency === 'btc') return btcWallet() || null;
  return ethWallet() || null;
}

/** Network label for display */
export function networkLabel(currency: CryptoCurrency): string {
  const net = process.env.PAYMENT_NETWORK === 'sepolia' ? 'Sepolia Testnet' : 'Mainnet';
  if (currency === 'sara') return 'Ethereum Sepolia Testnet';
  if (currency === 'btc')  return 'Bitcoin';
  return `Ethereum ${net}`;
}

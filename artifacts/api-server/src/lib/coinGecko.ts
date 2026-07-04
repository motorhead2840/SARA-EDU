/**
 * CoinGecko free-tier price fetcher.
 * Caches results for 5 minutes to stay within rate limits.
 */

export type CryptoCurrency = 'eth' | 'usdc' | 'btc' | 'sara';

interface PriceCache {
  prices: Record<CryptoCurrency, number>;  // USD price per 1 unit of crypto
  fetchedAt: number;
}

let cache: PriceCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

const COINGECKO_IDS: Record<Exclude<CryptoCurrency, 'sara'>, string> = {
  eth:  'ethereum',
  usdc: 'usd-coin',
  btc:  'bitcoin',
};

/**
 * Fetch live USD prices for all supported crypto currencies.
 * SARA uses env SARA_USD_PRICE (default $0.01) since it may not be on CoinGecko.
 */
export async function getCryptoPricesUsd(): Promise<Record<CryptoCurrency, number>> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache.prices;

  const saraPrice = parseFloat(process.env.SARA_USD_PRICE ?? '0.01');

  try {
    const ids = Object.values(COINGECKO_IDS).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

    const data = await res.json() as Record<string, { usd: number }>;

    const prices: Record<CryptoCurrency, number> = {
      eth:  data['ethereum']?.usd  ?? 3000,
      usdc: data['usd-coin']?.usd  ?? 1.00,
      btc:  data['bitcoin']?.usd   ?? 60000,
      sara: saraPrice,
    };

    cache = { prices, fetchedAt: now };
    return prices;
  } catch {
    // Return stale cache if available, otherwise fallback values
    if (cache) return cache.prices;
    return { eth: 3000, usdc: 1.00, btc: 60000, sara: saraPrice };
  }
}

/**
 * Convert a USD amount to crypto units, rounded to avoid dust.
 * Returns a string to preserve precision (e.g., "0.00823456").
 */
export function usdToCrypto(usdAmount: number, currency: CryptoCurrency, pricePerUnit: number): string {
  const raw = usdAmount / pricePerUnit;
  // Round to appropriate decimals per currency
  const decimals: Record<CryptoCurrency, number> = { eth: 6, usdc: 2, btc: 8, sara: 2 };
  return raw.toFixed(decimals[currency]);
}

/**
 * Add a tiny unique offset (0.000001–0.000099 ETH equivalent scale) to the
 * crypto amount so we can loosely identify which incoming tx corresponds to
 * this payment without needing a memo field.
 */
export function addUniqueOffset(amount: string, currency: CryptoCurrency): string {
  const offsets: Record<CryptoCurrency, number> = {
    eth:  0.000001,
    usdc: 0.01,
    btc:  0.000001,
    sara: 0.01,
  };
  const base = parseFloat(amount);
  const offset = offsets[currency] * Math.floor(Math.random() * 99 + 1); // 1–99x offset unit
  const decimals: Record<CryptoCurrency, number> = { eth: 6, usdc: 2, btc: 8, sara: 2 };
  return (base + offset).toFixed(decimals[currency]);
}

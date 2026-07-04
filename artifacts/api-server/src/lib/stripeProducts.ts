/**
 * Auto-provision the three GDP-tier Stripe products/prices on startup.
 * Idempotent: looks for existing products tagged with { sri_tier: '<tier>' }
 * before creating new ones.
 */

import { getUncachableStripeClient } from '../stripeClient.js';
import type { Tier } from './gdpTiers.js';
import { TIER_USD, tierLabel } from './gdpTiers.js';
import { logger } from './logger.js';

export type TierPriceMap = Record<Tier, string>; // tier → Stripe price ID

const TIERS: Tier[] = ['high', 'middle', 'low'];

export async function ensureSubscriptionProducts(): Promise<TierPriceMap> {
  const stripe = await getUncachableStripeClient();
  const map = {} as TierPriceMap;

  for (const tier of TIERS) {
    // Search for existing product tagged with this tier
    const existing = await stripe.products.search({
      query: `metadata['sri_tier']:'${tier}' AND active:'true'`,
      limit: 1,
    }).catch(() => ({ data: [] }));

    let productId: string;
    let priceId: string | null = null;

    if (existing.data.length > 0) {
      productId = existing.data[0].id;
      const expectedCents = Math.round(TIER_USD[tier] * 100);
      // Find active monthly price matching this tier's exact unit amount
      const prices = await stripe.prices.list({
        product: productId,
        active: true,
        limit: 10,
      }).catch(() => ({ data: [] }));
      const match = prices.data.find(
        (p) =>
          p.unit_amount === expectedCents &&
          p.recurring?.interval === 'month' &&
          p.currency === 'usd'
      );
      priceId = match?.id ?? null;
    } else {
      // Create product
      const product = await stripe.products.create({
        name: `SRI Global — ${tierLabel(tier)} Tier`,
        description:
          `Monthly subscription unlocking content and certification. ` +
          `Priced for ${tierLabel(tier).toLowerCase()}-income regions ($${TIER_USD[tier]}/mo).`,
        metadata: { sri_tier: tier, sri_source: 'global-subscription' },
      });
      productId = product.id;
      logger.info({ tier, productId }, 'Created Stripe subscription product');
    }

    if (!priceId) {
      // Create monthly price
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: Math.round(TIER_USD[tier] * 100), // cents
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: { sri_tier: tier },
      });
      priceId = price.id;
      logger.info({ tier, priceId }, 'Created Stripe subscription price');
    }

    map[tier] = priceId;
  }

  return map;
}

// Cached after first load
let _priceMap: TierPriceMap | null = null;

export async function getTierPriceMap(): Promise<TierPriceMap> {
  if (!_priceMap) _priceMap = await ensureSubscriptionProducts();
  return _priceMap;
}

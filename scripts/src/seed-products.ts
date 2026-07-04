/**
 * SRI Learn — Stripe product seed script.
 *
 * Creates the three subscription tiers if they don't already exist.
 * Run with:  pnpm --filter @workspace/scripts exec tsx src/seed-products.ts
 */

import { getUncachableStripeClient } from './stripeClient.js';

const PLANS = [
  {
    name: 'Scholar',
    description: 'Full course library, AI tutor, Knowledge Feed, Brag Sheet portfolio, and peer merit voting.',
    metadata: { tier: 'scholar', highlight: 'Most popular', cta: 'Start learning' },
    monthly_usd: 1900,   // $19.00
    yearly_usd:  17900,  // $179.00  (~21% off)
  },
  {
    name: 'Academic Pro',
    description: 'Everything in Scholar, plus Abhaya Gate AI safety tools, SARA token rewards, DAO governance voting, and priority support.',
    metadata: { tier: 'academic_pro', highlight: 'Best value', cta: 'Go pro' },
    monthly_usd: 3900,   // $39.00
    yearly_usd:  34900,  // $349.00  (~25% off)
  },
];

async function seed() {
  const stripe = await getUncachableStripeClient();
  console.log('🌱  Seeding Stripe products for SRI Learn…\n');

  for (const plan of PLANS) {
    // Idempotency: skip if already exists
    const existing = await stripe.products.search({
      query: `name:'${plan.name}' AND active:'true'`,
    });

    if (existing.data.length > 0) {
      const prod = existing.data[0];
      console.log(`✓ "${plan.name}" already exists (${prod.id}) — skipping.`);
      continue;
    }

    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: plan.metadata,
    });
    console.log(`✓ Created product "${plan.name}" → ${product.id}`);

    const monthly = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.monthly_usd,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { label: 'Monthly' },
    });
    console.log(`  ↳ Monthly  $${(plan.monthly_usd / 100).toFixed(2)}/mo  → ${monthly.id}`);

    const yearly = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.yearly_usd,
      currency: 'usd',
      recurring: { interval: 'year' },
      metadata: { label: 'Yearly' },
    });
    console.log(`  ↳ Yearly   $${(plan.yearly_usd / 100).toFixed(2)}/yr  → ${yearly.id}`);
  }

  console.log('\n🎉  Done! Webhooks will sync product data to your local database automatically.');
}

seed().catch((err) => { console.error(err); process.exit(1); });

/**
 * Database operations for subscription and crypto payments.
 * Uses the existing pg pool (raw SQL, matching project conventions).
 */

import { pool } from '../db.js';
import type { CryptoCurrency } from './coinGecko.js';
import type { Tier } from './gdpTiers.js';

// ─── Schema init ─────────────────────────────────────────────────────────────

export async function initSubscriptionSchema(): Promise<void> {
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS subscription_tier        TEXT
        CHECK (subscription_tier IN ('high','middle','low')),
      ADD COLUMN IF NOT EXISTS subscription_source      TEXT
        CHECK (subscription_source IN ('stripe','crypto')),
      ADD COLUMN IF NOT EXISTS subscription_expires_at  TIMESTAMPTZ;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crypto_payments (
      id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      email            TEXT NOT NULL,
      currency         TEXT NOT NULL
        CHECK (currency IN ('eth','usdc','btc','sara')),
      tier             TEXT NOT NULL
        CHECK (tier IN ('high','middle','low')),
      usd_price        NUMERIC(10,2) NOT NULL,
      crypto_amount    TEXT NOT NULL,
      wallet_address   TEXT NOT NULL,
      tx_hash          TEXT UNIQUE,           -- one tx can confirm at most one payment
      status           TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','confirmed','expired')),
      expires_at       TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 minutes',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Add UNIQUE constraint idempotently on existing tables (safe if already present)
  await pool.query(`
    DO $
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'crypto_payments_tx_hash_key'
           AND conrelid = 'crypto_payments'::regclass
      ) THEN
        ALTER TABLE crypto_payments ADD CONSTRAINT crypto_payments_tx_hash_key UNIQUE (tx_hash);
      END IF;
    END $;
  `).catch(() => {}); // Ignore if table/constraint already exists differently

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_crypto_payments_email
      ON crypto_payments (email);
    CREATE INDEX IF NOT EXISTS idx_crypto_payments_status
      ON crypto_payments (status, expires_at);
  `);
}

// ─── Crypto payments ─────────────────────────────────────────────────────────

export interface CryptoPayment {
  id: string;
  email: string;
  currency: CryptoCurrency;
  tier: Tier;
  usd_price: number;
  crypto_amount: string;
  wallet_address: string;
  tx_hash: string | null;
  status: 'pending' | 'confirmed' | 'expired';
  expires_at: Date;
  created_at: Date;
}

export async function createCryptoPayment(opts: {
  email: string;
  currency: CryptoCurrency;
  tier: Tier;
  usdPrice: number;
  cryptoAmount: string;
  walletAddress: string;
}): Promise<CryptoPayment> {
  const res = await pool.query<CryptoPayment>(`
    INSERT INTO crypto_payments
      (email, currency, tier, usd_price, crypto_amount, wallet_address)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *
  `, [opts.email, opts.currency, opts.tier, opts.usdPrice, opts.cryptoAmount, opts.walletAddress]);
  return res.rows[0];
}

export async function getCryptoPayment(id: string): Promise<CryptoPayment | null> {
  const res = await pool.query<CryptoPayment>(
    'SELECT * FROM crypto_payments WHERE id=$1', [id]
  );
  return res.rows[0] ?? null;
}

/**
 * Check whether a tx_hash is already claimed by another confirmed payment.
 * Prevents replay: one on-chain tx can only credit one subscription.
 */
export async function isTxHashClaimed(txHash: string): Promise<boolean> {
  const res = await pool.query(
    `SELECT 1 FROM crypto_payments WHERE tx_hash=$1 LIMIT 1`,
    [txHash]
  );
  return res.rowCount! > 0;
}

/**
 * Atomically confirm a crypto payment AND activate the subscription in one
 * DB transaction. Uses tx_hash UNIQUE constraint to prevent double-crediting.
 * Returns false if the tx was already claimed or the payment wasn't pending.
 */
export async function confirmPaymentAndActivate(opts: {
  paymentId: string;
  txHash: string;
  email: string;
  tier: Tier;
  days?: number;
}): Promise<boolean> {
  const { paymentId, txHash, email, tier, days = 30 } = opts;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Claim the tx_hash — fails with unique violation if already claimed
    const updateRes = await client.query(`
      UPDATE crypto_payments
         SET status='confirmed', tx_hash=$2, updated_at=NOW()
       WHERE id=$1 AND status='pending' AND expires_at > NOW()
      RETURNING id
    `, [paymentId, txHash]);

    if (updateRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return false; // Already confirmed, expired, or tx_hash collision
    }

    // Upsert user and activate subscription
    await client.query(`
      INSERT INTO users (id, email)
      VALUES (gen_random_uuid()::text, $1)
      ON CONFLICT (email) DO NOTHING
    `, [email]);

    await client.query(`
      UPDATE users
         SET subscription_tier       = $2,
             subscription_source     = 'crypto',
             subscription_expires_at = NOW() + INTERVAL '1 day' * $3,
             updated_at              = NOW()
       WHERE email = $1
    `, [email, tier, days]);

    await client.query('COMMIT');
    return true;
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    // Unique violation on tx_hash = already claimed
    if ((err as NodeJS.ErrnoException).code === '23505') return false;
    throw err;
  } finally {
    client.release();
  }
}

export async function expireOldPayments(): Promise<void> {
  await pool.query(`
    UPDATE crypto_payments
       SET status='expired', updated_at=NOW()
     WHERE status='pending' AND expires_at < NOW()
  `);
}

// ─── User subscription ────────────────────────────────────────────────────────

export interface SubscriptionStatus {
  active: boolean;
  tier: Tier | null;
  source: 'stripe' | 'crypto' | null;
  expires_at: Date | null;
  features: string[];
}

const FEATURES = ['content', 'certification'];

export async function getUserSubscription(email: string): Promise<SubscriptionStatus> {
  // Check Stripe subscription (via existing stripe schema)
  const stripeRes = await pool.query<{
    status: string; plan_name: string;
  }>(`
    SELECT s.status,
           CASE
             WHEN p.metadata->>'sri_tier' IS NOT NULL THEN p.metadata->>'sri_tier'
             ELSE 'high'
           END AS plan_name
      FROM users u
      JOIN stripe.subscriptions s ON s.id = u.stripe_subscription_id
      JOIN stripe.prices pr ON pr.id = ANY(
        SELECT (item->>'price')::text FROM jsonb_array_elements(s.items::jsonb) AS item
      )
      JOIN stripe.products p ON p.id = pr.product
     WHERE u.email = $1
     LIMIT 1
  `, [email]);

  if (stripeRes.rows.length > 0) {
    const row = stripeRes.rows[0];
    const active = row.status === 'active' || row.status === 'trialing';
    if (active) {
      return {
        active: true,
        tier: (row.plan_name as Tier) ?? 'high',
        source: 'stripe',
        expires_at: null, // Stripe manages renewal
        features: FEATURES,
      };
    }
  }

  // Check crypto subscription
  const userRes = await pool.query<{
    subscription_tier: Tier | null;
    subscription_source: 'stripe' | 'crypto' | null;
    subscription_expires_at: Date | null;
  }>(`
    SELECT subscription_tier, subscription_source, subscription_expires_at
      FROM users WHERE email=$1
  `, [email]);

  const u = userRes.rows[0];
  if (u?.subscription_tier && u.subscription_expires_at && u.subscription_expires_at > new Date()) {
    return {
      active: true,
      tier: u.subscription_tier,
      source: u.subscription_source ?? 'crypto',
      expires_at: u.subscription_expires_at,
      features: FEATURES,
    };
  }

  return { active: false, tier: null, source: null, expires_at: null, features: [] };
}

export async function activateCryptoSubscription(opts: {
  email: string;
  tier: Tier;
  days?: number;
}): Promise<void> {
  const { email, tier, days = 30 } = opts;

  // Upsert user (ensure row exists)
  await pool.query(`
    INSERT INTO users (id, email)
    VALUES (gen_random_uuid()::text, $1)
    ON CONFLICT (email) DO NOTHING
  `, [email]);

  await pool.query(`
    UPDATE users
       SET subscription_tier       = $2,
           subscription_source     = 'crypto',
           subscription_expires_at = NOW() + INTERVAL '1 day' * $3,
           updated_at              = NOW()
     WHERE email = $1
  `, [email, tier, days]);
}

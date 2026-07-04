/**
 * School mentor routes — mounted at /api/mentor
 *
 * Public (no auth):
 *   POST /register  — create mentor account (requires MENTOR_REGISTRATION_CODE)
 *   POST /login     — email + password → session token
 *
 * Protected (requireMentor middleware):
 *   GET  /metrics   — scholarship stats (read-only aggregates)
 *   GET  /me        — current mentor profile
 */

import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { pool } from '../db.js';
import { hashPassword, verifyPassword, signMentorToken } from '../lib/mentorAuth.js';
import { requireMentor } from '../middleware/requireMentor.js';
import { kafka } from '../lib/kafkaProducer.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function registrationCode(): string {
  return process.env.MENTOR_REGISTRATION_CODE ?? '';
}

// ─── POST /register ───────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  const { email, password, registration_code } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const code = registrationCode();
  if (!code) {
    return res.status(503).json({ error: 'Mentor registration is not enabled. Set MENTOR_REGISTRATION_CODE.' });
  }

  // Constant-time registration code comparison to prevent timing attacks
  const codeMatch = (() => {
    try {
      const a = Buffer.from(registration_code ?? '', 'utf8');
      const b = Buffer.from(code, 'utf8');
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  })();
  if (!codeMatch) {
    return res.status(403).json({ error: 'Invalid registration code' });
  }

  try {
    // Hash password before the DB query to keep timing consistent
    const { hash, salt } = await hashPassword(password);

    const existing = await pool.query(
      'SELECT role FROM users WHERE email=$1', [email]
    );

    if (existing.rows.length > 0) {
      // Never overwrite an existing account's role or credentials —
      // prevents privilege escalation via registration code reuse.
      // Return same generic error regardless of existing role (no enumeration).
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    await pool.query(`
      INSERT INTO users (id, email, role, password_hash, password_salt)
      VALUES (gen_random_uuid()::text, $1, 'school_mentor', $2, $3)
    `, [email, hash, salt]);

    const token = signMentorToken(email);
    res.status(201).json({ token, email, role: 'school_mentor', message: 'Mentor account created' });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', detail: String(err) });
  }
});

// ─── POST /login ──────────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const result = await pool.query<{
      role: string; password_hash: string | null; password_salt: string | null;
    }>('SELECT role, password_hash, password_salt FROM users WHERE email=$1', [email]);

    const user = result.rows[0];

    // Always run verifyPassword (even for non-existent users) to keep timing uniform.
    // This prevents enumeration via response-time differences.
    const DUMMY_HASH = 'a'.repeat(128);
    const DUMMY_SALT = 'b'.repeat(64);
    const ok = user?.role === 'school_mentor' && user.password_hash && user.password_salt
      ? await verifyPassword(password, user.password_hash, user.password_salt)
      : await verifyPassword(password, DUMMY_HASH, DUMMY_SALT).then(() => false);

    if (!ok) {
      // Single generic message — no account state, role, or existence revealed
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signMentorToken(email);
    res.json({ token, email, role: 'school_mentor' });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', detail: String(err) });
  }
});

// ─── GET /me ──────────────────────────────────────────────────────────────────

router.get('/me', requireMentor, (req, res) => {
  res.json({ email: res.locals.mentor!.email, role: 'school_mentor' });
});

// ─── GET /metrics ─────────────────────────────────────────────────────────────

router.get('/metrics', requireMentor, async (req, res) => {
  try {
    const [
      totalStudents,
      tierBreakdown,
      activeStripe,
      activeCrypto,
      recentCryptoPayments,
      stripeActiveByProduct,
    ] = await Promise.allSettled([
      // Total users by role
      pool.query<{ role: string; count: string }>(`
        SELECT COALESCE(role,'student') AS role, COUNT(*)::int AS count
          FROM users
         GROUP BY role
      `),

      // Subscription tier distribution
      pool.query<{ subscription_tier: string; count: string }>(`
        SELECT subscription_tier, COUNT(*)::int AS count
          FROM users
         WHERE subscription_tier IS NOT NULL
           AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW()
                OR subscription_source = 'stripe')
         GROUP BY subscription_tier
      `),

      // Active Stripe subscriptions
      pool.query<{ status: string; count: string }>(`
        SELECT status, COUNT(*)::int AS count
          FROM stripe.subscriptions
         WHERE status IN ('active','trialing')
         GROUP BY status
      `).catch(() => ({ rows: [] })),

      // Active crypto subscriptions
      pool.query<{ count: string }>(`
        SELECT COUNT(*)::int AS count
          FROM users
         WHERE subscription_source='crypto'
           AND subscription_expires_at > NOW()
      `),

      // Recent crypto payments (last 30 days)
      pool.query<{ currency: string; tier: string; count: string; total_usd: string }>(`
        SELECT currency, tier, COUNT(*)::int AS count,
               SUM(usd_price)::numeric(10,2) AS total_usd
          FROM crypto_payments
         WHERE status='confirmed'
           AND created_at > NOW() - INTERVAL '30 days'
         GROUP BY currency, tier
         ORDER BY count DESC
      `),

      // Stripe active subscriptions by product name (tier)
      pool.query<{ tier: string; count: string }>(`
        SELECT
          COALESCE(p.metadata->>'sri_tier', 'unknown') AS tier,
          COUNT(*)::int AS count
          FROM stripe.subscriptions s
          JOIN stripe.prices pr ON pr.id = ANY(
            SELECT (item->>'price')::text
              FROM jsonb_array_elements(s.items::jsonb) AS item
          )
          JOIN stripe.products p ON p.id = pr.product
         WHERE s.status IN ('active','trialing')
         GROUP BY tier
      `).catch(() => ({ rows: [] })),
    ]);

    const userCounts = totalStudents.status === 'fulfilled'
      ? Object.fromEntries(totalStudents.value.rows.map((r) => [r.role, r.count]))
      : {};

    const tierCounts = tierBreakdown.status === 'fulfilled'
      ? Object.fromEntries(tierBreakdown.value.rows.map((r) => [r.subscription_tier, r.count]))
      : {};

    const stripeActive = activeStripe.status === 'fulfilled'
      ? activeStripe.value.rows.reduce((acc, r) => acc + r.count, 0)
      : 0;

    const cryptoActive = activeCrypto.status === 'fulfilled'
      ? activeCrypto.value.rows[0]?.count ?? 0
      : 0;

    const stripeTiers = stripeActiveByProduct.status === 'fulfilled'
      ? Object.fromEntries(stripeActiveByProduct.value.rows.map((r) => [r.tier, r.count]))
      : {};

    const cryptoPayments = recentCryptoPayments.status === 'fulfilled'
      ? recentCryptoPayments.value.rows
      : [];

    const totalRevenueCrypto = cryptoPayments.reduce(
      (acc, r) => acc + parseFloat(String(r.total_usd)), 0
    );

    // Emit metrics-read audit event (fire-and-forget)
    void kafka.mentorMetricsRead({ mentor_email: res.locals.mentor!.email });

    res.json({
      generated_at: new Date().toISOString(),
      users: {
        total: Object.values(userCounts).reduce((a, b) => a + Number(b), 0),
        students: Number(userCounts['student'] ?? 0),
        mentors:  Number(userCounts['school_mentor'] ?? 0),
      },
      subscriptions: {
        active_total: stripeActive + Number(cryptoActive),
        via_stripe: stripeActive,
        via_crypto: Number(cryptoActive),
        by_tier: {
          high:   (Number(tierCounts['high'] ?? 0) + Number(stripeTiers['high'] ?? 0)),
          middle: (Number(tierCounts['middle'] ?? 0) + Number(stripeTiers['middle'] ?? 0)),
          low:    (Number(tierCounts['low'] ?? 0) + Number(stripeTiers['low'] ?? 0)),
        },
      },
      crypto_payments_30d: {
        total_transactions: cryptoPayments.reduce((a, r) => a + r.count, 0),
        total_usd_volume: Math.round(totalRevenueCrypto * 100) / 100,
        by_currency: Object.fromEntries(
          cryptoPayments.map((r) => [r.currency, { count: r.count, usd: r.total_usd }])
        ),
      },
      pricing_tiers: {
        high:   { label: 'Standard', usd_monthly: 29.99, description: 'High-income countries' },
        middle: { label: 'Regional', usd_monthly: 14.99, description: 'Middle-income countries' },
        low:    { label: 'Access',   usd_monthly:  4.99, description: 'Low-income countries' },
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch metrics', detail: String(err) });
  }
});

export default router;

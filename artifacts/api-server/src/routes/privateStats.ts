/**
 * Private Stats Route — Accessible only to @motorhead2840 (the user) and the Agent (you).
 *
 * GET /api/private-stats — Returns system-wide statistics (auth key required)
 */

import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { pool } from "../db.js";
import { getManifoldStatus, ABHAYA_PARAMS, SIGMOID_FORM_VERIFIED } from "../lib/abhayaGate.js";

const router = Router();

// Middleware to authenticate via custom header "x-private-stats-key"
function requireStatsAuth(req: any, res: any, next: any) {
  const configuredKey = process.env.SARA_PRIVATE_STATS_KEY;
  if (!configuredKey) {
    res.status(503).json({ error: "Private Stats API is not configured (missing SARA_PRIVATE_STATS_KEY on server)." });
    return;
  }

  const suppliedKey = req.headers["x-private-stats-key"];
  if (!suppliedKey) {
    res.status(401).json({ error: "Unauthorized. Missing stats key." });
    return;
  }

  const suppliedBuffer = Buffer.from(String(suppliedKey), "utf8");
  const configuredBuffer = Buffer.from(configuredKey, "utf8");

  const keyMatch = (() => {
    try {
      if (suppliedBuffer.length !== configuredBuffer.length) return false;
      return timingSafeEqual(suppliedBuffer, configuredBuffer);
    } catch {
      return false;
    }
  })();

  if (!keyMatch) {
    res.status(401).json({ error: "Unauthorized. Invalid stats key." });
    return;
  }

  next();
}

router.get("/", requireStatsAuth, async (_req, res) => {
  try {
    const [
      totalStudents,
      tierBreakdown,
      activeStripe,
      activeCrypto,
      recentCryptoPayments,
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
      `).catch(() => ({ rows: [] as any[] })),

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
    ]);

    const userCounts = totalStudents.status === 'fulfilled'
      ? Object.fromEntries(totalStudents.value.rows.map((r) => [r.role, r.count]))
      : {};

    const tierCounts = tierBreakdown.status === 'fulfilled'
      ? Object.fromEntries(tierBreakdown.value.rows.map((r) => [r.subscription_tier, r.count]))
      : {};

    const stripeActive = activeStripe.status === 'fulfilled'
      ? (activeStripe.value.rows as any[]).reduce((acc: number, r: any) => acc + Number(r.count), 0)
      : 0;

    const cryptoActive = activeCrypto.status === 'fulfilled'
      ? Number(activeCrypto.value.rows[0]?.count ?? 0)
      : 0;

    const cryptoPayments = recentCryptoPayments.status === 'fulfilled'
      ? recentCryptoPayments.value.rows
      : [];

    const totalRevenueCrypto = cryptoPayments.reduce(
      (acc, r) => acc + parseFloat(String(r.total_usd)), 0
    );

    // Abhaya Manifold status
    const abhayaStatus = getManifoldStatus();

    // System details
    const memory = process.memoryUsage();
    const system = {
      uptime_seconds: Math.floor(process.uptime()),
      node_version: process.version,
      memory: {
        rss_mb: Math.round(memory.rss / 1024 / 1024 * 100) / 100,
        heap_total_mb: Math.round(memory.heapTotal / 1024 / 1024 * 100) / 100,
        heap_used_mb: Math.round(memory.heapUsed / 1024 / 1024 * 100) / 100,
      },
    };

    res.json({
      success: true,
      generated_at: new Date().toISOString(),
      system,
      users: {
        total: Object.values(userCounts).reduce((a, b) => a + Number(b), 0),
        students: Number(userCounts['student'] ?? 0),
        mentors:  Number(userCounts['school_mentor'] ?? 0),
        admins: Number(userCounts['admin'] ?? 0),
      },
      subscriptions: {
        active_total: stripeActive + cryptoActive,
        via_stripe: stripeActive,
        via_crypto: cryptoActive,
        by_tier: {
          high: Number(tierCounts['high'] ?? 0),
          middle: Number(tierCounts['middle'] ?? 0),
          low: Number(tierCounts['low'] ?? 0),
        },
      },
      crypto_payments_30d: {
        total_transactions: cryptoPayments.reduce((a, r) => a + Number(r.count), 0),
        total_usd_volume: Math.round(totalRevenueCrypto * 100) / 100,
        by_currency: Object.fromEntries(
          cryptoPayments.map((r) => [r.currency, { count: r.count, usd: r.total_usd }])
        ),
      },
      abhaya: {
        gate: "ABHAYA_V3",
        version: "3.0",
        params: ABHAYA_PARAMS,
        manifold: {
          cycles: abhayaStatus.cycles,
          gradient_variance: abhayaStatus.gradient_variance,
          manifold_stability: abhayaStatus.manifold_stability,
          circuit_b_primed: abhayaStatus.circuit_b_primed,
          increasing_sigmoid_verified: SIGMOID_FORM_VERIFIED,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to compile private statistics", detail: String(err) });
  }
});

export default router;

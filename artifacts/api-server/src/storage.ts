import { pool } from './db.js';

export interface User {
  id: string;
  email: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: Date;
}

export class Storage {
  /** Find user by email, or null if not found. */
  async getUserByEmail(email: string): Promise<User | null> {
    const res = await pool.query<User>(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    return res.rows[0] ?? null;
  }

  /** Find user by Stripe customer ID. */
  async getUserByStripeCustomerId(customerId: string): Promise<User | null> {
    const res = await pool.query<User>(
      'SELECT * FROM users WHERE stripe_customer_id = $1 LIMIT 1',
      [customerId]
    );
    return res.rows[0] ?? null;
  }

  /** Upsert: create user if not exists, else return existing. */
  async upsertUser(email: string): Promise<User> {
    const res = await pool.query<User>(
      `INSERT INTO users (id, email)
       VALUES (gen_random_uuid()::text, $1)
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [email]
    );
    return res.rows[0];
  }

  /** Store Stripe customer ID on a user row. */
  async setStripeCustomerId(email: string, customerId: string): Promise<void> {
    await pool.query(
      'UPDATE users SET stripe_customer_id = $1, updated_at = NOW() WHERE email = $2',
      [customerId, email]
    );
  }

  /** Store Stripe subscription ID on a user row. */
  async setStripeSubscriptionId(customerId: string, subscriptionId: string): Promise<void> {
    await pool.query(
      'UPDATE users SET stripe_subscription_id = $1, updated_at = NOW() WHERE stripe_customer_id = $2',
      [subscriptionId, customerId]
    );
  }

  /** List all active products with their active prices (joined). */
  async listProductsWithPrices(): Promise<ProductWithPrices[]> {
    const res = await pool.query(`
      SELECT
        p.id              AS product_id,
        p.name            AS product_name,
        p.description     AS product_description,
        p.metadata        AS product_metadata,
        pr.id             AS price_id,
        pr.unit_amount    AS price_amount,
        pr.currency       AS price_currency,
        pr.recurring      AS price_recurring
      FROM stripe.products p
      LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
      WHERE p.active = true
      ORDER BY p.name, pr.unit_amount
    `);

    const map = new Map<string, ProductWithPrices>();
    for (const row of res.rows) {
      if (!map.has(row.product_id)) {
        map.set(row.product_id, {
          id: row.product_id,
          name: row.product_name,
          description: row.product_description,
          metadata: row.product_metadata ?? {},
          prices: [],
        });
      }
      if (row.price_id) {
        map.get(row.product_id)!.prices.push({
          id: row.price_id,
          unit_amount: row.price_amount,
          currency: row.price_currency,
          recurring: row.price_recurring,
        });
      }
    }
    return Array.from(map.values());
  }

  /** Get current subscription status for a user. */
  async getSubscriptionStatus(email: string): Promise<{ active: boolean; plan: string | null; status: string | null } > {
    const user = await this.getUserByEmail(email);
    if (!user?.stripe_subscription_id) return { active: false, plan: null, status: null };

    const res = await pool.query(`
      SELECT s.status, p.name AS plan_name
      FROM stripe.subscriptions s
      JOIN stripe.prices pr ON pr.id = ANY(
        SELECT (item->>'price')::text FROM jsonb_array_elements(s.items::jsonb) AS item
      )
      JOIN stripe.products p ON p.id = pr.product
      WHERE s.id = $1
      LIMIT 1
    `, [user.stripe_subscription_id]);

    const row = res.rows[0];
    if (!row) return { active: false, plan: null, status: null };

    return {
      active: row.status === 'active' || row.status === 'trialing',
      plan: row.plan_name,
      status: row.status,
    };
  }
}

export interface ProductWithPrices {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, string>;
  prices: Array<{
    id: string;
    unit_amount: number;
    currency: string;
    recurring: { interval: string; interval_count: number } | null;
  }>;
}

export const storage = new Storage();

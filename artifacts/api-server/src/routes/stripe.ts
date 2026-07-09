import { Router } from "express";
import { storage } from "../storage.js";
import { stripeService } from "../stripeService.js";

const router = Router();

/**
 * GET /api/stripe/products
 * Returns all active products with their prices (synced from Stripe → local DB).
 */
router.get("/products", async (_req, res) => {
  try {
    const products = await storage.listProductsWithPrices();
    res.json({ data: products });
  } catch (err) {
    res.status(500).json({ error: toMsg(err) });
  }
});

/**
 * POST /api/stripe/checkout
 * Body: { email, priceId }
 * Creates a Stripe Checkout session and returns { url } to redirect to.
 */
router.post("/checkout", async (req, res) => {
  try {
    const { email, priceId } = req.body as { email?: string; priceId?: string };

    if (!email || !isValidEmail(email)) {
      res.status(400).json({ error: "Valid email address is required" });
      return;
    }
    if (!priceId || typeof priceId !== "string") {
      res.status(400).json({ error: "priceId is required" });
      return;
    }

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const baseUrl = process.env.APP_URL || (domain ? `https://${domain}` : `${req.protocol}://${req.get("host")}`);
    const url = await stripeService.createCheckoutSession({
      email,
      priceId,
      successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/pricing`,
    });

    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: toMsg(err) });
  }
});

/**
 * POST /api/stripe/portal
 * Body: { email }
 * Creates a Stripe Billing Portal session for managing subscriptions.
 */
router.post("/portal", async (req, res) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email || !isValidEmail(email)) {
      res.status(400).json({ error: "Valid email address is required" });
      return;
    }

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const baseUrl = process.env.APP_URL || (domain ? `https://${domain}` : `${req.protocol}://${req.get("host")}`);
    const url = await stripeService.createPortalSession(email, `${baseUrl}/pricing`);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: toMsg(err) });
  }
});

/**
 * GET /api/stripe/status?email=...
 * Returns subscription status for a given email.
 */
router.get("/status", async (req, res) => {
  try {
    const email = req.query.email as string | undefined;
    if (!email || !isValidEmail(email)) {
      res.status(400).json({ error: "Valid email query param required" });
      return;
    }
    const status = await storage.getSubscriptionStatus(email);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: toMsg(err) });
  }
});

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function toMsg(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

export default router;

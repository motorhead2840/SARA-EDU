import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient.js";
import { initSubscriptionSchema } from "./lib/subscriptionDb.js";
import { ensureSubscriptionProducts } from "./lib/stripeProducts.js";
import app from "./app.js";
import { logger } from "./lib/logger.js";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set — skipping Stripe init");
    return;
  }
  try {
    logger.info("Initializing Stripe schema...");
    await runMigrations({ databaseUrl });
    logger.info("Stripe schema ready");

    const stripeSync = await getStripeSync();

    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
    logger.info("Stripe webhook configured");

    // Run backfill in background — don't block server startup
    stripeSync.syncBackfill()
      .then(() => logger.info("Stripe data synced"))
      .catch((err) => logger.error({ err }, "Stripe backfill error"));

    // Provision GDP-tier subscription products (idempotent)
    ensureSubscriptionProducts()
      .then(() => logger.info("Subscription products ready"))
      .catch((err) => logger.warn({ err }, "Subscription product setup failed (non-fatal)"));
  } catch (err) {
    logger.error({ err }, "Stripe init failed — payments will be unavailable");
    // Don't crash the server if Stripe fails — other routes still work
  }
}

async function initSubscription() {
  try {
    await initSubscriptionSchema();
    logger.info("Subscription schema ready");
  } catch (err) {
    logger.error({ err }, "Subscription schema init failed");
  }
}

await initSubscription();
await initStripe();

app.listen(port, (err) => {
  if (err) { logger.error({ err }, "Error listening"); process.exit(1); }
  logger.info({ port }, "Server listening");
});

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient.js";
import { initSubscriptionSchema } from "./lib/subscriptionDb.js";
import { initSecopsSchema } from "./lib/secopsDb.js";
import { initScholarshipSchema } from "./lib/scholarshipDb.js";
import { initAcademicSchema } from "./lib/academicDb.js";
import { seedAcademicData } from "./lib/academicSeed.js";
import { isSeeded } from "./lib/academicDb.js";
import { ensureSubscriptionProducts } from "./lib/stripeProducts.js";
import { initForumSchema } from "./lib/forumDb.js";
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

async function initSecops() {
  try {
    await initSecopsSchema();
    logger.info("SecOps schema ready");
  } catch (err) {
    logger.error({ err }, "SecOps schema init failed (non-fatal)");
  }
}
void initSecops();

async function initScholarship() {
  try {
    await initScholarshipSchema();
    logger.info("Scholarship schema ready");
  } catch (err) {
    logger.error({ err }, "Scholarship schema init failed (non-fatal)");
  }
}
void initScholarship();

async function initAcademic() {
  try {
    await initAcademicSchema();
    logger.info("Academic schema ready");
    const alreadySeeded = await isSeeded();
    if (!alreadySeeded) {
      await seedAcademicData();
      logger.info("Academic database seeded with OCW data");
    } else {
      logger.info("Academic database already seeded — skipping");
    }
  } catch (err) {
    logger.error({ err }, "Academic init failed (non-fatal)");
  }
}
void initAcademic();

async function initForum() {
  try {
    await initForumSchema();
    logger.info("Forum schema ready");
  } catch (err) {
    logger.error({ err }, "Forum schema init failed (non-fatal)");
  }
}
void initForum();

app.listen(port, (err) => {
  if (err) { logger.error({ err }, "Error listening"); process.exit(1); }
  logger.info({ port }, "Server listening");
});

// ── Python API sidecar ────────────────────────────────────────────────────────
// Spawn uvicorn as a child process so Replit's deployment only needs to detect
// ONE port (8080). Running it as a separate registered artifact service caused
// seccomp port-detection failures in production (subprocess bind() not visible
// to the artifact manager's seccomp filter).
(function startPythonApi() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // dist/ lives at <workspace>/artifacts/api-server/dist/ — 3 levels up = workspace root
  const apiDir = path.resolve(__dirname, "..", "..", "..", "shri-academy-api");
  // Use the absolute Nix python path — Node child_process doesn't inherit the shell PATH
  const pythonBin = "/home/runner/workspace/.pythonlibs/bin/python3";
  const uvicornArgs = [
    "-m", "uvicorn", "main:app",
    "--host", "0.0.0.0",
    "--port", "8001",
    // --reload only in dev; in production the file watcher wastes memory
    ...(process.env["NODE_ENV"] !== "production" ? ["--reload"] : []),
  ];

  logger.info({ apiDir }, "Starting Python API sidecar");

  const proc = spawn(pythonBin, uvicornArgs, {
    cwd: apiDir,
    stdio: "inherit",
    env: { ...process.env },
  });

  proc.on("error", (err) => {
    logger.error({ err }, "Python API sidecar failed to start");
  });

  proc.on("exit", (code, signal) => {
    logger.warn({ code, signal }, "Python API sidecar exited — restarting in 3s");
    setTimeout(startPythonApi, 3000);
  });

  // Graceful shutdown: kill sidecar when Node exits
  process.on("SIGTERM", () => proc.kill("SIGTERM"));
  process.on("SIGINT",  () => proc.kill("SIGTERM"));
}());

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations } from "stripe-sync";
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

    let webhookBaseUrl = process.env.WEBHOOK_BASE_URL;
    if (!webhookBaseUrl) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("WEBHOOK_BASE_URL environment variable is required in production");
      }
      webhookBaseUrl = `http://localhost:${port}`;
      logger.warn(`WEBHOOK_BASE_URL is not set. Falling back to development webhook base URL: ${webhookBaseUrl}`);
    }
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

const server = app.listen(port, (err) => {
  if (err) { logger.error({ err }, "Error listening"); process.exit(1); }
  logger.info({ port }, "Server listening");
});

// ── Python API sidecar ────────────────────────────────────────────────────────
// Spawns uvicorn so local development can run both services on a single entrypoint.
// Disabled in production (Docker/ECS) where Python runs as a separate container.
// Enable explicitly by setting PYTHON_SIDECAR_ENABLED=true in the runtime env.
if (process.env["PYTHON_SIDECAR_ENABLED"] === "true" || process.env["NODE_ENV"] !== "production") {
  (function initPythonSidecar() {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    // Configurable via env — default to standard "python3" and local relative path.
    const pythonBin = process.env["PYTHON_BIN"] ?? "python3";
    const apiDir = process.env["PY_API_DIR"]
      ?? path.resolve(__dirname, "..", "..", "..", "shri-academy-api");

    const uvicornArgs = [
      "-m", "uvicorn", "main:app",
      "--host", "0.0.0.0",
      "--port", "8001",
      ...(process.env["NODE_ENV"] !== "production" ? ["--reload"] : []),
    ];

    let isShuttingDown = false;
    let currentProc: ReturnType<typeof spawn> | null = null;
    let restartTimer: ReturnType<typeof setTimeout> | null = null;

    function startSidecar() {
      if (isShuttingDown) return;
      logger.info({ apiDir, pythonBin }, "Starting Python API sidecar");

      const proc = spawn(pythonBin, uvicornArgs, {
        cwd: apiDir,
        stdio: "inherit",
        env: { ...process.env },
      });
      currentProc = proc;

      proc.on("error", (spawnErr) => {
        logger.error({ err: spawnErr }, "Python API sidecar spawn error — retrying in 5s");
        currentProc = null;
        if (!isShuttingDown) {
          restartTimer = setTimeout(startSidecar, 5000);
        }
      });

      proc.on("exit", (code, signal) => {
        currentProc = null;
        if (isShuttingDown) return;
        logger.warn({ code, signal }, "Python API sidecar exited — restarting in 3s");
        restartTimer = setTimeout(startSidecar, 3000);
      });
    }

    // Graceful shutdown: stop restart loop, terminate child, close HTTP server.
    function gracefulShutdown(sig: string) {
      if (isShuttingDown) return;
      isShuttingDown = true;
      logger.info({ sig }, "Shutting down");

      if (restartTimer) clearTimeout(restartTimer);
      if (currentProc) currentProc.kill("SIGTERM");

      server.close(() => {
        logger.info("HTTP server closed — exiting");
        process.exit(0);
      });

      // Force-exit after 10s if HTTP server stalls
      setTimeout(() => {
        logger.warn("Forced exit after shutdown timeout");
        process.exit(1);
      }, 10_000).unref();
    }

    process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.once("SIGINT",  () => gracefulShutdown("SIGINT"));

    startSidecar();
  }());
}

/**
 * Shri Academy AI Mentor Proxy Routes
 * Forwards /api/shri/* → Python FastAPI at localhost:8000/shri-api/*
 *
 * TEXT + DRAWING ONLY — file/image/document uploads are explicitly forbidden.
 * Any attempt to send multipart data, base64 images, or binary content is
 * rejected at this layer before it ever reaches the Python backend.
 */
import { Router, Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

const router = Router();
const PYTHON_BASE = "http://localhost:8001/shri-api";

// ─── Data-URI / base64-blob pattern ──────────────────────────────────────────
// Catches: data:image/..., data:application/pdf, data:application/octet-stream
// and raw base64 blobs embedded in JSON strings (≥256 chars of base64 chars).
const DATA_URI_RE  = /data:[a-z]+\/[a-z0-9.+-]+;base64,/i;
const RAW_B64_RE   = /[A-Za-z0-9+/]{256,}={0,2}/;          // suspicious blob
const FILENAME_RE  = /\.(jpe?g|png|gif|webp|svg|pdf|docx?|xlsx?|pptx?|zip|tar|gz|mp4|mov|avi|mp3|wav)\b/i;

/**
 * Enforce text-only on every POST that goes to the AI mentor.
 * Rejects: multipart/form-data, any base64 image / document embedded in JSON,
 *          filenames in the payload, and bodies larger than 32 KB.
 */
function textOnlyGuard(req: Request, res: Response, next: NextFunction): void {
  // 1. Block multipart (file upload) Content-Type
  const ct = (req.headers["content-type"] ?? "").toLowerCase();
  if (ct.includes("multipart/form-data") || ct.includes("application/octet-stream")) {
    res.status(415).json({
      error: "Unsupported media type — text and drawing only. File uploads are not allowed.",
    });
    return;
  }

  // 2. Inspect the parsed JSON body for forbidden content
  const bodyStr = JSON.stringify(req.body ?? {});

  // 2a. data: URIs (embedded images / docs)
  if (DATA_URI_RE.test(bodyStr)) {
    res.status(422).json({
      error: "Image and document uploads are not allowed. Use the drawing pad for diagrams.",
    });
    return;
  }

  // 2b. Raw base64 blobs (e.g. someone encoding a file manually)
  if (RAW_B64_RE.test(bodyStr)) {
    res.status(422).json({
      error: "Binary or encoded file content is not allowed in the mentor chat.",
    });
    return;
  }

  // 2c. Filename-like strings (pdf/docx/jpeg etc.)
  if (FILENAME_RE.test(bodyStr)) {
    res.status(422).json({
      error: "File references are not allowed. Describe your question in text instead.",
    });
    return;
  }

  // 3. Hard body-size cap (belt-and-suspenders; express already has limit middleware)
  if (bodyStr.length > 32_768) {
    res.status(413).json({ error: "Message too large." });
    return;
  }

  next();
}

async function proxyGet(path: string) {
  const res = await fetch(`${PYTHON_BASE}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`Python backend error ${res.status}`), { status: res.status, body: text });
  }
  return res.json();
}

async function proxyPost(path: string, body: unknown) {
  const res = await fetch(`${PYTHON_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`Python backend error ${res.status}`), { status: res.status, body: text });
  }
  return res.json();
}

// GET /api/shri/health
router.get("/health", async (_req, res) => {
  try {
    const data = await proxyGet("/health");
    res.json(data);
  } catch (err) {
    logger.warn({ err }, "Shri health check failed");
    res.status(503).json({ error: "AI mentor backend unavailable" });
  }
});

// POST /api/shri/chat  — text + drawing pad only
router.post("/chat", textOnlyGuard, async (req, res) => {
  try {
    // Only forward the fields the Python model expects — drop everything else
    const { message, session_id } = req.body as Record<string, unknown>;
    const data = await proxyPost("/chat", { message, session_id });
    res.json(data);
  } catch (err: unknown) {
    logger.error({ err }, "Shri chat error");
    const e = err as { status?: number };
    res.status(e.status ?? 502).json({ error: "AI mentor unavailable" });
  }
});

// GET /api/shri/state
router.get("/state", async (req, res) => {
  try {
    const sessionId = req.query["session_id"] as string | undefined;
    const qs = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
    const data = await proxyGet(`/state${qs}`);
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Shri state error");
    res.status(502).json({ error: "AI mentor unavailable" });
  }
});

// POST /api/shri/reset
router.post("/reset", async (req, res) => {
  try {
    const data = await proxyPost("/reset", req.body);
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Shri reset error");
    res.status(502).json({ error: "AI mentor unavailable" });
  }
});

// POST /api/shri/research/mentor — text only; no image context
router.post("/research/mentor", textOnlyGuard, async (req, res) => {
  try {
    // Only forward the three text fields the Python model expects
    const { interest, user_email, background } = req.body as Record<string, unknown>;
    const data = await proxyPost("/research/mentor", { interest, user_email, background });
    res.json(data);
  } catch (err: unknown) {
    logger.error({ err }, "Research mentor error");
    const e = err as { status?: number };
    res.status(e.status ?? 502).json({ error: "Research mentor unavailable" });
  }
});

// GET /api/shri/research/search — academic course/topic search via Python
router.get("/research/search", async (req, res) => {
  try {
    const { q, discipline } = req.query as { q?: string; discipline?: string };
    const qs = new URLSearchParams();
    if (q)          qs.set("q", q);
    if (discipline) qs.set("discipline", discipline);
    const data = await proxyGet(`/research/search${qs.toString() ? `?${qs}` : ""}`);
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Research search error");
    res.status(502).json({ error: "Research search unavailable" });
  }
});

export default router;

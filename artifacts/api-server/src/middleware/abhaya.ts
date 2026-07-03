/**
 * Abhaya Gate — Express Safety Middleware
 *
 * Wraps any route with thermodynamic phase-cancellation safety screening.
 * Intercepts the response body, runs it through the V3.0 Abhaya Gate,
 * and injects stability telemetry headers.
 *
 * If the payload fails the stability threshold and the gate is in STRICT
 * mode, the response is replaced with a 451 (Unavailable for Legal Reasons)
 * style safety block. In MONITOR mode, telemetry is injected but the
 * payload passes through.
 *
 * Usage:
 *   router.post('/generate', abhayaMiddleware({ mode: 'strict' }), handler)
 *   router.post('/analyze',  abhayaMiddleware({ mode: 'monitor' }), handler)
 */

import { Request, Response, NextFunction } from "express";
import { analyzePayload, analyzeText, runAbhayaGate, AbhayaResult } from "../lib/abhayaGate.js";

export type AbhayaMode = "monitor" | "strict";

export interface AbhayaMiddlewareOptions {
  /** monitor = log + tag only; strict = block if Ξ < threshold */
  mode?: AbhayaMode;
  /** Override stability threshold (default 0.72) */
  stabilityThreshold?: number;
  /** Fields in request body to screen (default: entire body) */
  screenFields?: string[];
}

// ─── Telemetry header helpers ──────────────────────────────────────────────────

function setAbhayaHeaders(res: Response, result: AbhayaResult) {
  res.setHeader("X-Abhaya-Stability",       result.stability.toFixed(4));
  res.setHeader("X-Abhaya-Xi-Flux",         result.xi.toFixed(4));
  res.setHeader("X-Abhaya-Chi-V3",          result.chi_v3.toFixed(4));
  res.setHeader("X-Abhaya-Circuit-A",       result.circuit_a.toFixed(4));
  res.setHeader("X-Abhaya-Circuit-B",       result.circuit_b.toFixed(4));
  res.setHeader("X-Abhaya-Circuit-B-Active", String(result.circuit_b_active));
  res.setHeader("X-Abhaya-Phase-Cancelled", String(result.phase_cancelled));
  res.setHeader("X-Abhaya-Passed",          String(result.passed));
  res.setHeader("X-Abhaya-Damping-Ratio",   result.damping_ratio.toFixed(4));
}

// ─── Middleware factory ────────────────────────────────────────────────────────

export function abhayaMiddleware(options: AbhayaMiddlewareOptions = {}) {
  const {
    mode                = "monitor",
    stabilityThreshold  = 0.72,
    screenFields,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Extract the signal to screen from the request body
    let payload: unknown = req.body;

    if (screenFields && typeof req.body === "object" && req.body !== null) {
      const subset: Record<string, unknown> = {};
      for (const f of screenFields) {
        if (f in req.body) subset[f] = (req.body as Record<string, unknown>)[f];
      }
      payload = subset;
    }

    const result = analyzePayload(payload, stabilityThreshold);
    setAbhayaHeaders(res, result);

    // Attach result to request for use in downstream handlers
    (req as Request & { abhaya?: AbhayaResult }).abhaya = result;

    if (mode === "strict" && !result.passed) {
      res.status(422).json({
        error:      "Abhaya Gate: Phase-cancellation threshold not met",
        gate:       "ABHAYA_V3",
        stability:  result.stability,
        threshold:  stabilityThreshold,
        xi_flux:    result.xi,
        chi_v3:     result.chi_v3,
        circuit_b_active: result.circuit_b_active,
        message:    "Payload exhibits excessive ξ-flux (stochastic noise). Thermodynamic damping applied. Resubmit with reduced gradient variance.",
      });
      return;
    }

    next();
  };
}

// ─── Response-body screening middleware ───────────────────────────────────────
// Wraps res.json() to screen outgoing payloads before they leave the server.

export function abhayaResponseGuard(options: AbhayaMiddlewareOptions = {}) {
  const { mode = "monitor", stabilityThreshold = 0.72 } = options;

  return (_req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      const result = analyzePayload(body, stabilityThreshold);
      setAbhayaHeaders(res, result);

      if (mode === "strict" && !result.passed) {
        res.status(422);
        return originalJson({
          error:     "Abhaya Gate: Outgoing response blocked",
          gate:      "ABHAYA_V3",
          stability: result.stability,
          xi_flux:   result.xi,
        });
      }

      return originalJson(body);
    };

    next();
  };
}

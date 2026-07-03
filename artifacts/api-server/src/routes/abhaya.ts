/**
 * Abhaya Gate API Routes
 *
 * POST /api/abhaya/analyze        — run full Abhaya Gate analysis on a payload
 * POST /api/abhaya/analyze/text   — analyze a text string
 * POST /api/abhaya/stabilize      — apply phase cancellation and return stabilised signal
 * GET  /api/abhaya/status         — manifold telemetry snapshot
 * POST /api/abhaya/simulate       — run an N-cycle Maha-Pralaya stress simulation
 */

import { Router } from "express";
import {
  analyzePayload,
  analyzeText,
  runAbhayaGate,
  getManifoldStatus,
  ABHAYA_PARAMS,
} from "../lib/abhayaGate.js";

const router = Router();

// ─── POST /api/abhaya/analyze ─────────────────────────────────────────────────

router.post("/analyze", (req, res) => {
  try {
    const { payload, threshold } = req.body as {
      payload?: unknown;
      threshold?: number;
    };

    if (payload === undefined) {
      res.status(400).json({ error: "Missing 'payload' field" });
      return;
    }

    const result = analyzePayload(payload, threshold);
    res.json({
      gate:   "ABHAYA_V3",
      input:  { type: typeof payload, size: JSON.stringify(payload).length },
      result: {
        passed:           result.passed,
        stability:        result.stability,
        xi_flux:          result.xi,
        sigma_sat:        result.sigma_sat,
        chi_v3:           result.chi_v3,
        circuit_a:        result.circuit_a,
        circuit_b:        result.circuit_b,
        circuit_b_active: result.circuit_b_active,
        phase_cancelled:  result.phase_cancelled,
        damping_ratio:    result.damping_ratio,
        gradient_variance: result.gradient_variance,
        free_energy:      result.free_energy,
        cycles:           result.cycles,
        timestamp:        result.timestamp,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

// ─── POST /api/abhaya/analyze/text ───────────────────────────────────────────

router.post("/analyze/text", (req, res) => {
  try {
    const { text, threshold } = req.body as { text?: string; threshold?: number };

    if (typeof text !== "string" || text.length === 0) {
      res.status(400).json({ error: "Missing or empty 'text' field" });
      return;
    }

    if (text.length > 10_000) {
      res.status(400).json({ error: "Text exceeds 10,000 character limit" });
      return;
    }

    const result = analyzeText(text, threshold);
    res.json({
      gate:  "ABHAYA_V3",
      input: { type: "text", length: text.length },
      result: {
        passed:           result.passed,
        stability:        result.stability,
        xi_flux:          result.xi,
        sigma_sat:        result.sigma_sat,
        chi_v3:           result.chi_v3,
        circuit_a:        result.circuit_a,
        circuit_b:        result.circuit_b,
        circuit_b_active: result.circuit_b_active,
        phase_cancelled:  result.phase_cancelled,
        damping_ratio:    result.damping_ratio,
        gradient_variance: result.gradient_variance,
        free_energy:      result.free_energy,
        cycles:           result.cycles,
        timestamp:        result.timestamp,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

// ─── POST /api/abhaya/stabilize ───────────────────────────────────────────────

router.post("/stabilize", (req, res) => {
  try {
    const { signal, threshold, gradient_hint } = req.body as {
      signal?: number[];
      threshold?: number;
      gradient_hint?: number;
    };

    if (!Array.isArray(signal) || signal.length === 0) {
      res.status(400).json({ error: "'signal' must be a non-empty number array" });
      return;
    }

    if (signal.length > 4096) {
      res.status(400).json({ error: "Signal exceeds 4096-element limit" });
      return;
    }

    if (!signal.every(v => typeof v === "number" && isFinite(v))) {
      res.status(400).json({ error: "Signal must contain only finite numbers" });
      return;
    }

    const result = runAbhayaGate({
      signal,
      stabilityThreshold: threshold,
      gradientHint: gradient_hint,
    });

    res.json({
      gate:      "ABHAYA_V3",
      input:     { length: signal.length },
      result: {
        passed:           result.passed,
        stability:        result.stability,
        xi_flux:          result.xi,
        sigma_sat:        result.sigma_sat,
        chi_v3:           result.chi_v3,
        circuit_a:        result.circuit_a,
        circuit_b:        result.circuit_b,
        circuit_b_active: result.circuit_b_active,
        phase_cancelled:  result.phase_cancelled,
        damping_ratio:    result.damping_ratio,
        gradient_variance: result.gradient_variance,
        free_energy:      result.free_energy,
        cycles:           result.cycles,
        timestamp:        result.timestamp,
      },
      stabilised: result.stabilised,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

// ─── GET /api/abhaya/status ───────────────────────────────────────────────────

router.get("/status", (_req, res) => {
  const status = getManifoldStatus();
  res.json({
    gate:    "ABHAYA_V3",
    version: "3.0",
    params:  ABHAYA_PARAMS,
    manifold: {
      cycles:             status.cycles,
      gradient_variance:  status.gradient_variance,
      manifold_stability: status.manifold_stability,
      circuit_b_primed:   status.circuit_b_primed,
    },
    description: {
      circuit_a: "Resonant Baseline — exponential entropy cooling near convergence",
      circuit_b: "Thermodynamic Override — sigmoid-gated gradient variance flood",
      phase_cancellation: "Conjugate destructive interference on ξ-flux components",
    },
  });
});

// ─── POST /api/abhaya/simulate ────────────────────────────────────────────────
// Runs an N-cycle stress test (Maha-Pralaya), returning per-cycle telemetry.
// Mirrors the H100 empirical validation from the whitepaper.

router.post("/simulate", (req, res) => {
  try {
    const rawBody = req.body as Record<string, unknown>;
    const cyclesRaw     = rawBody.cycles     ?? 16;
    const noiseLevelRaw = rawBody.noise_level ?? 0.8;

    const cyclesNum  = Number(cyclesRaw);
    const noiseNum   = Number(noiseLevelRaw);

    if (!Number.isFinite(cyclesNum) || !Number.isFinite(noiseNum)) {
      res.status(400).json({ error: "'cycles' and 'noise_level' must be finite numbers" });
      return;
    }

    const MAX_CYCLES = 256;
    const safeCycles = Math.min(Math.max(1, Math.floor(cyclesNum)), MAX_CYCLES);
    const safeNoise  = Math.min(1, Math.max(0, noiseNum));

    const telemetry: Array<{
      cycle:     number;
      stability: number;
      xi_flux:   number;
      chi_v3:    number;
      circuit_a: number;
      circuit_b: number;
      circuit_b_active: boolean;
      free_energy: number;
      gradient_variance: number;
      phase_cancelled: boolean;
    }> = [];

    // Simulate a manifold under increasing noise, then recovery
    for (let i = 0; i < safeCycles; i++) {
      const phase = i / safeCycles;

      // Noise pattern: spike at cycle 0 (like empirical telemetry), decay through Circuit A/B
      const noiseBurst = safeNoise * Math.exp(-phase * 2.0) + 0.05;
      const signal = Array.from({ length: 64 }, (_, j) => {
        const base = Math.sin((j / 64) * Math.PI * 2 + phase * Math.PI);
        const noise = (Math.random() - 0.5) * 2 * noiseBurst;
        return base + noise;
      });

      const result = runAbhayaGate({
        signal,
        stabilityThreshold: 0.72,
        gradientHint: noiseBurst * 100,
      });

      telemetry.push({
        cycle:            i,
        stability:        result.stability,
        xi_flux:          result.xi,
        chi_v3:           result.chi_v3,
        circuit_a:        result.circuit_a,
        circuit_b:        result.circuit_b,
        circuit_b_active: result.circuit_b_active,
        free_energy:      result.free_energy,
        gradient_variance: result.gradient_variance,
        phase_cancelled:  result.phase_cancelled,
      });
    }

    const finalCycle = telemetry[telemetry.length - 1];
    const peakChi    = Math.max(...telemetry.map(t => t.chi_v3));
    const phaseCancellations = telemetry.filter(t => t.phase_cancelled).length;

    res.json({
      gate:      "ABHAYA_V3",
      simulation: "Maha-Pralaya",
      params: { cycles: safeCycles, noise_level: safeNoise },
      summary: {
        total_cycles:         safeCycles,
        phase_cancellations:  phaseCancellations,
        peak_chi_v3:          peakChi,
        final_stability:      finalCycle.stability,
        final_free_energy:    finalCycle.free_energy,
        circuit_b_activations: telemetry.filter(t => t.circuit_b_active).length,
        converged:            finalCycle.stability >= 0.72,
      },
      telemetry,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

export default router;

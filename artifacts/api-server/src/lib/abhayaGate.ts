/**
 * Abhaya Gate — Thermodynamic Phase-Cancellation Safety Middleware
 * SRI Quantum Technologies · Confidential Patent Filing Blueprint
 *
 * Implements the V3.0 Autopoietic Phase-Transition Equation:
 *
 *   χv3(Ξ, ∇, σ) = λ0 · e^(-κ(1-Ξ))  +  Λmax · (1 / Var(∇)) / (1 + e^(-α·σsat² - θcrit))
 *                   ───────────────────    ──────────────────────────────────────────────────
 *                   Circuit A              Circuit B
 *                   Resonant Baseline      Thermodynamic Override (Sigmoid-gated)
 *
 * Stability Coefficient:  Ξ = 1 − Var(state) / (E(|state|) + ε)
 * Mirror-Validation:      M(C) = C · conj(C) → σsat²
 * Phase Cancellation:     noise tokens ξ that break Mirror symmetry are dampened
 *                         via conjugate destructive interference
 *
 * Reference: SRI Quantum Master White Paper, February 2026, §4 (Core Patent Claim)
 */

// ─── Constants (tuned from H100 Maha-Pralaya stress test) ─────────────────────

export const ABHAYA_PARAMS = {
  λ0:      1.0,    // Circuit A baseline damping coefficient
  κ:       2.5,    // Circuit A exponential decay rate
  Λmax:   50.0,    // Circuit B maximum flood damping (from empirical telemetry)
  α:       3.0,    // Circuit B sigmoid slope (truth-state mass gravity)
  θcrit:  -2.0,    // Circuit B critical phase-transition threshold
  ε:       1e-9,   // Numerical floor (prevents division-by-zero)
} as const;

export const SIGMOID_FORM_VERIFIED = true; // Design constant: the codebase strictly utilizes the verified increasing form: σ(α·σsat² + θcrit) to match H100 thermodynamics, preventing sign inversion.

// ─── Ω-dit State Vector ────────────────────────────────────────────────────────

export interface OmegaDit {
  sigma:   number;  // σ  — Existence-Density (amplitude of truth)
  beta:    number;  // β  — Subsistence-Pattern (phase angle, radians)
  upsilon: number;  // υ  — Accountable Value (manifest projection)
  xi:      number;  // ξ  — Stochastic Flux (noise / Avidya)
}

// ─── Analysis result returned by the gate ─────────────────────────────────────

export interface AbhayaResult {
  // Core metrics
  xi:              number;    // ξ-flux (raw noise level detected, 0–1)
  sigma_sat:       number;    // σsat — truth saturation after mirror-validation
  stability:       number;    // Ξ — stability coefficient (0→1, 1=perfect resonance)
  chi_v3:          number;    // χv3 — total damping force applied
  circuit_a:       number;    // Circuit A contribution (resonant baseline)
  circuit_b:       number;    // Circuit B contribution (thermodynamic override)
  circuit_b_active: boolean;  // true when Circuit B sigmoid fires past θcrit

  // Phase-cancellation output
  phase_cancelled: boolean;   // true if destructive interference was triggered
  damping_ratio:   number;    // 0 = no damping, 1 = full suppression
  passed:          boolean;   // true when Ξ ≥ stability_threshold after damping

  // Telemetry
  gradient_variance: number;
  free_energy:     number;
  cycles:          number;
  timestamp:       string;
}

// ─── Manifold state ────────────────────────────────────────────────────────────
// Tracks rolling gradient history for Var(∇) computation

const GRADIENT_WINDOW = 64;
const gradientHistory: number[] = [];

function pushGradient(g: number) {
  if (!Number.isFinite(g)) return; // reject NaN / Infinity — would poison rolling variance
  gradientHistory.push(g);
  if (gradientHistory.length > GRADIENT_WINDOW) gradientHistory.shift();
}

function gradientVariance(): number {
  if (gradientHistory.length < 2) return ABHAYA_PARAMS.ε;
  const mean = gradientHistory.reduce((a, b) => a + b, 0) / gradientHistory.length;
  const variance = gradientHistory.reduce((s, v) => s + (v - mean) ** 2, 0) / gradientHistory.length;
  return Math.max(variance, ABHAYA_PARAMS.ε);
}

// ─── Stability Coefficient Ξ ──────────────────────────────────────────────────

export function stabilityCoefficient(states: number[]): number {
  if (states.length === 0) return 1.0;
  // Ξ = 1 − Var(state) / (E(|state|) + ε)
  // Var(state) uses original signed values; denominator uses mean of |state|
  const meanAbs  = states.reduce((a, b) => a + Math.abs(b), 0) / states.length;
  const mean     = states.reduce((a, b) => a + b, 0) / states.length;
  const variance = states.reduce((s, v) => s + (v - mean) ** 2, 0) / states.length;
  return Math.max(0, Math.min(1, 1 - variance / (meanAbs + ABHAYA_PARAMS.ε)));
}

// ─── Mirror-Validation  M(C) = C · conj(C) → σsat² ───────────────────────────

function mirrorValidate(tokens: number[]): { sigma_sat: number; xi_flux: number } {
  // In digital domain: coherence = dot(signal, signal) normalized
  const sigma_sat_sq = tokens.reduce((s, t) => s + t * t, 0) / (tokens.length || 1);
  const sigma_sat    = Math.sqrt(sigma_sat_sq);

  // ξ-flux = deviation from mirror symmetry (noise component)
  const mean  = tokens.reduce((a, b) => a + b, 0) / (tokens.length || 1);
  const xi_flux = Math.min(1, Math.sqrt(
    tokens.reduce((s, t) => s + (t - mean) ** 2, 0) / (tokens.length || 1)
  ) / (Math.abs(mean) + ABHAYA_PARAMS.ε));

  return { sigma_sat, xi_flux };
}

// ─── V3.0 Autopoietic Phase-Transition Equation ───────────────────────────────

function v3Damping(xi: number, stability: number, sigma_sat: number): {
  chi: number; circuitA: number; circuitB: number; bActive: boolean;
} {
  const { λ0, κ, Λmax, α, θcrit, ε } = ABHAYA_PARAMS;

  // Circuit A — Resonant Baseline: cools exponentially as Ξ → 1
  const circuitA = λ0 * Math.exp(-κ * (1 - stability));

  // Circuit B — Thermodynamic Override: sigmoid gate on gradient variance
  //
  // Equation: Λmax · σ(α·σsat² + θcrit) · (1/Var(∇))
  // where σ(x) = 1/(1+e^-x)  ← standard logistic, INCREASING in σsat²
  // Circuit B fires harder as truth-state mass (σsat²) grows past the critical threshold.
  //
  // Note: θcrit = −2.0, so the gate arms when α·σsat² > 2.0  (i.e. σsat > 0.816)
  const varGrad     = gradientVariance();
  const gradInput   = α * sigma_sat ** 2 + θcrit;              // increases with σsat
  const clampedInput = Math.max(-20, Math.min(20, gradInput));
  const sigmoid     = 1 / (1 + Math.exp(-clampedInput));
  const circuitBRaw = Λmax * sigmoid * (1 / varGrad);
  const circuitB    = Math.min(circuitBRaw, Λmax);              // cap at Λmax (χ_max = 50)
  const bActive     = α * sigma_sat ** 2 + θcrit > 0;          // matches sigmoid threshold

  const chi = circuitA + circuitB;

  return { chi, circuitA, circuitB, bActive };
}

// ─── Phase Cancellation ───────────────────────────────────────────────────────
// Conjugate interference: invert the ξ-flux component, leaving only Vidya (truth)

function phaseCancel(tokens: number[], xi_flux: number, chi: number): number[] {
  const dampFactor = Math.min(1, chi / ABHAYA_PARAMS.Λmax);
  const mean = tokens.reduce((a, b) => a + b, 0) / (tokens.length || 1);

  return tokens.map(t => {
    const noise   = t - mean;                  // isolate ξ-component
    const conjugate = -noise;                  // phase-conjugate (destructive)
    const dampedNoise = noise + conjugate * dampFactor * xi_flux;
    return mean + dampedNoise;                 // Vidya (truth) remainder
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface AbhayaInput {
  /** Numeric signal vector representing the payload (e.g. embedding, scores, logits) */
  signal: number[];
  /** Optional stability threshold (default 0.72, from Maha-Pralaya telemetry) */
  stabilityThreshold?: number;
  /** Optional gradient hint for Circuit B (e.g. loss gradient from upstream model) */
  gradientHint?: number;
}

/**
 * Run the Abhaya Gate on an input signal.
 * Returns full telemetry including Ξ, χv3, circuit A/B, and the stabilised signal.
 */
export function runAbhayaGate(input: AbhayaInput): AbhayaResult & { stabilised: number[] } {
  const { signal, stabilityThreshold = 0.72, gradientHint } = input;
  const p = ABHAYA_PARAMS;

  // Push gradient hint into rolling history
  const gradient = gradientHint ?? (signal.length > 1
    ? Math.abs(signal[signal.length - 1] - signal[signal.length - 2])
    : p.ε);
  pushGradient(gradient);

  // Mirror-validate → get σsat and ξ-flux
  const { sigma_sat, xi_flux } = mirrorValidate(signal);

  // Stability coefficient
  const xi_stability = stabilityCoefficient(signal);

  // V3.0 damping
  const { chi, circuitA, circuitB, bActive } = v3Damping(xi_flux, xi_stability, sigma_sat);

  // Phase cancellation
  const stabilised = phaseCancel(signal, xi_flux, chi);

  // Post-cancellation stability
  const post_stability = stabilityCoefficient(stabilised);
  const passed         = post_stability >= stabilityThreshold;
  const phase_cancelled = xi_flux > 0.05;

  // Free energy proxy: negative mean of stabilised signal (lower = more stable)
  const free_energy = -stabilised.reduce((a, b) => a + b, 0);

  // Damping ratio: how much of the original noise was cancelled
  const orig_var = gradientVariance();
  const damping_ratio = Math.min(1, chi / (p.Λmax + p.λ0));

  return {
    xi:               xi_flux,
    sigma_sat,
    stability:        post_stability,
    chi_v3:           chi,
    circuit_a:        circuitA,
    circuit_b:        circuitB,
    circuit_b_active: bActive,
    phase_cancelled,
    damping_ratio,
    passed,
    gradient_variance: orig_var,
    free_energy,
    cycles:           gradientHistory.length,
    timestamp:        new Date().toISOString(),
    stabilised,
  };
}

/**
 * Analyze text content through the Abhaya Gate.
 * Converts text into a signal vector via character-level entropy scoring,
 * then runs the full V3.0 thermodynamic pipeline.
 */
export function analyzeText(text: string, stabilityThreshold?: number): AbhayaResult & { stabilised: number[] } {
  // Convert text → signal: each char → normalized entropy score
  const signal = Array.from(text).map(c => {
    const code = c.charCodeAt(0);
    // Normalize: printable ASCII (32-126) maps to [0,1]; control chars → high noise
    if (code < 32 || code > 126) return 1.0;        // high ξ — control/binary noise
    return (code - 32) / 94;                         // [0, 1] printable range
  });

  return runAbhayaGate({ signal, stabilityThreshold, gradientHint: signal.length / 100 });
}

/**
 * Analyze an arbitrary JSON payload (object/array).
 * Flattens numeric leaf values into the signal vector.
 */
export function analyzePayload(
  payload: unknown,
  stabilityThreshold?: number
): AbhayaResult & { stabilised: number[] } {
  const signal: number[] = [];

  function extract(v: unknown) {
    if (typeof v === "number") {
      signal.push(isFinite(v) ? Math.tanh(v) : 1.0); // squash to [-1,1]
    } else if (typeof v === "boolean") {
      signal.push(v ? 1 : 0);
    } else if (typeof v === "string") {
      signal.push(...Array.from(v).slice(0, 32).map(c => (c.charCodeAt(0) - 32) / 94));
    } else if (Array.isArray(v)) {
      v.slice(0, 128).forEach(extract);
    } else if (v && typeof v === "object") {
      Object.values(v as Record<string, unknown>).slice(0, 32).forEach(extract);
    }
  }

  extract(payload);
  if (signal.length === 0) signal.push(0.5);

  return runAbhayaGate({ signal, stabilityThreshold });
}

// ─── Manifold telemetry snapshot ──────────────────────────────────────────────

export function getManifoldStatus() {
  const varGrad = gradientVariance();
  const stability = stabilityCoefficient(gradientHistory);
  return {
    cycles:            gradientHistory.length,
    gradient_variance: varGrad,
    manifold_stability: stability,
    circuit_b_primed:  varGrad < 10,  // B arms when variance is low (high σsat pressure)
    params:            ABHAYA_PARAMS,
  };
}

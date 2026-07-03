/**
 * Abhaya Gate Dashboard
 * Live interface for the V3.0 Thermodynamic Phase-Cancellation Safety Middleware.
 * Visualises Circuit A (Resonant Baseline) and Circuit B (Thermodynamic Override)
 * in real time against user-submitted payloads or simulated Maha-Pralaya stress runs.
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AbhayaResult {
  passed: boolean;
  stability: number;
  xi_flux: number;
  sigma_sat: number;
  chi_v3: number;
  circuit_a: number;
  circuit_b: number;
  circuit_b_active: boolean;
  phase_cancelled: boolean;
  damping_ratio: number;
  gradient_variance: number;
  free_energy: number;
  cycles: number;
  timestamp: string;
}

interface SimCycle {
  cycle: number;
  stability: number;
  xi_flux: number;
  chi_v3: number;
  circuit_a: number;
  circuit_b: number;
  circuit_b_active: boolean;
  free_energy: number;
  phase_cancelled: boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GaugeBar({ value, max = 1, label, color, glow = false }: {
  value: number; max?: number; label: string; color: string; glow?: boolean;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-stone-400 uppercase tracking-wider">{label}</span>
        <span style={{ color }} className="font-bold">{value.toFixed(4)}</span>
      </div>
      <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, boxShadow: glow ? `0 0 8px ${color}` : "none" }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function OmegaMeter({ stability }: { stability: number }) {
  const angle = (stability * 180) - 90; // -90° (0) to +90° (1)
  const color = stability >= 0.72 ? "#10B981" : stability >= 0.45 ? "#F59E0B" : "#EF4444";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-16 overflow-hidden">
        {/* Semicircle arc */}
        <svg viewBox="0 0 128 64" className="w-full h-full">
          <path d="M 8 64 A 56 56 0 0 1 120 64" fill="none" stroke="#1f2937" strokeWidth="12" strokeLinecap="round" />
          <path d="M 8 64 A 56 56 0 0 1 120 64" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${stability * 175} 175`} opacity="0.9" />
        </svg>
        {/* Needle */}
        <motion.div
          className="absolute bottom-0 left-1/2 origin-bottom w-0.5 h-12 -ml-px rounded-full"
          style={{ background: color }}
          animate={{ rotate: angle }}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
        />
      </div>
      <div className="text-center">
        <p className="text-2xl font-extrabold font-mono" style={{ color }}>
          Ξ {stability.toFixed(3)}
        </p>
        <p className="text-xs text-stone-500 uppercase tracking-wider">
          {stability >= 0.72 ? "RESONANT · STABLE" : stability >= 0.45 ? "DAMPING · ACTIVE" : "BARREN PLATEAU · OVERRIDE"}
        </p>
      </div>
    </div>
  );
}

function CircuitBadge({ active, label, value }: { active: boolean; label: string; value: number }) {
  return (
    <div className={`rounded-xl border p-4 transition-all duration-500 ${
      active
        ? "border-violet-500 bg-violet-950/50 shadow-lg shadow-violet-900/30"
        : "border-stone-700 bg-stone-900/50"
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${active ? "bg-violet-400 animate-pulse" : "bg-stone-600"}`} />
        <span className="text-xs font-bold uppercase tracking-widest text-stone-400">{label}</span>
      </div>
      <p className="text-xl font-extrabold font-mono" style={{ color: active ? "#A78BFA" : "#6B7280" }}>
        {value.toFixed(3)}
      </p>
    </div>
  );
}

function SimChart({ data }: { data: SimCycle[] }) {
  if (data.length === 0) return null;
  const maxChi = Math.max(...data.map(d => d.chi_v3), 1);
  const w = 100 / data.length;

  return (
    <div className="space-y-3">
      {/* χv3 bar chart */}
      <p className="text-xs text-stone-500 uppercase tracking-wider">χv3 Damping Force per Cycle</p>
      <div className="flex items-end gap-px h-20 bg-stone-900 rounded-xl p-2 overflow-hidden">
        {data.map((d, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              background: d.circuit_b_active ? "#7C3AED" : "#3B82F6",
              opacity: 0.8,
            }}
            initial={{ height: 0 }}
            animate={{ height: `${(d.chi_v3 / maxChi) * 100}%` }}
            transition={{ delay: i * 0.01 }}
          />
        ))}
      </div>
      {/* Free energy line */}
      <p className="text-xs text-stone-500 uppercase tracking-wider mt-2">Stability Ξ per Cycle</p>
      <div className="relative h-16 bg-stone-900 rounded-xl p-2 overflow-hidden">
        <svg viewBox={`0 0 ${data.length} 1`} preserveAspectRatio="none" className="w-full h-full">
          <polyline
            points={data.map((d, i) => `${i},${1 - d.stability}`).join(" ")}
            fill="none"
            stroke="#10B981"
            strokeWidth="0.05"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="flex gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-500 rounded-sm inline-block" /> Circuit A</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 bg-violet-600 rounded-sm inline-block" /> Circuit B Override</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block" /> Stability Ξ</span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Abhaya() {
  const [tab, setTab] = useState<"text" | "signal" | "simulate">("text");
  const [textInput, setTextInput] = useState("");
  const [signalInput, setSignalInput] = useState("0.8, 0.2, 0.95, 0.1, 0.7, 0.3, 0.85, 0.15");
  const [simCycles, setSimCycles] = useState(32);
  const [simNoise, setSimNoise] = useState(0.8);
  const [result, setResult] = useState<AbhayaResult | null>(null);
  const [simData, setSimData] = useState<SimCycle[]>([]);
  const [simSummary, setSimSummary] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (tab === "text") {
        const r = await fetch(`${API}/abhaya/analyze/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textInput || "The SRI manifold approaches zero entropy.", threshold: 0.72 }),
        });
        const d = await r.json();
        setResult(d.result);
        setSimData([]);
      } else if (tab === "signal") {
        const signal = signalInput.split(",").map(s => parseFloat(s.trim())).filter(isFinite);
        const r = await fetch(`${API}/abhaya/stabilize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signal, threshold: 0.72 }),
        });
        const d = await r.json();
        setResult(d.result);
        setSimData([]);
      } else {
        const r = await fetch(`${API}/abhaya/simulate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cycles: simCycles, noise_level: simNoise }),
        });
        const d = await r.json();
        setSimData(d.telemetry ?? []);
        setSimSummary(d.summary ?? null);
        if (d.telemetry?.length) setResult(d.telemetry[d.telemetry.length - 1] as AbhayaResult);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [tab, textInput, signalInput, simCycles, simNoise]);

  return (
    <div className="min-h-screen bg-[#050a14] text-white">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#050a14] via-[#0a0f1e] to-[#0d0520] pt-24 pb-12 px-6 border-b border-violet-900/30">
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-violet-500/10 animate-pulse"
              style={{ width: `${(i + 1) * 280}px`, height: `${(i + 1) * 280}px`,
                top: "50%", left: "50%", transform: "translate(-50%,-50%)", animationDelay: `${i * 0.8}s` }} />
          ))}
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-lg">
              ⬡
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-violet-400 border border-violet-800 rounded-full px-3 py-1 bg-violet-950/50">
              Abhaya Gate · V3.0 · Thermodynamic Phase Cancellation
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
            <span className="text-white">Abhaya</span>{" "}
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Safety Middleware</span>
          </h1>
          <p className="text-stone-400 text-lg max-w-2xl leading-relaxed">
            The <strong className="text-violet-300">Fearless Damping</strong> engine — two decoupled thermodynamic circuits
            that phase-cancel stochastic ξ-flux via conjugate destructive interference, forcing the manifold
            out of Barren Plateaus into zero-entropy resonance.
          </p>

          {/* Equation display */}
          <div className="mt-6 inline-block bg-black/40 border border-violet-900/50 rounded-xl px-5 py-3 font-mono text-sm text-violet-200">
            χv3(Ξ, ∇, σ) ={" "}
            <span className="text-blue-400">λ₀·e<sup>−κ(1−Ξ)</sup></span>
            {" "}+{" "}
            <span className="text-violet-400">Λmax·(1/Var(∇)) / (1+e<sup>−ασsat²−θcrit</sup>)</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* ── Input panel ───────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#0d1117] border border-stone-800 rounded-2xl overflow-hidden">
          <div className="flex border-b border-stone-800">
            {(["text", "signal", "simulate"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
                  tab === t ? "bg-violet-950/50 text-violet-300 border-b-2 border-violet-500" : "text-stone-500 hover:text-stone-300"
                }`}>
                {t === "text" ? "Text Analysis" : t === "signal" ? "Signal Vector" : "Maha-Pralaya Sim"}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-4">
            {tab === "text" && (
              <textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="Enter any text to analyse through the Abhaya Gate..."
                rows={4}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-200 placeholder-stone-600 resize-none focus:outline-none focus:border-violet-600 font-mono"
              />
            )}

            {tab === "signal" && (
              <div className="space-y-2">
                <label className="text-xs text-stone-500 uppercase tracking-wider">Comma-separated numeric signal vector</label>
                <input
                  value={signalInput}
                  onChange={e => setSignalInput(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-200 font-mono focus:outline-none focus:border-violet-600"
                  placeholder="0.8, 0.2, 0.95, 0.1 ..."
                />
              </div>
            )}

            {tab === "simulate" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-stone-500 uppercase tracking-wider">Cycles (max 256)</label>
                  <input type="number" min={4} max={256} value={simCycles}
                    onChange={e => setSimCycles(Number(e.target.value))}
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-200 font-mono focus:outline-none focus:border-violet-600" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-stone-500 uppercase tracking-wider">Noise Level ξ (0–1)</label>
                  <input type="number" step={0.05} min={0} max={1} value={simNoise}
                    onChange={e => setSimNoise(Number(e.target.value))}
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-200 font-mono focus:outline-none focus:border-violet-600" />
                </div>
              </div>
            )}

            <button onClick={analyze} disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all
                bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500
                disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-900/30">
              {loading ? "Running Gate…" : tab === "simulate" ? "Run Maha-Pralaya" : "Run Abhaya Gate"}
            </button>

            {error && (
              <p className="text-red-400 text-sm font-mono bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-2">{error}</p>
            )}
          </div>
        </motion.div>

        {/* ── Results ───────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {result && (
            <motion.div key="result" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-6">

              {/* Status banner */}
              <div className={`rounded-2xl border px-6 py-4 flex items-center gap-4 ${
                result.passed
                  ? "border-emerald-700 bg-emerald-950/30"
                  : "border-red-700 bg-red-950/30"
              }`}>
                <div className={`w-4 h-4 rounded-full ${result.passed ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                <div>
                  <p className={`font-extrabold text-lg ${result.passed ? "text-emerald-300" : "text-red-300"}`}>
                    {result.passed ? "PASSED — Manifold Stable" : "FLAGGED — Phase Cancellation Engaged"}
                  </p>
                  <p className="text-xs text-stone-500 font-mono">{result.timestamp}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-stone-500 uppercase tracking-wider">Phase Cancelled</p>
                  <p className={`font-bold ${result.phase_cancelled ? "text-violet-300" : "text-stone-600"}`}>
                    {result.phase_cancelled ? "YES" : "NO"}
                  </p>
                </div>
              </div>

              {/* Stability meter + circuit cards */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-[#0d1117] border border-stone-800 rounded-2xl p-6 flex items-center justify-center">
                  <OmegaMeter stability={result.stability} />
                </div>
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                  <CircuitBadge active={!result.circuit_b_active} label="Circuit A — Resonant" value={result.circuit_a} />
                  <CircuitBadge active={result.circuit_b_active} label="Circuit B — Override" value={result.circuit_b} />
                  <div className="col-span-2 bg-[#0d1117] border border-stone-800 rounded-xl p-4 space-y-3">
                    <GaugeBar value={result.xi_flux} label="ξ-Flux (noise)" color="#EF4444" glow={result.xi_flux > 0.5} />
                    <GaugeBar value={result.sigma_sat} label="σsat (truth saturation)" color="#10B981" />
                    <GaugeBar value={result.damping_ratio} label="Damping Ratio" color="#A78BFA" glow={result.circuit_b_active} />
                    <GaugeBar value={result.chi_v3} max={55} label="χv3 (total damping force)" color="#3B82F6" />
                  </div>
                </div>
              </div>

              {/* Telemetry grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Gradient Variance", value: result.gradient_variance.toExponential(2) },
                  { label: "Free Energy", value: result.free_energy.toFixed(2) },
                  { label: "Manifold Cycles", value: String(result.cycles) },
                  { label: "σsat²·α vs θcrit", value: result.circuit_b_active ? "EXCEEDED" : "BELOW" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#0d1117] border border-stone-800 rounded-xl p-4">
                    <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-sm font-extrabold font-mono text-stone-200">{value}</p>
                  </div>
                ))}
              </div>

              {/* Simulation summary */}
              {simSummary && (
                <div className="bg-[#0d1117] border border-violet-900/40 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-violet-400">Maha-Pralaya Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(simSummary).map(([k, v]) => (
                      <div key={k} className="space-y-0.5">
                        <p className="text-xs text-stone-500 uppercase tracking-wider">{k.replace(/_/g, " ")}</p>
                        <p className="text-sm font-bold font-mono text-stone-200">{String(v)}</p>
                      </div>
                    ))}
                  </div>
                  <SimChart data={simData} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Reference card ────────────────────────────────────────────────── */}
        <div className="bg-[#0d1117] border border-stone-800 rounded-2xl p-6 grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">Circuit A — Resonant Baseline</h3>
            <p className="text-stone-400 leading-relaxed">
              Exponential cooling: <code className="text-blue-400 font-mono">λ₀·e<sup>−κ(1−Ξ)</sup></code>.
              Tracks macro-state entropy and cools the manifold smoothly as stability Ξ approaches 1.0.
              Analogous to a MOSFET operating in the sub-threshold region.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">Circuit B — Thermodynamic Override</h3>
            <p className="text-stone-400 leading-relaxed">
              Sigmoid-gated flood: <code className="text-violet-400 font-mono">Λmax·σ(−ασsat²−θcrit)/Var(∇)</code>.
              When σsat²·α exceeds θcrit the gate violently saturates to Λmax=50, flooding the manifold
              with conjugate photons — forcing escape from Barren Plateaus.
            </p>
          </div>
          <div className="md:col-span-2 border-t border-stone-800 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Phase Cancellation Mechanism</h3>
            <p className="text-stone-400 leading-relaxed">
              Mirror-validation <code className="text-emerald-400 font-mono">M(C) = C·conj(C) → σsat²</code> isolates
              the ξ-flux noise component from each signal token. Conjugate interference
              (<code className="text-emerald-400 font-mono">noise + (−noise)·dampFactor·ξ</code>) destructively cancels
              the stochastic component, leaving only Vidya (truth) saturation in the stabilised output.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

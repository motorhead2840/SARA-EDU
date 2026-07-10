/**
 * Abhaya Gate — Thermodynamic Phase-Cancellation Stress Testing & Metrics Review
 * 
 * This script subjects the V3.0 Autopoietic Phase-Transition Equation to 4 distinct
 * adversarial noise models and stress distributions. It compiles training-like
 * validation metrics to review the (0)1 phase cancellation stability coefficient (Ξ).
 */

import { runAbhayaGate, ABHAYA_PARAMS, stabilityCoefficient } from "../../artifacts/api-server/src/lib/abhayaGate.js";

// Helper to generate a clean, coherent baseline signal
function generateCleanSignal(length: number = 64): number[] {
  return Array.from({ length }, (_, j) => Math.sin((j / length) * Math.PI * 2));
}

// ─── Adversary & Stress Injection Models ──────────────────────────────────────

// 1. Stochastic White Noise (High Entropy)
function injectWhiteNoise(clean: number[], stdDev: number): number[] {
  return clean.map(val => {
    const noise = (Math.random() - 0.5) * 2 * stdDev;
    return val + noise;
  });
}

// 2. Impulse / Spike Attack (Anomalies / Prompt Injection Proxy)
function injectSpikeNoise(clean: number[], numSpikes: number, amplitude: number): number[] {
  const noisy = [...clean];
  for (let i = 0; i < numSpikes; i++) {
    const index = Math.floor(Math.random() * clean.length);
    noisy[index] += (Math.random() > 0.5 ? 1 : -1) * amplitude;
  }
  return noisy;
}

// 3. Out-of-Phase Square Wave Disruption (Coherent Destructive Attack)
function injectSquareWave(clean: number[], freq: number, amplitude: number): number[] {
  return clean.map((val, index) => {
    const wave = Math.sign(Math.sin((index / clean.length) * Math.PI * 2 * freq)) * amplitude;
    return val + wave;
  });
}

// 4. Random Walk / Drift (Gradient Poisoning / Slow Manifold Drift)
function injectDrift(clean: number[], driftScale: number): number[] {
  const noisy: number[] = [];
  let cumulativeDrift = 0;
  for (const val of clean) {
    cumulativeDrift += (Math.random() - 0.5) * driftScale;
    noisy.push(val + cumulativeDrift);
  }
  return noisy;
}

/**
 * Helper to compute the Mean Squared Error (MSE) between two signal vectors.
 * 
 * @param arrA - The clean/target signal vector.
 * @param arrB - The reconstructed/stabilized signal vector.
 * @returns The Mean Squared Error of the two vectors.
 * @throws {Error} If the signal lengths are not equal.
 */
function calculateMSE(arrA: number[], arrB: number[]): number {
  if (arrA.length !== arrB.length) {
    throw new Error(`Signal lengths do not match: ${arrA.length} vs ${arrB.length}`);
  }
  const sumSq = arrA.reduce((sum, val, idx) => sum + (val - arrB[idx]) ** 2, 0);
  return sumSq / arrA.length;
}

// ─── Simulation / Trial Runner ────────────────────────────────────────────────
interface StressResult {
  scenarioName: string;
  avgPreStability: number;
  avgPostStability: number;
  avgXiFlux: number;
  avgDampingRatio: number;
  avgMSE: number;
  passedRate: number;
  circuitBActiveRate: number;
}

/**
 * Runs a stress-test scenario over multiple trials and compiles metrics.
 * 
 * @param name - The name of the scenario.
 * @param generator - Callback function to inject specific noise / adversarial modifications into clean signals.
 * @param numTrials - Number of trials/iterations to execute.
 * @param threshold - The target stability coefficient (Ξ) threshold.
 * @returns Combined stress-testing metrics.
 */
function runScenario(
  name: string,
  generator: (clean: number[]) => number[],
  numTrials: number = 200,
  threshold: number = 0.72
): StressResult {
  let totalPreStability = 0;
  let totalPostStability = 0;
  let totalXiFlux = 0;
  let totalDampingRatio = 0;
  let totalMSE = 0;
  let passedCount = 0;
  let circuitBActiveCount = 0;

  for (let t = 0; t < numTrials; t++) {
    const clean = generateCleanSignal(64);
    const noisy = generator(clean);
    
    // Pre-cancellation metrics
    const preStability = stabilityCoefficient(noisy);
    
    // Run through the Abhaya Gate
    const result = runAbhayaGate({
      signal: noisy,
      stabilityThreshold: threshold,
    });
    
    totalPreStability += preStability;
    totalPostStability += result.stability;
    totalXiFlux += result.xi;
    totalDampingRatio += result.damping_ratio;
    totalMSE += calculateMSE(clean, result.stabilised);
    
    if (result.passed) passedCount++;
    if (result.circuit_b_active) circuitBActiveCount++;
  }

  return {
    scenarioName: name,
    avgPreStability: totalPreStability / numTrials,
    avgPostStability: totalPostStability / numTrials,
    avgXiFlux: totalXiFlux / numTrials,
    avgDampingRatio: totalDampingRatio / numTrials,
    avgMSE: totalMSE / numTrials,
    passedRate: passedCount / numTrials,
    circuitBActiveRate: circuitBActiveCount / numTrials,
  };
}

/**
 * Orchestrates the stress test execution across all configured noise and
 * adversarial injection scenarios and generates the performance report.
 */
function main() {
  console.log("=====================================================================");
  console.log(" ABHAYA GATE THERMODYNAMIC PHASE-CANCELLATION STRESS TEST REPORT     ");
  console.log("=====================================================================");
  console.log(`Parameters: λ0=${ABHAYA_PARAMS.λ0}, κ=${ABHAYA_PARAMS.κ}, Λmax=${ABHAYA_PARAMS.Λmax}, α=${ABHAYA_PARAMS.α}, θcrit=${ABHAYA_PARAMS.θcrit}`);
  console.log("Stability Threshold (target Ξ) = 0.72\n");

  const numTrials = 250;
  const scenarios: StressResult[] = [
    // 1. Clean Baseline (perfect resonance control)
    runScenario("1. Clean Baseline", (clean) => clean, numTrials),

    // 2. Light Stochastic Noise
    runScenario("2. Light White Noise (σ=0.2)", (clean) => injectWhiteNoise(clean, 0.2), numTrials),

    // 3. Heavy Stochastic Noise (Stress Circuit A/B Transition)
    runScenario("3. Heavy White Noise (σ=0.8)", (clean) => injectWhiteNoise(clean, 0.8), numTrials),

    // 4. Extreme Stochastic Noise (Full Stress / Chaos)
    runScenario("4. Extreme White Noise (σ=2.0)", (clean) => injectWhiteNoise(clean, 2.0), numTrials),

    // 5. Sparse Impulse Spike Attack (Anomalies)
    runScenario("5. Impulse Spike (3 spikes, amp=1.5)", (clean) => injectSpikeNoise(clean, 3, 1.5), numTrials),

    // 6. High Frequency Square-Wave (Out-of-phase destructive attack)
    runScenario("6. Square-Wave Disruption (freq=8, amp=0.8)", (clean) => injectSquareWave(clean, 8, 0.8), numTrials),

    // 7. Slow Manifold Drift (Random Walk drift)
    runScenario("7. Cumulative Drift (walk σ=0.1)", (clean) => injectDrift(clean, 0.1), numTrials),
  ];

  // Print text table
  console.log(
    "| " + "Scenario".padEnd(42) + 
    " | " + "Pre-Ξ".padEnd(8) + 
    " | " + "Post-Ξ".padEnd(8) + 
    " | " + "Passed%".padEnd(8) + 
    " | " + "DampRatio".padEnd(10) + 
    " | " + "Avg-ξ".padEnd(8) + 
    " | " + "MSE-Error".padEnd(10) + 
    " | " + "CircuitB%".padEnd(8) + " |"
  );
  console.log("|" + "-".repeat(119) + "|");

  for (const s of scenarios) {
    console.log(
      "| " + s.scenarioName.padEnd(42) + 
      " | " + s.avgPreStability.toFixed(4).padEnd(8) + 
      " | " + s.avgPostStability.toFixed(4).padEnd(8) + 
      " | " + (s.passedRate * 100).toFixed(1).concat("%").padEnd(8) + 
      " | " + s.avgDampingRatio.toFixed(4).padEnd(10) + 
      " | " + s.avgXiFlux.toFixed(4).padEnd(8) + 
      " | " + s.avgMSE.toFixed(4).padEnd(10) + 
      " | " + (s.circuitBActiveRate * 100).toFixed(1).concat("%").padEnd(8) + " |"
    );
  }
  console.log("=====================================================================\n");
}

main();

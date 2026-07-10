---
name: Abhaya Gate Architecture
description: V3.0 thermodynamic phase-cancellation middleware — equation params, circuit logic, numerical edge cases, API routes.
---

## Rule
Circuit B sigmoid must use INCREASING form: `σ(α·σsat² + θcrit)` not the negated form.
`gradInput = α * sigma_sat² + θcrit` — fires harder as truth-state mass grows past θcrit.
`bActive` flag must match: `α * sigma_sat² + θcrit > 0`

**Why:** Original code had sign inversion (`-α*sigma_sat² - θcrit`), producing a DECREASING Circuit B that contradicted whitepaper semantics and made telemetry inconsistent with actual damping.

## Params (tuned from H100 Maha-Pralaya telemetry)
- λ0=1.0, κ=2.5, Λmax=50.0, α=3.0, θcrit=-2.0, ε=1e-9
- Circuit B arms when σsat > sqrt(2/3) ≈ 0.816

## Key fixes
- Ξ uses `Var(state)` (signed) over `E(|state|)` — not `Var(|state|)`
- Circuit B capped at Λmax (fresh manifold Var(∇)≈ε makes 1/Var(∇)→∞)
- `pushGradient` rejects non-finite values to prevent NaN poisoning
- Strict response guard sets HTTP 422 before calling originalJson

## API routes (all under /api/abhaya/)
- `POST /analyze` — JSON payload analysis
- `POST /analyze/text` — text string (max 10k chars)
- `POST /stabilize` — signal vector → phase-cancelled output
- `GET /status` — manifold telemetry snapshot
- `POST /simulate` — Maha-Pralaya stress test (max 256 cycles)

## Express middleware
- `abhayaMiddleware({ mode, stabilityThreshold, screenFields })` — screens request body
- `abhayaResponseGuard({ mode, stabilityThreshold })` — screens outgoing response
- Both inject X-Abhaya-* telemetry headers on every response

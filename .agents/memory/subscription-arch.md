---
name: Global Subscription Architecture
description: GDP-tiered global subscription across Shri Academy and SRI Platform — fiat (Stripe), crypto (ETH/USDC/BTC/SARA), and bank transfer (ACH/SEPA via Stripe Financial Connections).
---

## Architecture

**Backend routes:** `/api/subscription/*` in `artifacts/api-server/src/routes/subscription.ts`
- `GET /plans?country_code=XX` — detects country via ip-api.com, returns tier + fiat + live crypto prices
- `POST /checkout/fiat` — Stripe Checkout; accepts `payment_category: 'card'|'bank'`
- `POST /checkout/crypto` — creates crypto_payments record, returns wallet address + unique amount
- `GET /crypto/status/:id` — polls on-chain, atomically confirms + activates via single DB transaction
- `GET /status?email=X` — unified status (Stripe OR crypto subscription)

**GDP tiers (World Bank 2024):**
- high ($29.99/mo): >50 high-income countries (US, EU, JP, AU, SG...)
- middle ($14.99/mo): upper + lower middle income
- low ($4.99/mo): everything else (default)

**Stripe products:** auto-provisioned on startup via `ensureSubscriptionProducts()`. Idempotent: searches by `metadata['sri_tier']` before creating. Matches price by exact `unit_amount` (not first-found).

**Crypto verification:** Etherscan API for ETH/USDC/SARA; blockstream.info for BTC. Tolerates ±5% (gas/rounding). BTC requires block_time (must be confirmed, not mempool).

**Security hardening (important):**
- `crypto_payments.tx_hash` has a UNIQUE constraint — one on-chain tx can only credit ONE payment
- `isTxHashClaimed()` checked before `confirmPaymentAndActivate()` — prevents replay
- `confirmPaymentAndActivate()` is a single DB transaction (BEGIN/COMMIT) — no split-brain between confirm and activate
- `expireOldPayments()` called on every status poll to clean up stale records

**Bank payments:**
- `stripeService.createCheckoutSession({ paymentCategory: 'bank' })` uses `payment_method_types: ['us_bank_account', 'sepa_debit', 'au_becs_debit', 'acss_debit']`
- Stripe Financial Connections verifies account before any charge
- `payment_method_options.us_bank_account.financial_connections.permissions: ['payment_method']`
- Shown in UI as "For parents & students with a valid bank account"

**DB tables added:**
- `crypto_payments` — tracks pending/confirmed crypto payment records
- `users` extended with `subscription_tier`, `subscription_source`, `subscription_expires_at`

**Required env vars:**
- `CRYPTO_ETH_WALLET` — receives ETH, USDC, SARA (Ethereum address)
- `CRYPTO_BTC_WALLET` — receives BTC (Bitcoin address)
- `PAYMENT_NETWORK` — "mainnet" (default) or "sepolia" for ETH/USDC
- `SARA_USD_PRICE` — fixed SARA price in USD (default: $0.01, not on CoinGecko)

**Frontend:**
- Shri Academy: `artifacts/shri-academy/src/pages/subscribe.tsx` — 3 tabs: FIAT_GATEWAY, BANK_TRANSFER, WEB3_DIRECT
- SRI Platform: `artifacts/sri-platform/src/pages/Subscribe.tsx` — email-first then 3 payment tabs
- Both poll `/api/subscription/status` and `/api/subscription/crypto/status/:id` (5s interval)

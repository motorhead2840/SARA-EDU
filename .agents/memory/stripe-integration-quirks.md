---
name: Stripe Integration Quirks
description: Non-obvious facts about the Replit Stripe connector and stripe-replit-sync bundle setup
---

## Replit Stripe connector — field names

The connector API (`/api/v2/connection?connector_names=stripe`) returns:
```
settings: { secret, publishable, account_id, mcp, claim_url }
```
NOT `secret_key` / `publishable_key`. Always use `settings.secret` for the Stripe secret key.

**Why:** The field naming differs from the Stripe SDK convention. Discovered by inspecting the raw API response.

**How to apply:** In any code that fetches Stripe credentials from the Replit connector, use `settings.secret` not `settings.secret_key`.

---

## HTTP header — hyphen not underscore

The auth header for the connectors API must be `"X-Replit-Token"` (hyphens), not `"X_REPLIT_TOKEN"` (underscores).

---

## stripe-replit-sync must be externalized from esbuild

`stripe-replit-sync` loads SQL migration files at runtime via `path.resolve(__dirname, "./migrations")`. If bundled by esbuild, the migrations directory won't be found and `runMigrations` silently creates the schema but no tables.

**Fix:** Add `"stripe-replit-sync"` to the `external` array in `artifacts/api-server/build.mjs`.

**Why:** `path.resolve(__dirname2, "./migrations")` in the bundled code resolves relative to the bundle output dir, but the migrations folder lives in `node_modules/stripe-replit-sync/dist/migrations/`.

---

## runMigrations — no schema param

`runMigrations({ databaseUrl })` — the function only accepts `databaseUrl` and optional `ssl`. Do NOT pass `schema: "stripe"` — it is hardcoded inside the function.

---

## Stripe products — seeding

Products are seeded via `scripts/src/seed-products.ts`. Must be run once after the Stripe integration is connected:
```
pnpm --filter @workspace/scripts exec tsx src/seed-products.ts
```
Idempotent by product name but not convergent (won't add missing prices to existing products).

---

## wouter Link — no child anchor

`<Link href="...">` in wouter renders as `<a>`. Never wrap it with another `<a>` — causes React hydration error "cannot be a descendant of". Use `<Link href="..." className="...">` directly.

---
name: School Mentor Auth & Portal
description: Role-gated school mentor login — PBKDF2 passwords, HMAC-signed session tokens, scholarship metrics dashboard, AI tutoring observer view.
---

## Architecture

**Role:** `school_mentor` stored in `users.role` (CHECK constraint: student|school_mentor|admin)  
**Credentials:** `users.password_hash` + `users.password_salt` (PBKDF2-SHA256, 100k iterations, 64-byte key)  
**Session token:** `base64url(JSON payload) + "." + HMAC-SHA256(SESSION_SECRET, payload)`, TTL 8h

**Backend routes (api-server):** `/api/mentor/*`
- `POST /register` — requires `MENTOR_REGISTRATION_CODE` env var; inserts new mentor only (no upsert — prevents privilege escalation)
- `POST /login` — always runs pbkdf2 (even for non-existent users) to prevent timing enumeration
- `GET /me` — returns email+role; used by frontend to validate token on mount
- `GET /metrics` — scholarship stats (aggregate only, no PII): user counts by role, subscription tier breakdown, Stripe+crypto active counts, crypto payment volume last 30 days

**Auth middleware:** `requireMentor` in `src/middleware/requireMentor.ts` — validates Bearer token via `verifyMentorToken`

**Security hardening applied:**
- All comparisons (HMAC sig, password hash, registration code) use `crypto.timingSafeEqual`
- No upsert on register — existing accounts are never overwritten
- Single generic "Invalid credentials" message on login (no role/existence enumeration)
- Registration returns "An account with this email already exists" (intentionally ambiguous between roles)

**Frontend (Shri Academy):**
- `/mentor/login` — SECURE_LOGIN terminal UI; LOGIN mode (email+password) and REGISTER mode (toggled via [REQUEST_ACCESS] link; requires registration code)
- `/mentor` — MentorDashboard: on mount validates token via GET /api/mentor/me; redirects to /mentor/login if invalid
  - Tab 1 AI_MENTORING: renders full Shri chat (same as home.tsx); mentor runs sessions in observer mode
  - Tab 2 SCHOLARSHIP_METRICS: calls GET /api/mentor/metrics with Bearer token; 4 stat rows

**Env var:** `MENTOR_REGISTRATION_CODE` (set to "SRI-MENTOR-2026" in shared env) — change this before going live

**Route files:** `src/routes/mentor.ts`, `src/lib/mentorAuth.ts`, `src/middleware/requireMentor.ts`

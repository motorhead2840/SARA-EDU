/**
 * Mentor authentication helpers — no third-party packages.
 *
 * Password hashing: Node built-in crypto.pbkdf2 (HMAC-SHA256, 100k iterations)
 * Session tokens:   base64url(JSON payload) + "." + HMAC-SHA256(secret, payload)
 *
 * Required env var:
 *   SESSION_SECRET — used as HMAC key (already set in project secrets)
 */

import { createHmac, randomBytes, pbkdf2 as _pbkdf2, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const pbkdf2 = promisify(_pbkdf2);

const TOKEN_TTL_SECONDS = 8 * 60 * 60; // 8 hours

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET env var is required for mentor auth');
  return s;
}

// ─── Password hashing ─────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(32).toString('hex');
  const key = await pbkdf2(password, salt, 100_000, 64, 'sha256');
  return { hash: key.toString('hex'), salt };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const key = await pbkdf2(password, salt, 100_000, 64, 'sha256');
  const hashBuf = Buffer.from(hash, 'hex');
  // timingSafeEqual requires equal-length buffers
  if (key.length !== hashBuf.length) return false;
  return timingSafeEqual(key, hashBuf);
}

// ─── Session tokens ───────────────────────────────────────────────────────────

export interface MentorTokenPayload {
  email: string;
  role: 'school_mentor';
  exp: number; // unix timestamp
}

function b64url(s: string): string {
  return Buffer.from(s).toString('base64url');
}

export function signMentorToken(email: string): string {
  const payload: MentorTokenPayload = {
    email,
    role: 'school_mentor',
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', secret()).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifyMentorToken(token: string): MentorTokenPayload | null {
  try {
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return null;
    const expected = createHmac('sha256', secret()).update(payloadB64).digest('base64url');
    // Constant-time comparison to prevent timing attacks
    const expectedBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(sig);
    if (expectedBuf.length !== sigBuf.length) return null;
    if (!timingSafeEqual(expectedBuf, sigBuf)) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as MentorTokenPayload;
    if (payload.role !== 'school_mentor') return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Extract the Bearer token from an Authorization header. */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}

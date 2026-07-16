/**
 * Dev Team routes — mounted at /api/dev-team
 */
import { Router } from "express";
import { logger } from "../lib/logger.js";
import { createDevTeamMember, getDevTeamMemberByEmail } from "../lib/forumDb.js";
import { createHmac, timingSafeEqual } from "node:crypto";

const router = Router();

const TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 hours

function secret(): string {
  return process.env.SESSION_SECRET ?? "default-session-secret-for-dev-team";
}

interface DevTeamTokenPayload {
  email: string;
  github_username: string | null;
  signup_method: "github" | "email";
  role: "dev_team_member";
  exp: number; // unix timestamp
}

function b64url(s: string): string {
  return Buffer.from(s).toString("base64url");
}

function signDevTeamToken(email: string, github_username: string | null, signup_method: "github" | "email"): string {
  const payload: DevTeamTokenPayload = {
    email,
    github_username,
    signup_method,
    role: "dev_team_member",
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret()).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function verifyDevTeamToken(token: string): DevTeamTokenPayload | null {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return null;
    const expected = createHmac("sha256", secret()).update(payloadB64).digest("base64url");
    const expectedBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(sig);
    if (expectedBuf.length !== sigBuf.length) return null;
    if (!timingSafeEqual(expectedBuf, sigBuf)) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as DevTeamTokenPayload;
    if (payload.role !== "dev_team_member") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// POST /api/dev-team/signup
router.post("/signup", async (req, res) => {
  try {
    const { email, github_username, signup_method } = req.body ?? {};
    if (!email || !signup_method) {
      res.status(400).json({ error: "Email and signup method are required" });
      return;
    }
    if (signup_method === "github" && !github_username) {
      res.status(400).json({ error: "GitHub username is required for GitHub signup" });
      return;
    }

    const member = await createDevTeamMember(
      email.trim().toLowerCase(),
      github_username ? github_username.trim() : null,
      signup_method
    );

    const token = signDevTeamToken(member.email, member.github_username, member.signup_method);
    res.status(201).json({ success: true, member, token });
  } catch (err) {
    logger.error({ err }, "devTeam.signup");
    res.status(500).json({ error: "Signup failed", detail: String(err) });
  }
});

// POST /api/dev-team/login
router.post("/login", async (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const member = await getDevTeamMemberByEmail(email.trim().toLowerCase());
    if (!member) {
      res.status(404).json({ error: "No developer account found for this email" });
      return;
    }

    const token = signDevTeamToken(member.email, member.github_username, member.signup_method);
    res.json({ success: true, member, token });
  } catch (err) {
    logger.error({ err }, "devTeam.login");
    res.status(500).json({ error: "Login failed", detail: String(err) });
  }
});

// GET /api/dev-team/me
router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7).trim();
  const payload = verifyDevTeamToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  try {
    const member = await getDevTeamMemberByEmail(payload.email);
    if (!member) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    res.json({ success: true, member });
  } catch (err) {
    logger.error({ err }, "devTeam.me");
    res.status(500).json({ error: "Failed to retrieve developer profile" });
  }
});

export default router;

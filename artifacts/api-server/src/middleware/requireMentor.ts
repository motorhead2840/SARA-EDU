/**
 * Express middleware: validates the mentor session token.
 * Attaches the decoded payload to res.locals.mentor on success.
 * Returns 401 if missing/invalid, 403 if wrong role.
 */

import type { Request, Response, NextFunction } from 'express';
import { extractBearerToken, verifyMentorToken, type MentorTokenPayload } from '../lib/mentorAuth.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      mentor?: MentorTokenPayload;
    }
  }
}

export function requireMentor(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: 'Mentor session token required' });
    return;
  }
  const payload = verifyMentorToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired mentor session token' });
    return;
  }
  res.locals.mentor = payload;
  next();
}

/**
 * SecOps Database
 *
 * Tables:
 *  secops_raw_content        — every ingested text item with scores
 *  secops_training_labels    — human-reviewed labels fed to RageSage
 *  secops_blocked_patterns   — dynamic regex blocklist loaded into contentIndex
 *  secops_cyberdemon_events  — structured events forwarded to Cyberdemon SecOps
 */

import { pool } from '../db.js';
import type { ContentScores } from './contentIndex.js';
import { logger } from './logger.js';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export async function initSecopsSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS secops_raw_content (
        id              BIGSERIAL PRIMARY KEY,
        source_id       TEXT,                          -- originating session/user/channel ID
        source_type     TEXT NOT NULL,                 -- 'chat', 'mentor_input', 'lex_intake', 'api_payload'
        raw_text        TEXT NOT NULL,
        char_count      INT  NOT NULL,
        profanity_score NUMERIC(5,4) NOT NULL DEFAULT 0,
        vulgarity_score NUMERIC(5,4) NOT NULL DEFAULT 0,
        pmi_score       NUMERIC(5,4) NOT NULL DEFAULT 0,
        composite_risk  NUMERIC(5,4) NOT NULL DEFAULT 0,
        flags           TEXT[] NOT NULL DEFAULT '{}',
        risk_tier       TEXT NOT NULL DEFAULT 'CLEAN',
        reviewed        BOOLEAN NOT NULL DEFAULT FALSE,
        reviewed_by     TEXT,
        reviewed_at     TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_secops_raw_tier
        ON secops_raw_content (risk_tier, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_secops_raw_source
        ON secops_raw_content (source_id, source_type);
      CREATE INDEX IF NOT EXISTS idx_secops_raw_unreviewed
        ON secops_raw_content (reviewed, composite_risk DESC)
        WHERE reviewed = FALSE;

      CREATE TABLE IF NOT EXISTS secops_training_labels (
        id                BIGSERIAL PRIMARY KEY,
        content_id        BIGINT NOT NULL REFERENCES secops_raw_content(id) ON DELETE CASCADE,
        label_profanity   NUMERIC(5,4) NOT NULL,
        label_vulgarity   NUMERIC(5,4) NOT NULL,
        label_pmi         NUMERIC(5,4) NOT NULL,
        label_notes       TEXT,
        labelled_by       TEXT NOT NULL,              -- mentor email or 'auto'
        labelled_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        exported_to_s3    BOOLEAN NOT NULL DEFAULT FALSE,
        s3_key            TEXT,
        UNIQUE (content_id)
      );

      CREATE INDEX IF NOT EXISTS idx_secops_labels_unexported
        ON secops_training_labels (exported_to_s3)
        WHERE exported_to_s3 = FALSE;

      CREATE TABLE IF NOT EXISTS secops_blocked_patterns (
        id            BIGSERIAL PRIMARY KEY,
        pattern_regex TEXT NOT NULL,
        category      TEXT NOT NULL CHECK (category IN ('profanity', 'vulgarity', 'pmi')),
        label         TEXT NOT NULL,
        weight        NUMERIC(4,3) NOT NULL CHECK (weight BETWEEN 0 AND 1),
        added_by      TEXT NOT NULL,
        active        BOOLEAN NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (pattern_regex)
      );

      CREATE TABLE IF NOT EXISTS secops_cyberdemon_events (
        id            BIGSERIAL PRIMARY KEY,
        content_id    BIGINT REFERENCES secops_raw_content(id),
        event_type    TEXT NOT NULL,                  -- 'HIGH_RISK_CONTENT' | 'CRITICAL_PMI' | 'PATTERN_BREACH'
        severity      TEXT NOT NULL,                  -- 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
        payload       JSONB NOT NULL,
        dispatched    BOOLEAN NOT NULL DEFAULT FALSE,
        dispatched_at TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_secops_cd_undispatched
        ON secops_cyberdemon_events (dispatched, severity, created_at DESC)
        WHERE dispatched = FALSE;
    `);
    logger.info('SecOps DB schema initialised');
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// CRUD helpers
// ---------------------------------------------------------------------------

export async function insertRawContent(params: {
  sourceId: string | null;
  sourceType: string;
  rawText: string;
  scores: ContentScores;
}): Promise<number> {
  const { rows } = await pool.query(
    `INSERT INTO secops_raw_content
       (source_id, source_type, raw_text, char_count,
        profanity_score, vulgarity_score, pmi_score, composite_risk,
        flags, risk_tier)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      params.sourceId,
      params.sourceType,
      params.rawText,
      params.rawText.length,
      params.scores.profanityScore,
      params.scores.vulgarityScore,
      params.scores.pmiScore,
      params.scores.compositeRisk,
      params.scores.flags,
      params.scores.tier,
    ]
  );
  return rows[0].id as number;
}

export async function queueCyberDemonEvent(params: {
  contentId: number;
  eventType: string;
  severity: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  await pool.query(
    `INSERT INTO secops_cyberdemon_events (content_id, event_type, severity, payload)
     VALUES ($1,$2,$3,$4)`,
    [params.contentId, params.eventType, params.severity, JSON.stringify(params.payload)]
  );
}

export async function listFlagged(opts: {
  tier?: string;
  reviewed?: boolean;
  limit: number;
  offset: number;
}): Promise<{ items: unknown[]; total: number }> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (opts.tier) { conditions.push(`risk_tier = $${idx++}`); values.push(opts.tier); }
  if (opts.reviewed !== undefined) { conditions.push(`reviewed = $${idx++}`); values.push(opts.reviewed); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(
      `SELECT id, source_id, source_type, char_count,
              profanity_score, vulgarity_score, pmi_score, composite_risk,
              flags, risk_tier, reviewed, reviewed_by, reviewed_at, created_at
       FROM secops_raw_content
       ${where}
       ORDER BY composite_risk DESC, created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...values, opts.limit, opts.offset]
    ),
    pool.query(`SELECT COUNT(*) AS total FROM secops_raw_content ${where}`, values),
  ]);

  return { items: rows, total: Number(countRows[0].total) };
}

export async function markReviewed(contentId: number, reviewerEmail: string): Promise<void> {
  await pool.query(
    `UPDATE secops_raw_content
     SET reviewed = TRUE, reviewed_by = $2, reviewed_at = NOW()
     WHERE id = $1`,
    [contentId, reviewerEmail]
  );
}

export async function saveLabel(params: {
  contentId: number;
  labelProfanity: number;
  labelVulgarity: number;
  labelPmi: number;
  notes: string;
  labelledBy: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO secops_training_labels
       (content_id, label_profanity, label_vulgarity, label_pmi, label_notes, labelled_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (content_id) DO UPDATE
       SET label_profanity=$2, label_vulgarity=$3, label_pmi=$4,
           label_notes=$5, labelled_by=$6, labelled_at=NOW()`,
    [params.contentId, params.labelProfanity, params.labelVulgarity,
     params.labelPmi, params.notes, params.labelledBy]
  );
  // Mark parent as reviewed
  await markReviewed(params.contentId, params.labelledBy);
}

export async function loadBlockedPatterns(): Promise<Array<{
  pattern_regex: string;
  category: 'profanity' | 'vulgarity' | 'pmi';
  weight: number;
  label: string;
}>> {
  const { rows } = await pool.query(
    `SELECT pattern_regex, category, weight, label
     FROM secops_blocked_patterns
     WHERE active = TRUE`
  );
  return rows as Array<{ pattern_regex: string; category: 'profanity' | 'vulgarity' | 'pmi'; weight: number; label: string }>;
}

export async function addBlockedPattern(params: {
  patternRegex: string;
  category: 'profanity' | 'vulgarity' | 'pmi';
  label: string;
  weight: number;
  addedBy: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO secops_blocked_patterns (pattern_regex, category, label, weight, added_by)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (pattern_regex) DO UPDATE SET active=TRUE, weight=$4, added_by=$5`,
    [params.patternRegex, params.category, params.label, params.weight, params.addedBy]
  );
}

export async function getStats(): Promise<Record<string, unknown>> {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)                                          AS total_ingested,
      COUNT(*) FILTER (WHERE risk_tier = 'CRITICAL')   AS critical_count,
      COUNT(*) FILTER (WHERE risk_tier = 'HIGH')        AS high_count,
      COUNT(*) FILTER (WHERE risk_tier = 'MEDIUM')      AS medium_count,
      COUNT(*) FILTER (WHERE risk_tier = 'LOW')         AS low_count,
      COUNT(*) FILTER (WHERE risk_tier = 'CLEAN')       AS clean_count,
      COUNT(*) FILTER (WHERE reviewed = FALSE
                         AND risk_tier IN ('CRITICAL','HIGH'))
                                                        AS pending_review,
      AVG(composite_risk)                               AS avg_composite_risk,
      AVG(pmi_score)                                    AS avg_pmi_score
    FROM secops_raw_content
  `);
  return rows[0];
}

export async function getPendingCyberDemonEvents(): Promise<unknown[]> {
  const { rows } = await pool.query(
    `SELECT id, content_id, event_type, severity, payload, created_at
     FROM secops_cyberdemon_events
     WHERE dispatched = FALSE
     ORDER BY severity DESC, created_at ASC
     LIMIT 50`
  );
  return rows;
}

export async function markCyberDemonDispatched(eventIds: number[]): Promise<void> {
  if (eventIds.length === 0) return;
  await pool.query(
    `UPDATE secops_cyberdemon_events
     SET dispatched = TRUE, dispatched_at = NOW()
     WHERE id = ANY($1)`,
    [eventIds]
  );
}

export async function getUnlabelledForExport(limit = 500): Promise<unknown[]> {
  const { rows } = await pool.query(
    `SELECT rc.id, rc.raw_text, rc.profanity_score, rc.vulgarity_score,
            rc.pmi_score, rc.composite_risk, rc.flags, rc.risk_tier,
            tl.label_profanity, tl.label_vulgarity, tl.label_pmi
     FROM secops_raw_content rc
     JOIN secops_training_labels tl ON tl.content_id = rc.id
     WHERE tl.exported_to_s3 = FALSE
     LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function markExportedToS3(contentIds: number[], s3Key: string): Promise<void> {
  await pool.query(
    `UPDATE secops_training_labels
     SET exported_to_s3 = TRUE, s3_key = $2
     WHERE content_id = ANY($1)`,
    [contentIds, s3Key]
  );
}

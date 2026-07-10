/**
 * SecOps Data Collection Server
 *
 * Collects unclean/raw content, scores it through the three-tier Content Index
 * (Profanity / Vulgarity / Perverted Mentation Index), persists flagged entries,
 * queues Cyberdemon SecOps events, and exposes label + pattern management
 * endpoints for the RageSage training pipeline.
 *
 * Routes:
 *   POST   /api/secops/ingest             — ingest raw content, return risk score
 *   GET    /api/secops/flagged            — list flagged items (mentor auth)
 *   POST   /api/secops/label/:id          — human-label a flagged item (mentor auth)
 *   POST   /api/secops/pattern            — add dynamic blocklist pattern (mentor auth)
 *   GET    /api/secops/stats              — aggregate risk stats (mentor auth)
 *   GET    /api/secops/cyberdemon/queue   — pending Cyberdemon dispatch queue (mentor auth)
 *   POST   /api/secops/cyberdemon/flush   — mark queue items dispatched (mentor auth)
 *   POST   /api/secops/ragethesage/export — export labelled data to S3 for training (mentor auth)
 *   POST   /api/secops/ragethesage/train  — trigger RageSage SageMaker pipeline (mentor auth)
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireMentor } from '../middleware/requireMentor.js';
import {
  scoreContent,
  loadDynamicPatterns,
  isDynamicPatternStale,
} from '../lib/contentIndex.js';
import {
  insertRawContent,
  queueCyberDemonEvent,
  listFlagged,
  saveLabel,
  addBlockedPattern,
  loadBlockedPatterns,
  getStats,
  getPendingCyberDemonEvents,
  markCyberDemonDispatched,
  getUnlabelledForExport,
  markExportedToS3,
} from '../lib/secopsDb.js';
import { logger } from '../lib/logger.js';
import { SageMakerClient, StartPipelineExecutionCommand } from '@aws-sdk/client-sagemaker';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const router = Router();

const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const RAGETHESAGE_PIPELINE_ARN = process.env.RAGETHESAGE_PIPELINE_ARN ?? '';
const SECOPS_S3_BUCKET = process.env.SECOPS_S3_BUCKET ?? '';

// ---------------------------------------------------------------------------
// Pattern cache refresh helper
// ---------------------------------------------------------------------------

async function refreshPatternsIfStale(): Promise<void> {
  if (isDynamicPatternStale()) {
    try {
      const rows = await loadBlockedPatterns();
      loadDynamicPatterns(rows);
    } catch (err) {
      logger.warn({ err }, 'Failed to refresh dynamic content patterns');
    }
  }
}

// ---------------------------------------------------------------------------
// POST /api/secops/ingest
// ---------------------------------------------------------------------------

const IngestSchema = z.object({
  text:        z.string().min(1).max(50_000),
  sourceId:    z.string().optional(),
  sourceType:  z.enum(['chat', 'mentor_input', 'lex_intake', 'api_payload']).default('chat'),
});

router.post('/ingest', async (req, res) => {
  try {
    const { text, sourceId, sourceType } = IngestSchema.parse(req.body);
    await refreshPatternsIfStale();

    const scores = scoreContent(text);

    // Always persist flagged content (tier != CLEAN) and optionally CLEAN for training diversity
    const shouldPersist = scores.tier !== 'CLEAN' || Math.random() < 0.05; // 5% clean samples
    let contentId: number | null = null;

    if (shouldPersist) {
      contentId = await insertRawContent({ sourceId: sourceId ?? null, sourceType, rawText: text, scores });

      // Cyberdemon event for HIGH and CRITICAL
      if (scores.tier === 'HIGH' || scores.tier === 'CRITICAL') {
        const eventType = scores.pmiScore >= 0.65 ? 'CRITICAL_PMI'
                        : scores.compositeRisk >= 0.85 ? 'HIGH_RISK_CONTENT'
                        : 'PATTERN_BREACH';

        void queueCyberDemonEvent({
          contentId,
          eventType,
          severity: scores.tier,
          payload: {
            sourceId,
            sourceType,
            profanityScore: scores.profanityScore,
            vulgarityScore: scores.vulgarityScore,
            pmiScore: scores.pmiScore,
            compositeRisk: scores.compositeRisk,
            flags: scores.flags,
            charCount: text.length,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    return res.json({
      contentId,
      tier: scores.tier,
      compositeRisk: scores.compositeRisk,
      pmiScore: scores.pmiScore,
      profanityScore: scores.profanityScore,
      vulgarityScore: scores.vulgarityScore,
      flags: scores.flags,
      blocked: scores.tier === 'CRITICAL' || scores.tier === 'HIGH',
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.flatten() });
    logger.error({ err }, 'secops/ingest error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/secops/flagged
// ---------------------------------------------------------------------------

router.get('/flagged', requireMentor, async (req, res) => {
  try {
    const tier     = req.query.tier as string | undefined;
    const reviewed = req.query.reviewed !== undefined
                   ? req.query.reviewed === 'true'
                   : false;
    const limit  = Math.min(Number(req.query.limit  ?? 50), 200);
    const offset = Number(req.query.offset ?? 0);

    const result = await listFlagged({ tier, reviewed, limit, offset });
    return res.json(result);
  } catch (err) {
    logger.error({ err }, 'secops/flagged error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/secops/label/:id
// ---------------------------------------------------------------------------

const LabelSchema = z.object({
  labelProfanity: z.number().min(0).max(1),
  labelVulgarity: z.number().min(0).max(1),
  labelPmi:       z.number().min(0).max(1),
  notes:          z.string().default(''),
});

router.post('/label/:id', requireMentor, async (req, res) => {
  try {
    const contentId = Number(req.params.id);
    if (!Number.isFinite(contentId)) return res.status(400).json({ error: 'Invalid id' });

    const body   = LabelSchema.parse(req.body);
    const mentor = res.locals.mentor as { email: string };

    await saveLabel({
      contentId,
      labelProfanity: body.labelProfanity,
      labelVulgarity: body.labelVulgarity,
      labelPmi:       body.labelPmi,
      notes:          body.notes,
      labelledBy:     mentor.email,
    });

    return res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.flatten() });
    logger.error({ err }, 'secops/label error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/secops/pattern
// ---------------------------------------------------------------------------

const PatternSchema = z.object({
  patternRegex: z.string().min(1),
  category:     z.enum(['profanity', 'vulgarity', 'pmi']),
  label:        z.string().min(1),
  weight:       z.number().min(0).max(1),
});

router.post('/pattern', requireMentor, async (req, res) => {
  try {
    const body   = PatternSchema.parse(req.body);
    const mentor = res.locals.mentor as { email: string };

    // Validate the regex compiles
    try { new RegExp(body.patternRegex); } catch {
      return res.status(400).json({ error: 'Invalid regex' });
    }

    await addBlockedPattern({ ...body, addedBy: mentor.email });

    // Force refresh on next ingest
    const rows = await loadBlockedPatterns();
    loadDynamicPatterns(rows);

    return res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.flatten() });
    logger.error({ err }, 'secops/pattern error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/secops/stats
// ---------------------------------------------------------------------------

router.get('/stats', requireMentor, async (_req, res) => {
  try {
    const stats = await getStats();
    return res.json(stats);
  } catch (err) {
    logger.error({ err }, 'secops/stats error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/secops/cyberdemon/queue
// ---------------------------------------------------------------------------

router.get('/cyberdemon/queue', requireMentor, async (_req, res) => {
  try {
    const events = await getPendingCyberDemonEvents();
    return res.json({ events, count: (events as unknown[]).length });
  } catch (err) {
    logger.error({ err }, 'secops/cyberdemon/queue error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/secops/cyberdemon/flush
// ---------------------------------------------------------------------------

router.post('/cyberdemon/flush', requireMentor, async (req, res) => {
  try {
    const { eventIds } = z.object({ eventIds: z.array(z.number()) }).parse(req.body);
    await markCyberDemonDispatched(eventIds);
    return res.json({ ok: true, flushed: eventIds.length });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.flatten() });
    logger.error({ err }, 'secops/cyberdemon/flush error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/secops/ragethesage/export
// Exports labelled training data to S3 as NDJSON for RageSage to consume
// ---------------------------------------------------------------------------

router.post('/ragethesage/export', requireMentor, async (_req, res) => {
  try {
    if (!SECOPS_S3_BUCKET) return res.status(503).json({ error: 'SECOPS_S3_BUCKET not configured' });

    const rows = await getUnlabelledForExport(500) as Array<Record<string, unknown>>;
    if (rows.length === 0) return res.json({ ok: true, exported: 0, message: 'No new labelled data' });

    const ndjson = rows.map(r => JSON.stringify(r)).join('\n');
    const s3Key  = `secops/training/${new Date().toISOString().slice(0, 10)}/batch-${Date.now()}.ndjson`;

    const s3 = new S3Client({ region: AWS_REGION });
    await s3.send(new PutObjectCommand({
      Bucket:      SECOPS_S3_BUCKET,
      Key:         s3Key,
      Body:        ndjson,
      ContentType: 'application/x-ndjson',
    }));

    const contentIds = rows.map(r => r.id as number);
    await markExportedToS3(contentIds, s3Key);

    logger.info({ count: rows.length, s3Key }, 'RageSage training data exported');
    return res.json({ ok: true, exported: rows.length, s3Key });
  } catch (err) {
    logger.error({ err }, 'secops/ragethesage/export error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/secops/ragethesage/train
// Triggers the RageSage SageMaker pipeline
// ---------------------------------------------------------------------------

router.post('/ragethesage/train', requireMentor, async (_req, res) => {
  try {
    if (!RAGETHESAGE_PIPELINE_ARN) {
      return res.status(503).json({ error: 'RAGETHESAGE_PIPELINE_ARN not configured' });
    }

    const sm = new SageMakerClient({ region: AWS_REGION });
    const executionName = `ragethesage-${Date.now()}`;

    // StartPipelineExecution requires the pipeline NAME, not ARN.
    // RAGETHESAGE_PIPELINE_ARN may be the full ARN; extract the name portion.
    const pipelineName = RAGETHESAGE_PIPELINE_ARN.includes(':')
      ? RAGETHESAGE_PIPELINE_ARN.split('/').pop()!
      : RAGETHESAGE_PIPELINE_ARN;

    const result = await sm.send(new StartPipelineExecutionCommand({
      PipelineName:            pipelineName,
      PipelineExecutionDisplayName: executionName,
      PipelineExecutionDescription: 'Manual trigger from SecOps mentor portal',
      PipelineParameters: [
        { Name: 'TrainingDataDate', Value: new Date().toISOString().slice(0, 10) },
        { Name: 'MinF1Threshold',   Value: '0.78' },
      ],
    }));

    logger.info({ executionArn: result.PipelineExecutionArn }, 'RageSage pipeline triggered');
    return res.json({ ok: true, executionArn: result.PipelineExecutionArn, executionName });
  } catch (err) {
    logger.error({ err }, 'secops/ragethesage/train error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

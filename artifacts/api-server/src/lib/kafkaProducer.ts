/**
 * Confluent Cloud Kafka producer (replaces MSK IAM producer).
 *
 * Auth: SASL/PLAIN using Confluent Cloud API key + secret.
 * Falls back gracefully (logs only) when KAFKA_BOOTSTRAP is not set —
 * so the server works in local dev without Confluent access.
 *
 * Required env vars (all set automatically by ECS task definition via Secrets Manager):
 *   KAFKA_BOOTSTRAP   — pkc-*.confluent.cloud:9092
 *   KAFKA_API_KEY     — Confluent Cloud API key
 *   KAFKA_API_SECRET  — Confluent Cloud API secret
 *
 * Topics produced:
 *   subscription.created       — new subscription activations
 *   subscription.cancelled     — cancellations / expirations
 *   payment.fiat.events        — Stripe checkout completions
 *   payment.crypto.events      — on-chain payment confirmations
 *   mentor.metrics.snapshots   — scholarship metric reads
 *   blockchain.token.events    — SARA / ETH token events
 *   academic.course.viewed     — Research Navigator course detail opens
 *   academic.search.query      — search bar queries
 *   academic.plan.generated    — AI mentor plan generations
 *   academic.profile.saved     — research profile saves
 */

import { logger as baseLogger } from './logger.js';

const logger = baseLogger.child({ module: 'kafka-producer' });

interface KafkaMessage {
  topic: string;
  key?: string;
  value: Record<string, unknown>;
}

// ─── Lazy singleton producer ──────────────────────────────────────────────────

let _producer: import('./kafkaProducerClient.js').KafkaProducerClient | null = null;

async function getProducer() {
  if (_producer) return _producer;

  const bootstrap = process.env.KAFKA_BOOTSTRAP;
  const apiKey    = process.env.KAFKA_API_KEY;
  const apiSecret = process.env.KAFKA_API_SECRET;

  if (!bootstrap || !apiKey || !apiSecret) {
    logger.debug('Confluent credentials not set — Kafka events will be logged only');
    return null;
  }

  try {
    const { KafkaProducerClient } = await import('./kafkaProducerClient.js');
    _producer = new KafkaProducerClient(bootstrap, apiKey, apiSecret);
    await _producer.connect();
    logger.info({ bootstrap }, 'Confluent Kafka producer connected');
    return _producer;
  } catch (err) {
    logger.warn({ err }, 'Confluent Kafka producer failed to connect — events will be logged only');
    return null;
  }
}

// ─── Public emit function ─────────────────────────────────────────────────────

export async function emitEvent(msg: KafkaMessage): Promise<void> {
  const enriched = {
    ...msg.value,
    _emitted_at: new Date().toISOString(),
    _source:     'api-server',
  };

  const producer = await getProducer();
  if (!producer) {
    logger.debug({ topic: msg.topic, value: enriched }, 'Kafka event (no-op — no Confluent)');
    return;
  }

  try {
    await producer.send({
      topic: msg.topic,
      key:   msg.key,
      value: JSON.stringify(enriched),
    });
  } catch (err) {
    // Never crash a request due to Kafka failure
    logger.error({ err, topic: msg.topic }, 'Confluent Kafka emit failed');
  }
}

// ─── Typed event helpers ──────────────────────────────────────────────────────

export const kafka = {
  // ── Subscription & payment ──────────────────────────────────────────────────
  subscriptionCreated: (data: { email: string; tier: string; source: string }) =>
    emitEvent({ topic: 'subscription.created', key: data.email, value: { ...data, timestamp: Date.now() } }),

  subscriptionCancelled: (data: { email: string; reason?: string }) =>
    emitEvent({ topic: 'subscription.cancelled', key: data.email, value: { ...data, timestamp: Date.now() } }),

  paymentFiat: (data: { email: string; amount_usd: number; currency: string; status: string; stripe_session?: string }) =>
    emitEvent({ topic: 'payment.fiat.events', key: data.email, value: { ...data, timestamp: Date.now() } }),

  paymentCrypto: (data: { email: string; tx_hash: string; currency: string; amount_crypto: string; tier: string }) =>
    emitEvent({ topic: 'payment.crypto.events', key: data.tx_hash, value: { ...data, timestamp: Date.now() } }),

  blockchainTokenEvent: (data: { from: string; to: string; value: string; tx_hash: string; event_type: string }) =>
    emitEvent({ topic: 'blockchain.token.events', key: data.tx_hash, value: { ...data, timestamp: Date.now() } }),

  mentorMetricsRead: (data: { mentor_email: string }) =>
    emitEvent({ topic: 'mentor.metrics.snapshots', key: data.mentor_email, value: { ...data, event: 'metrics_read', timestamp: Date.now() } }),

  // ── Research Navigator ───────────────────────────────────────────────────────
  academicCourseViewed: (data: { course_id: string; mit_course_num: string; discipline_id: string; user_email?: string; session_id?: string }) =>
    emitEvent({ topic: 'academic.course.viewed', key: data.course_id, value: { ...data, timestamp: Date.now() } }),

  academicSearchQuery: (data: { query: string; discipline_id?: string; level?: string; results_count: number; user_email?: string }) =>
    emitEvent({ topic: 'academic.search.query', key: data.query.slice(0, 128), value: { ...data, timestamp: Date.now() } }),

  academicPlanGenerated: (data: { user_email?: string; interest: string; discipline: string; difficulty: number; estimated_months: number; topic_id?: string }) =>
    emitEvent({ topic: 'academic.plan.generated', key: data.user_email ?? 'anonymous', value: { ...data, timestamp: Date.now() } }),

  academicProfileSaved: (data: { user_email: string; discipline_id?: string; topic_ids: string[] }) =>
    emitEvent({ topic: 'academic.profile.saved', key: data.user_email, value: { ...data, timestamp: Date.now() } }),
};

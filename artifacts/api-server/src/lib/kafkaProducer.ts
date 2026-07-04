/**
 * Kafka producer for the API server.
 *
 * Uses kafka-node with SASL/IAM authentication for MSK.
 * Falls back gracefully (logs only) when KAFKA_BOOTSTRAP is not set —
 * so the server works in local dev without MSK.
 *
 * Topics produced:
 *   subscription.created      — new subscription activations
 *   subscription.cancelled    — cancellations / expirations
 *   payment.fiat.events       — Stripe checkout completions
 *   payment.crypto.events     — on-chain payment confirmations
 *   mentor.metrics.snapshots  — scholarship metric reads (for audit trail)
 *   blockchain.token.events   — SARA / ETH token events from blockchain routes
 */

import { logger as baseLogger } from './logger.js';

const logger = baseLogger.child({ module: 'kafka-producer' });

interface KafkaMessage {
  topic: string;
  key?: string;
  value: Record<string, unknown>;
}

// ─── Lazy singleton producer ──────────────────────────────────────────────────

let _producer: KafkaProducerClient | null = null;

async function getProducer(): Promise<KafkaProducerClient | null> {
  if (_producer) return _producer;
  const bootstrap = process.env.KAFKA_BOOTSTRAP;
  if (!bootstrap) return null;          // dev mode — no MSK

  try {
    const { KafkaProducerClient } = await import('./kafkaProducerClient.js');
    _producer = new KafkaProducerClient(bootstrap);
    await _producer.connect();
    logger.info({ bootstrap }, 'Kafka producer connected');
    return _producer;
  } catch (err) {
    logger.warn({ err }, 'Kafka producer failed to connect — events will be logged only');
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
    logger.debug({ topic: msg.topic, value: enriched }, 'Kafka event (no-op, no MSK)');
    return;
  }

  try {
    await producer.send({
      topic: msg.topic,
      key:   msg.key,
      value: JSON.stringify(enriched),
    });
  } catch (err) {
    // Never crash the request due to Kafka failure
    logger.error({ err, topic: msg.topic }, 'Kafka emit failed');
  }
}

// ─── Typed event helpers ──────────────────────────────────────────────────────

export const kafka = {
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
};

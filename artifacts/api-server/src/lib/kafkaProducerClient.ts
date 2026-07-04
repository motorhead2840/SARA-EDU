/**
 * Confluent Cloud Kafka producer client.
 *
 * Auth: SASL/PLAIN with Confluent Cloud API key + secret.
 * Was: AWS MSK IAM (SigV4). Changed when MSK was replaced by Confluent Cloud.
 *
 * Required env vars:
 *   KAFKA_BOOTSTRAP   — Confluent bootstrap endpoint (pkc-*.confluent.cloud:9092)
 *   KAFKA_API_KEY     — Confluent Cloud API key (from Secrets Manager in production)
 *   KAFKA_API_SECRET  — Confluent Cloud API secret
 */

import { logger as baseLogger } from './logger.js';

const logger = baseLogger.child({ module: 'kafka-client' });

interface SendOpts {
  topic: string;
  key?: string;
  value: string;
}

export class KafkaProducerClient {
  private readonly bootstrap: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private producer: unknown = null;

  constructor(bootstrap: string, apiKey: string, apiSecret: string) {
    this.bootstrap = bootstrap;
    this.apiKey    = apiKey;
    this.apiSecret = apiSecret;
  }

  async connect(): Promise<void> {
    const { Kafka, logLevel } = await import('kafkajs');

    const brokers = this.bootstrap
      .replace(/^(SASL_SSL:\/\/|SSL:\/\/)/i, '')
      .split(',')
      .map((b) => b.trim());

    const kafka = new (Kafka as any)({
      clientId:  'sri-api-server',
      brokers,
      ssl:       true,
      sasl: {
        mechanism: 'plain',
        username:  this.apiKey,
        password:  this.apiSecret,
      },
      logLevel:  logLevel.WARN,
    });

    this.producer = kafka.producer({
      allowAutoTopicCreation: false,
      retry: { retries: 5, initialRetryTime: 300 },
      compression: 2, // LZ4
    });

    await (this.producer as any).connect();
  }

  async send(opts: SendOpts): Promise<void> {
    if (!this.producer) throw new Error('Producer not connected');
    await (this.producer as any).send({
      topic:    opts.topic,
      messages: [{ key: opts.key ?? null, value: opts.value }],
    });
  }

  async disconnect(): Promise<void> {
    if (this.producer) {
      await (this.producer as any).disconnect();
      this.producer = null;
    }
  }
}

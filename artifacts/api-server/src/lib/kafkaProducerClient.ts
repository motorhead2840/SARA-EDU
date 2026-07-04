/**
 * Thin wrapper around kafkajs with MSK IAM auth support.
 * kafkajs is lighter than kafka-node and has first-class TypeScript types.
 *
 * IAM auth is provided via the AWS MSK IAM SASL mechanism.
 * kafkajs does not ship MSK IAM built-in; we implement the SASL mechanism
 * using the AWS SDK v3 SigV4 signer which is already in the project via @aws-sdk.
 */

import { logger as baseLogger } from './logger.js';

const logger = baseLogger.child({ module: 'kafka-client' });

interface SendOpts {
  topic: string;
  key?: string;
  value: string;
}

export class KafkaProducerClient {
  private bootstrap: string;
  private producer: unknown = null;

  constructor(bootstrap: string) {
    this.bootstrap = bootstrap;
  }

  async connect(): Promise<void> {
    // Dynamic import so dev environment doesn't need kafkajs installed
    const { Kafka, logLevel } = await import('kafkajs');

    const brokers = this.bootstrap.split(',').map((b) => b.trim());

    const kafka = new (Kafka as any)({
      clientId: 'sri-api-server',
      brokers,
      ssl: true,
      sasl: {
        mechanism: 'aws',
        authenticationProvider: await this._mskIamProvider(),
      },
      logLevel: logLevel.WARN,
    });

    this.producer = kafka.producer({
      allowAutoTopicCreation: false,
      retry: { retries: 5, initialRetryTime: 300 },
    });

    await (this.producer as any).connect();
  }

  async send(opts: SendOpts): Promise<void> {
    if (!this.producer) throw new Error('Producer not connected');
    await (this.producer as any).send({
      topic: opts.topic,
      messages: [{ key: opts.key ?? null, value: opts.value }],
    });
  }

  async disconnect(): Promise<void> {
    if (this.producer) {
      await (this.producer as any).disconnect();
      this.producer = null;
    }
  }

  /** Build an MSK IAM SASL authentication provider using AWS SigV4. */
  private async _mskIamProvider() {
    const { defaultProvider } = await import('@aws-sdk/credential-providers');
    const { SignatureV4 } = await import('@smithy/signature-v4');
    const { Sha256 } = await import('@aws-crypto/sha256-js');

    const region = process.env.AWS_REGION ?? 'us-east-1';
    const credProvider = defaultProvider();

    return {
      authenticationProvider: async () => {
        const creds = await credProvider();
        const signer = new SignatureV4({
          credentials: creds,
          region,
          service: 'kafka-cluster',
          sha256: Sha256 as any,
        });

        const signed = await signer.sign({
          method: 'GET',
          hostname: 'kafka.amazonaws.com',
          path: '/',
          headers: { host: 'kafka.amazonaws.com', 'x-amz-date': new Date().toISOString().replace(/[:-]/g, '').slice(0, 15) + 'Z' },
          query: { Action: 'kafka-cluster:Connect' },
          body: '',
          protocol: 'https:',
        });

        return {
          version: '2020_10_22',
          host: signed.hostname,
          ...signed.headers,
        };
      },
    };
  }
}

import { Kafka, Consumer, Producer } from "kafkajs";
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: process.env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
});

// ─── Configuration ───────────────────────────────────────────────────────────
const BOOTSTRAP_SERVERS = process.env.KAFKA_BOOTSTRAP_SERVERS || "localhost:9092";
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || "threat-detection-service";
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || "threat-detection-group";
const SASL_USERNAME = process.env.KAFKA_SASL_USERNAME;
const SASL_PASSWORD = process.env.KAFKA_SASL_PASSWORD;

// Topics
const TOPIC_WAF_LOGS = "security.waf.logs";
const TOPIC_AUTH_EVENTS = "security.auth.events";
const TOPIC_DETECTED_THREATS = "security.detected.threats";

// Threat Detection Thresholds
const FAILED_LOGIN_THRESHOLD = Number(process.env.FAILED_LOGIN_THRESHOLD) || 5; // failed attempts from same IP
const THRESHOLD_WINDOW_MS = Number(process.env.THRESHOLD_WINDOW_MS) || 60 * 1000; // 1 minute sliding window
const CACHE_CLEANUP_INTERVAL_MS = Number(process.env.CACHE_CLEANUP_INTERVAL_MS) || 30 * 1000; // stale cache cleanup interval

// In-memory sliding window cache for simplified stream analysis (replaces local ksqlDB state in TS tier)
interface RequestTrace {
  timestamp: number;
  type: "failed_login" | "waf_block";
}
const ipTraceCache = new Map<string, RequestTrace[]>();

// Clean up stale cache records periodically to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, traces] of ipTraceCache.entries()) {
    const freshTraces = traces.filter((t) => now - t.timestamp < THRESHOLD_WINDOW_MS);
    if (freshTraces.length === 0) {
      ipTraceCache.delete(ip);
    } else {
      ipTraceCache.set(ip, freshTraces);
    }
  }
}, CACHE_CLEANUP_INTERVAL_MS);

// Initialize Kafka client with Optional Confluent SASL configuration
const saslConfig = SASL_USERNAME && SASL_PASSWORD
  ? { mechanism: "plain" as const, username: SASL_USERNAME, password: SASL_PASSWORD }
  : undefined;

const kafka = new Kafka({
  clientId: KAFKA_CLIENT_ID,
  brokers: BOOTSTRAP_SERVERS.split(","),
  ssl: !!saslConfig,
  sasl: saslConfig,
});

let consumer: Consumer;
let producer: Producer;

async function processWafLog(payload: any) {
  const sourceIp = payload.clientIp || payload.source_ip;
  if (!sourceIp) return;

  logger.debug({ sourceIp, payload }, "Received WAF Access Log");

  // If WAF already flagged as dynamic-block or rate-limit, track or escalate
  if (payload.action === "BLOCK") {
    logger.warn({ sourceIp, rule: payload.rule }, "WAF blocked malicious request from client IP");
  }
}

async function processAuthEvent(payload: any) {
  const sourceIp = payload.source_ip || payload.client_ip;
  const status = payload.status; // "success" | "failed"
  const username = payload.username;

  if (!sourceIp) return;

  logger.info({ sourceIp, username, status }, "Received Authentication Event");

  if (status === "failed") {
    const now = Date.now();
    let traces = ipTraceCache.get(sourceIp) || [];
    traces.push({ timestamp: now, type: "failed_login" });

    // Filter traces within sliding window
    traces = traces.filter((t) => now - t.timestamp < THRESHOLD_WINDOW_MS);
    ipTraceCache.set(sourceIp, traces);

    const failedCount = traces.filter((t) => t.type === "failed_login").length;
    logger.debug({ sourceIp, failedCount }, "Aggregated failed logins in sliding window");

    // Trigger threat if threshold breached
    if (failedCount >= FAILED_LOGIN_THRESHOLD) {
      logger.error({ sourceIp, failedCount }, "Adversary credential stuffing pattern detected!");
      await emitThreat(sourceIp, "credential_stuffing", failedCount / FAILED_LOGIN_THRESHOLD);
    }
  }
}

async function emitThreat(sourceIp: string, threatType: string, confidence: number) {
  const threatPayload = {
    source_ip: sourceIp,
    threat_type: threatType,
    confidence: Math.min(confidence, 1.0),
    detected_at: new Date().toISOString(),
    details: `Detected ${threatType} with ${confidence * 100}% threshold confidence rating.`,
  };

  try {
    await producer.send({
      topic: TOPIC_DETECTED_THREATS,
      messages: [
        {
          key: sourceIp,
          value: JSON.stringify(threatPayload),
        },
      ],
    });
    logger.info({ sourceIp, threatType }, "Successfully produced dynamic threat blocklist mitigation signal");
  } catch (err) {
    logger.error({ err, sourceIp }, "Failed to produce threat mitigation signal to Kafka");
  }
}

async function start() {
  logger.info("Initializing Global Defense Network Stream Processing Engine...");

  consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });
  producer = kafka.producer();

  await consumer.connect();
  await producer.connect();

  logger.info("Connected to Confluent Cloud Kafka endpoints.");

  // Subscribe to raw event streams
  await consumer.subscribe({ topics: [TOPIC_WAF_LOGS, TOPIC_AUTH_EVENTS], fromBeginning: false });

  logger.info({ topics: [TOPIC_WAF_LOGS, TOPIC_AUTH_EVENTS] }, "Subscribed to streams.");

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        if (!message.value) return;
        const payload = JSON.parse(message.value.toString());

        if (topic === TOPIC_WAF_LOGS) {
          await processWafLog(payload);
        } else if (topic === TOPIC_AUTH_EVENTS) {
          await processAuthEvent(payload);
        }
      } catch (err) {
        logger.error({ err, topic, partition, offset: message.offset }, "Error processing Kafka message");
      }
    },
  });
}

// Handle shutdown gracefully
const stop = async () => {
  logger.info("Shutting down threat detection services gracefully...");
  if (consumer) await consumer.disconnect();
  if (producer) await producer.disconnect();
  process.exit(0);
};

process.on("SIGTERM", stop);
process.on("SIGINT", stop);

start().catch((err) => {
  logger.fatal(err, "Fatal exception on threat detection startup");
  process.exit(1);
});

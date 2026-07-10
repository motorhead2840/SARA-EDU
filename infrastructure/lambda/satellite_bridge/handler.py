"""
Satellite → Kafka Bridge Lambda
---------------------------------
Triggered by Kinesis Data Stream (satellite_data) when AWS Ground Station
delivers satellite telemetry. Decodes the frame, archives raw data to S3,
and publishes a structured event to the 'data.cleaned' Kafka topic.

The bridge normalises raw satellite frames into a schema suitable for the
downstream Airflow data cleaning pipeline.
"""

import base64
import json
import logging
import os
import time
from typing import Any

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

KAFKA_TOPIC       = os.environ.get("KAFKA_TOPIC", "data.cleaned")
S3_BUCKET         = os.environ.get("S3_BUCKET", "")
S3_PREFIX         = os.environ.get("S3_PREFIX", "satellite/")
AWS_REGION        = os.environ.get("AWS_REGION", "us-east-1")
CONFLUENT_SECRET  = os.environ.get("CONFLUENT_SECRET_NAME", "sri/production/confluent/lambda-key")

s3 = boto3.client("s3",            region_name=AWS_REGION)
sm = boto3.client("secretsmanager", region_name=AWS_REGION)

_confluent_producer = None


def _get_confluent_producer():
    global _confluent_producer
    if _confluent_producer:
        return _confluent_producer
    try:
        import json as _json
        from confluent_kafka import Producer  # type: ignore
        secret = _json.loads(sm.get_secret_value(SecretId=CONFLUENT_SECRET)["SecretString"])
        bootstrap = secret["bootstrap"].replace("SASL_SSL://", "").replace("SSL://", "")
        _confluent_producer = Producer({
            "bootstrap.servers":  bootstrap,
            "security.protocol": "SASL_SSL",
            "sasl.mechanisms":   "PLAIN",
            "sasl.username":     secret["api_key"],
            "sasl.password":     secret["api_secret"],
            "client.id":         "satellite-bridge",
            "acks":              "1",
            "retries":           3,
        })
        logger.info("Confluent producer initialised for satellite-bridge")
        return _confluent_producer
    except Exception as exc:
        logger.warning("Confluent producer init failed: %s", exc)
        return None


def _decode_frame(data_b64: str) -> dict:
    """Decode a raw Ground Station frame into a structured dict."""
    try:
        raw_bytes = base64.b64decode(data_b64)
    except Exception as exc:
        # Invalid base64 — return a descriptive error dict; raw_bytes may be unbound
        logger.warning("Base64 decode failed: %s", exc)
        return {"format": "invalid", "error": str(exc), "raw_b64_len": len(data_b64)}

    try:
        # Attempt JSON parse (Ground Station can deliver structured payloads)
        return json.loads(raw_bytes)
    except (json.JSONDecodeError, ValueError):
        # Binary frame — return as hex for downstream processing
        return {
            "format":   "binary",
            "hex":      raw_bytes.hex(),
            "byte_len": len(raw_bytes),
        }


def _archive_to_s3(record_id: str, frame: dict) -> str:
    """Archive raw frame to S3 data lake. Returns S3 key."""
    ts = int(time.time())
    key = f"{S3_PREFIX}{ts // 86400 * 86400}/{record_id}.json"
    if S3_BUCKET:
        try:
            s3.put_object(
                Bucket=S3_BUCKET,
                Key=key,
                Body=json.dumps(frame).encode(),
                ContentType="application/json",
            )
        except Exception as exc:
            logger.warning("S3 archive failed: %s", exc)
    return key


def _publish_to_kafka(events: list[dict]) -> int:
    """Publish normalised events to Confluent Cloud Kafka. Returns count published."""
    if not events:
        return 0
    producer = _get_confluent_producer()
    if producer is None:
        logger.warning("No Confluent producer — skipping Kafka publish for %d events", len(events))
        return 0
    try:
        for ev in events:
            producer.produce(KAFKA_TOPIC, key=str(ev.get("sequence_number", "")).encode(),
                             value=json.dumps(ev).encode())
        producer.flush(timeout=30)
        return len(events)
    except Exception as exc:
        logger.error("Confluent Kafka publish failed: %s", exc)
        return 0


def lambda_handler(event: dict, context: Any) -> dict:
    records = event.get("Records", [])
    logger.info("Processing %d Kinesis records from Ground Station", len(records))

    normalised_events = []
    for record in records:
        kinesis = record.get("kinesis", {})
        data_b64 = kinesis.get("data", "")
        seq_num  = kinesis.get("sequenceNumber", "unknown")
        approx_ts = kinesis.get("approximateArrivalTimestamp", time.time())

        frame = _decode_frame(data_b64)
        s3_key = _archive_to_s3(seq_num, frame)

        normalised = {
            "_source_topic":    "satellite",
            "_source_service":  "aws_ground_station",
            "_cleaned_at":      int(time.time() * 1000),
            "sequence_number":  seq_num,
            "arrival_timestamp": int(approx_ts * 1000),
            "s3_archive_key":   s3_key,
            "frame_format":     frame.get("format", "json"),
            "payload":          frame,
        }
        normalised_events.append(normalised)

    published = _publish_to_kafka(normalised_events)
    logger.info("Published %d/%d satellite records to Kafka topic '%s'", published, len(records), KAFKA_TOPIC)

    return {
        "statusCode": 200,
        "records_processed": len(records),
        "published_to_kafka": published,
    }

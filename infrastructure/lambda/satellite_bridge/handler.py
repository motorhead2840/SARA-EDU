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

KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP", "")
KAFKA_TOPIC     = os.environ.get("KAFKA_TOPIC", "data.cleaned")
S3_BUCKET       = os.environ.get("S3_BUCKET", "")
S3_PREFIX       = os.environ.get("S3_PREFIX", "satellite/")
AWS_REGION      = os.environ.get("AWS_REGION", "us-east-1")

s3 = boto3.client("s3", region_name=AWS_REGION)


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
    """Publish normalised events to Kafka. Returns count published."""
    if not KAFKA_BOOTSTRAP or not events:
        return 0
    try:
        from kafka import KafkaProducer  # type: ignore
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP.split(","),
            security_protocol="SASL_SSL",
            sasl_mechanism="AWS_MSK_IAM",
            value_serializer=lambda v: json.dumps(v).encode(),
        )
        for ev in events:
            producer.send(KAFKA_TOPIC, value=ev)
        producer.flush()
        producer.close()
        return len(events)
    except Exception as exc:
        logger.error("Kafka publish failed: %s", exc)
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

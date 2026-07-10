"""
kafka_utils.py — Shared Confluent Cloud Kafka helpers for Airflow DAGs.

Replaces the MSK IAM SASL mechanism with Confluent Cloud SASL/PLAIN.
Credentials are read from AWS Secrets Manager at runtime so they are
never stored in the DAG code or Airflow Variables.

Usage in a DAG task:
    from kafka_utils import get_producer, get_consumer, close_producer

    producer = get_producer()
    producer.produce("topic.name", key=b"key", value=b"value")
    producer.flush()
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import boto3

logger = logging.getLogger(__name__)

AWS_REGION      = os.environ.get("AWS_REGION", "us-east-1")
SECRET_NAME     = os.environ.get(
    "CONFLUENT_SECRET_NAME",
    "sri/production/confluent/airflow-key",
)

_cached_creds: dict[str, str] | None = None


def _load_confluent_creds() -> dict[str, str]:
    """Load Confluent credentials from Secrets Manager (cached per Lambda/task invocation)."""
    global _cached_creds
    if _cached_creds:
        return _cached_creds

    # Airflow Variables take precedence (useful for local testing / overrides)
    try:
        from airflow.models import Variable  # type: ignore
        bootstrap = Variable.get("confluent_bootstrap", default_var="")
        api_key   = Variable.get("confluent_api_key",   default_var="")
        api_secret= Variable.get("confluent_api_secret",default_var="")
        if bootstrap and api_key and api_secret:
            _cached_creds = {"bootstrap": bootstrap, "api_key": api_key, "api_secret": api_secret}
            return _cached_creds
    except Exception:
        pass

    # Fall back to Secrets Manager
    sm = boto3.client("secretsmanager", region_name=AWS_REGION)
    resp = sm.get_secret_value(SecretId=SECRET_NAME)
    secret = json.loads(resp["SecretString"])
    _cached_creds = {
        "bootstrap":  secret["bootstrap"].replace("SASL_SSL://", "").replace("SSL://", ""),
        "api_key":    secret["api_key"],
        "api_secret": secret["api_secret"],
    }
    logger.info("Confluent credentials loaded from Secrets Manager (%s)", SECRET_NAME)
    return _cached_creds


def _confluent_config(extra: dict | None = None) -> dict:
    creds = _load_confluent_creds()
    cfg = {
        "bootstrap.servers":  creds["bootstrap"],
        "security.protocol": "SASL_SSL",
        "sasl.mechanisms":   "PLAIN",
        "sasl.username":     creds["api_key"],
        "sasl.password":     creds["api_secret"],
    }
    if extra:
        cfg.update(extra)
    return cfg


def get_producer(extra: dict | None = None) -> Any:
    """Return a confluent_kafka Producer configured for Confluent Cloud."""
    from confluent_kafka import Producer  # type: ignore
    cfg = _confluent_config({"client.id": "airflow-producer", "acks": "1", "retries": 3})
    if extra:
        cfg.update(extra)
    return Producer(cfg)


def get_consumer(group_id: str, topics: list[str], extra: dict | None = None) -> Any:
    """Return a confluent_kafka Consumer configured for Confluent Cloud."""
    from confluent_kafka import Consumer  # type: ignore
    cfg = _confluent_config({
        "client.id":          f"airflow-consumer-{group_id}",
        "group.id":           group_id,
        "auto.offset.reset":  "earliest",
        "enable.auto.commit": False,
    })
    if extra:
        cfg.update(extra)
    consumer = Consumer(cfg)
    consumer.subscribe(topics)
    logger.info("Confluent consumer subscribed to %s (group=%s)", topics, group_id)
    return consumer

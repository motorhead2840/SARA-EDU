"""
stream_cleaner.py
-----------------
Airflow DAG: consumes raw events from all MSK Kafka topics, applies a
cleaning + enrichment pipeline, then writes the results to:
  - S3 data lake  (Parquet, partitioned by date/topic)
  - OpenSearch    (for search and analytics)
  - SageMaker Feature Store (student engagement features)

Schedule: every 15 minutes (near-real-time micro-batch).

Topics consumed:
  shri.session.events, shri.chat.messages, shri.frustration.events,
  subscription.created, subscription.cancelled,
  payment.fiat.events, payment.crypto.events,
  mentor.metrics.snapshots, blockchain.token.events
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta
from typing import Any

import boto3
from airflow import DAG
from airflow.models import Variable
from airflow.operators.python import PythonOperator
from airflow.utils.dates import days_ago

logger = logging.getLogger(__name__)

# ─── Configuration ─────────────────────────────────────────────────────────────

KAFKA_BOOTSTRAP   = Variable.get("kafka_bootstrap_servers", default_var=os.environ.get("KAFKA_BOOTSTRAP", ""))
OPENSEARCH_URL    = Variable.get("opensearch_url",          default_var=os.environ.get("OPENSEARCH_URL",  ""))
DATA_LAKE_BUCKET  = Variable.get("s3_data_lake_bucket",     default_var=os.environ.get("S3_DATA_LAKE_BUCKET", ""))
SAGEMAKER_FG_NAME = Variable.get("sagemaker_feature_group", default_var="sri-production-student-engagement")
AWS_REGION        = Variable.get("aws_region",              default_var="us-east-1")

RAW_TOPICS = [
    "shri.session.events",
    "shri.chat.messages",
    "shri.frustration.events",
    "subscription.created",
    "subscription.cancelled",
    "payment.fiat.events",
    "payment.crypto.events",
    "mentor.metrics.snapshots",
    "blockchain.token.events",
]

POLL_TIMEOUT_MS   = 10_000   # 10 s per topic poll
MAX_RECORDS       = 5_000    # max records per DAG run per topic

# ─── Cleaning Rules ────────────────────────────────────────────────────────────

REQUIRED_FIELDS: dict[str, list[str]] = {
    "shri.session.events":      ["session_id", "email", "event", "timestamp"],
    "shri.chat.messages":       ["session_id", "role",  "content", "timestamp"],
    "shri.frustration.events":  ["session_id", "level", "circuit", "timestamp"],
    "subscription.created":     ["email", "tier", "source", "timestamp"],
    "subscription.cancelled":   ["email", "timestamp"],
    "payment.fiat.events":      ["email", "amount_usd", "currency", "status", "timestamp"],
    "payment.crypto.events":    ["email", "tx_hash", "currency", "amount_crypto", "timestamp"],
    "mentor.metrics.snapshots": ["generated_at", "subscriptions"],
    "blockchain.token.events":  ["tx_hash", "from", "to", "value", "timestamp"],
}

PII_FIELDS = {"ip_address", "user_agent", "raw_email", "phone"}  # strip these


def _clean_record(topic: str, record: dict[str, Any]) -> dict[str, Any] | None:
    """
    Validate, clean, and redact a single record.
    Returns None if the record should be dropped.
    """
    required = REQUIRED_FIELDS.get(topic, [])
    for field in required:
        if field not in record or record[field] is None:
            logger.debug("Dropping record missing field '%s' on topic %s", field, topic)
            return None

    # Strip PII
    for pii in PII_FIELDS:
        record.pop(pii, None)

    # Normalise timestamp to ISO-8601
    ts = record.get("timestamp")
    if isinstance(ts, (int, float)):
        record["timestamp"] = datetime.utcfromtimestamp(ts / 1000).isoformat() + "Z"

    # Truncate chat content > 10 KB (pathological inputs)
    if "content" in record and isinstance(record["content"], str):
        record["content"] = record["content"][:10_240]

    # Normalise email to lowercase
    if "email" in record:
        record["email"] = str(record["email"]).lower().strip()

    record["_cleaned_at"] = datetime.utcnow().isoformat() + "Z"
    record["_source_topic"] = topic
    return record


# ─── Task Functions ────────────────────────────────────────────────────────────

def consume_and_clean(**context: Any) -> dict[str, int]:
    """Poll all raw Kafka topics, clean records, push to XCom."""
    from kafka import KafkaConsumer  # type: ignore
    from kafka.errors import NoBrokersAvailable  # type: ignore

    if not KAFKA_BOOTSTRAP:
        logger.warning("KAFKA_BOOTSTRAP not set — skipping consume step")
        return {}

    cleaned: dict[str, list[dict]] = {t: [] for t in RAW_TOPICS}
    stats: dict[str, int] = {}

    try:
        consumer = KafkaConsumer(
            *RAW_TOPICS,
            bootstrap_servers=KAFKA_BOOTSTRAP.split(","),
            security_protocol="SASL_SSL",
            sasl_mechanism="AWS_MSK_IAM",
            group_id="airflow-stream-cleaner",
            auto_offset_reset="earliest",
            enable_auto_commit=False,
            consumer_timeout_ms=POLL_TIMEOUT_MS,
            value_deserializer=lambda b: json.loads(b.decode("utf-8", errors="replace")),
            max_poll_records=MAX_RECORDS,
        )

        batch = consumer.poll(timeout_ms=POLL_TIMEOUT_MS, max_records=MAX_RECORDS)
        for tp, messages in batch.items():
            topic = tp.topic
            for msg in messages:
                rec = _clean_record(topic, msg.value)
                if rec:
                    cleaned[topic].append(rec)
            stats[topic] = len(cleaned[topic])
            logger.info("Topic %s: %d clean records", topic, stats[topic])

        consumer.commit()
        consumer.close()

    except NoBrokersAvailable:
        logger.error("No Kafka brokers available — check MSK connectivity")
    except Exception as exc:  # noqa: BLE001
        logger.exception("Kafka consume error: %s", exc)

    context["ti"].xcom_push(key="cleaned", value=cleaned)
    return stats


def write_to_s3(**context: Any) -> None:
    """Write cleaned records to S3 data lake as newline-delimited JSON."""
    import gzip

    cleaned: dict[str, list[dict]] = context["ti"].xcom_pull(key="cleaned") or {}
    s3 = boto3.client("s3", region_name=AWS_REGION)
    run_date = context["execution_date"].strftime("%Y/%m/%d")

    for topic, records in cleaned.items():
        if not records:
            continue

        safe_topic = topic.replace(".", "_")
        key = f"cleaned/{safe_topic}/{run_date}/{context['run_id']}.ndjson.gz"
        body = gzip.compress(
            "\n".join(json.dumps(r) for r in records).encode()
        )
        s3.put_object(
            Bucket=DATA_LAKE_BUCKET,
            Key=key,
            Body=body,
            ContentEncoding="gzip",
            ContentType="application/x-ndjson",
        )
        logger.info("Wrote %d records to s3://%s/%s", len(records), DATA_LAKE_BUCKET, key)

    # Also publish cleaned records to the downstream topic
    _publish_cleaned(cleaned)


def _publish_cleaned(cleaned: dict[str, list[dict]]) -> None:
    """Publish all cleaned records to the data.cleaned Kafka topic."""
    if not KAFKA_BOOTSTRAP:
        return
    try:
        from kafka import KafkaProducer  # type: ignore

        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP.split(","),
            security_protocol="SASL_SSL",
            sasl_mechanism="AWS_MSK_IAM",
            value_serializer=lambda v: json.dumps(v).encode(),
        )
        for topic, records in cleaned.items():
            for rec in records:
                producer.send("data.cleaned", value=rec)
        producer.flush()
        producer.close()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not publish to data.cleaned: %s", exc)


def index_to_opensearch(**context: Any) -> None:
    """Bulk-index cleaned records into OpenSearch."""
    from opensearchpy import OpenSearch, helpers  # type: ignore

    cleaned: dict[str, list[dict]] = context["ti"].xcom_pull(key="cleaned") or {}
    if not OPENSEARCH_URL or not any(cleaned.values()):
        return

    client = OpenSearch(hosts=[OPENSEARCH_URL], use_ssl=True, verify_certs=True)

    actions = []
    for topic, records in cleaned.items():
        index = f"sri-{topic.replace('.', '-')}"
        for rec in records:
            actions.append({
                "_index": index,
                "_source": rec,
            })

    if actions:
        success, errors = helpers.bulk(client, actions, raise_on_error=False)
        logger.info("OpenSearch: %d indexed, %d errors", success, len(errors))
        for err in errors[:5]:
            logger.warning("OpenSearch error: %s", err)


def update_sagemaker_features(**context: Any) -> None:
    """
    Aggregate student engagement features and upsert into SageMaker Feature Store.
    Only processes shri.* and subscription.* events.
    """
    cleaned: dict[str, list[dict]] = context["ti"].xcom_pull(key="cleaned") or {}

    sm_client = boto3.client("sagemaker-featurestore-runtime", region_name=AWS_REGION)

    # Build per-student aggregates
    students: dict[str, dict] = {}
    for rec in cleaned.get("shri.session.events", []):
        sid = rec.get("email", "")
        if sid:
            students.setdefault(sid, {"session_count": 0, "frustration_sum": 0.0})
            students[sid]["session_count"] += 1

    for rec in cleaned.get("shri.frustration.events", []):
        sid = rec.get("email", "")
        if sid and sid in students:
            students[sid]["frustration_sum"] += float(rec.get("level", 0))

    for rec in cleaned.get("subscription.created", []):
        sid = rec.get("email", "")
        if sid:
            students.setdefault(sid, {})["subscription_tier"] = rec.get("tier", "low")

    event_time = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    pushed = 0
    for email, agg in students.items():
        session_count = agg.get("session_count", 0)
        frustration_avg = (
            agg["frustration_sum"] / session_count if session_count > 0 else 0.0
        )
        try:
            sm_client.put_record(
                FeatureGroupName=SAGEMAKER_FG_NAME,
                Record=[
                    {"FeatureName": "student_id",         "ValueAsString": email},
                    {"FeatureName": "event_time",         "ValueAsString": event_time},
                    {"FeatureName": "session_count_7d",   "ValueAsString": str(session_count)},
                    {"FeatureName": "frustration_avg",    "ValueAsString": f"{frustration_avg:.4f}"},
                    {"FeatureName": "subscription_tier",  "ValueAsString": agg.get("subscription_tier", "none")},
                    {"FeatureName": "is_subscribed",      "ValueAsString": "1" if "subscription_tier" in agg else "0"},
                ],
            )
            pushed += 1
        except Exception as exc:  # noqa: BLE001
            logger.warning("SageMaker put_record failed for %s: %s", email, exc)

    logger.info("SageMaker: pushed features for %d students", pushed)


# ─── DAG Definition ────────────────────────────────────────────────────────────

default_args = {
    "owner": "sri-platform",
    "retries": 3,
    "retry_delay": timedelta(minutes=2),
    "on_failure_callback": lambda ctx: logger.error(
        "Task %s failed: %s", ctx["task_instance"].task_id, ctx.get("exception")
    ),
}

with DAG(
    dag_id="stream_cleaner",
    description="Consume raw Kafka events → clean → S3, OpenSearch, SageMaker Feature Store",
    schedule_interval=timedelta(minutes=15),
    start_date=days_ago(1),
    catchup=False,
    default_args=default_args,
    tags=["kafka", "cleaning", "opensearch", "sagemaker", "s3"],
    max_active_runs=2,
) as dag:

    t_consume = PythonOperator(
        task_id="consume_and_clean",
        python_callable=consume_and_clean,
    )

    t_s3 = PythonOperator(
        task_id="write_to_s3",
        python_callable=write_to_s3,
    )

    t_opensearch = PythonOperator(
        task_id="index_to_opensearch",
        python_callable=index_to_opensearch,
    )

    t_sagemaker = PythonOperator(
        task_id="update_sagemaker_features",
        python_callable=update_sagemaker_features,
    )

    # consume → [s3, opensearch, sagemaker] in parallel
    t_consume >> [t_s3, t_opensearch, t_sagemaker]

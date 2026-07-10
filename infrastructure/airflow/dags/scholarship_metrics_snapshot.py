"""
scholarship_metrics_snapshot.py
--------------------------------
Airflow DAG: runs hourly, queries the production RDS read-replica for
scholarship KPIs and publishes a snapshot to:
  - mentor.metrics.snapshots  Kafka topic  (for real-time mentor dashboards)
  - OpenSearch index           sri-mentor-metrics-snapshots
  - S3 data lake               cleaned/mentor_metrics_snapshots/YYYY/MM/DD/

This keeps the mentor /api/mentor/metrics endpoint backed by pre-computed
snapshots instead of hitting the live DB on every request.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta

import boto3
from airflow import DAG
from airflow.models import Variable
from airflow.operators.python import PythonOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.utils.dates import days_ago

logger = logging.getLogger(__name__)

KAFKA_BOOTSTRAP  = Variable.get("kafka_bootstrap_servers", default_var=os.environ.get("KAFKA_BOOTSTRAP", ""))
OPENSEARCH_URL   = Variable.get("opensearch_url",          default_var=os.environ.get("OPENSEARCH_URL",  ""))
DATA_LAKE_BUCKET = Variable.get("s3_data_lake_bucket",     default_var=os.environ.get("S3_DATA_LAKE_BUCKET", ""))
AWS_REGION       = Variable.get("aws_region",              default_var="us-east-1")

# Airflow connection ID pointing to the RDS read-replica
# Set up via: Admin > Connections > postgres_replica
RDS_CONN_ID = "postgres_replica"


def compute_metrics(**context):
    """Query RDS replica for scholarship KPIs and push to XCom."""
    hook = PostgresHook(postgres_conn_id=RDS_CONN_ID)

    queries = {
        "user_roles": """
            SELECT COALESCE(role, 'student') AS role, COUNT(*)::int AS count
              FROM users GROUP BY role
        """,
        "tier_breakdown": """
            SELECT subscription_tier, COUNT(*)::int AS count
              FROM users
             WHERE subscription_tier IS NOT NULL
               AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW())
             GROUP BY subscription_tier
        """,
        "active_crypto": """
            SELECT COUNT(*)::int AS count
              FROM users
             WHERE subscription_source = 'crypto'
               AND subscription_expires_at > NOW()
        """,
        "crypto_30d": """
            SELECT currency, tier, COUNT(*)::int AS count,
                   SUM(usd_price)::numeric(10,2) AS total_usd
              FROM crypto_payments
             WHERE status = 'confirmed'
               AND created_at > NOW() - INTERVAL '30 days'
             GROUP BY currency, tier
        """,
        "new_signups_7d": """
            SELECT DATE(created_at) AS day, COUNT(*)::int AS count
              FROM users
             WHERE created_at > NOW() - INTERVAL '7 days'
             GROUP BY day ORDER BY day
        """,
        "churn_risk": """
            SELECT COUNT(*)::int AS count
              FROM users
             WHERE subscription_expires_at IS NOT NULL
               AND subscription_expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
        """,
    }

    results = {}
    for key, sql in queries.items():
        try:
            rows = hook.get_records(sql)
            cols = [d[0] for d in hook.get_conn().cursor().description] if rows else []
            results[key] = [dict(zip(cols, r)) for r in rows]
        except Exception as exc:  # noqa: BLE001
            logger.warning("Query '%s' failed: %s", key, exc)
            results[key] = []

    # Flatten into snapshot structure
    user_counts  = {r["role"]: r["count"] for r in results.get("user_roles", [])}
    tier_counts  = {r["subscription_tier"]: r["count"] for r in results.get("tier_breakdown", [])}
    crypto_30d   = results.get("crypto_30d", [])
    churn        = results.get("churn_risk", [{"count": 0}])[0].get("count", 0)
    crypto_active = results.get("active_crypto", [{"count": 0}])[0].get("count", 0)

    snapshot = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "users": {
            "total":    sum(user_counts.values()),
            "students": user_counts.get("student", 0),
            "mentors":  user_counts.get("school_mentor", 0),
        },
        "subscriptions": {
            "active_total": crypto_active,
            "via_stripe":   0,  # Stripe data enriched by separate DAG
            "via_crypto":   crypto_active,
            "by_tier": {
                "high":   tier_counts.get("high",   0),
                "middle": tier_counts.get("middle", 0),
                "low":    tier_counts.get("low",    0),
            },
        },
        "crypto_payments_30d": {
            "total_transactions": sum(r.get("count", 0) for r in crypto_30d),
            "total_usd_volume":   float(sum(float(r.get("total_usd", 0)) for r in crypto_30d)),
            "by_currency": {r["currency"]: {"count": r["count"], "usd": str(r["total_usd"])} for r in crypto_30d},
        },
        "growth": {
            "new_signups_7d":    results.get("new_signups_7d", []),
            "expiring_7d_count": churn,
        },
    }

    context["ti"].xcom_push(key="snapshot", value=snapshot)
    logger.info("Scholarship snapshot computed: %d total users", snapshot["users"]["total"])
    return snapshot


def publish_to_kafka(**context):
    """Publish snapshot to Confluent Cloud mentor.metrics.snapshots topic."""
    snapshot = context["ti"].xcom_pull(key="snapshot")
    if not snapshot:
        return

    try:
        from kafka_utils import get_producer  # type: ignore

        producer = get_producer()
        producer.produce(
            "mentor.metrics.snapshots",
            key=b"snapshot",
            value=json.dumps(snapshot).encode(),
        )
        producer.flush(timeout=30)
        logger.info("Published snapshot to mentor.metrics.snapshots (Confluent)")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Confluent Kafka publish failed: %s", exc)


def save_to_s3(**context):
    """Archive snapshot to S3 data lake."""
    import gzip
    snapshot = context["ti"].xcom_pull(key="snapshot")
    if not snapshot or not DATA_LAKE_BUCKET:
        return

    s3  = boto3.client("s3", region_name=AWS_REGION)
    now = context["execution_date"]
    key = f"cleaned/mentor_metrics_snapshots/{now.strftime('%Y/%m/%d')}/{context['run_id']}.json.gz"
    body = gzip.compress(json.dumps(snapshot, indent=2).encode())
    s3.put_object(Bucket=DATA_LAKE_BUCKET, Key=key, Body=body, ContentEncoding="gzip", ContentType="application/json")
    logger.info("Snapshot archived to s3://%s/%s", DATA_LAKE_BUCKET, key)


def index_to_opensearch(**context):
    """Index snapshot into OpenSearch for historical analytics."""
    from opensearchpy import OpenSearch  # type: ignore

    snapshot = context["ti"].xcom_pull(key="snapshot")
    if not snapshot or not OPENSEARCH_URL:
        return

    client = OpenSearch(hosts=[OPENSEARCH_URL], use_ssl=True, verify_certs=True)
    doc_id = context["execution_date"].strftime("%Y%m%dT%H%M%S")
    client.index(index="sri-mentor-metrics-snapshots", id=doc_id, body=snapshot)
    logger.info("Indexed snapshot %s to OpenSearch", doc_id)


default_args = {
    "owner": "sri-platform",
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    dag_id="scholarship_metrics_snapshot",
    description="Hourly scholarship KPI snapshot → Kafka, OpenSearch, S3",
    schedule_interval="@hourly",
    start_date=days_ago(1),
    catchup=False,
    default_args=default_args,
    tags=["metrics", "scholarship", "kafka", "opensearch"],
    max_active_runs=1,
) as dag:

    t_compute  = PythonOperator(task_id="compute_metrics",      python_callable=compute_metrics)
    t_kafka    = PythonOperator(task_id="publish_to_kafka",     python_callable=publish_to_kafka)
    t_s3       = PythonOperator(task_id="save_to_s3",           python_callable=save_to_s3)
    t_opensearch = PythonOperator(task_id="index_to_opensearch",python_callable=index_to_opensearch)

    t_compute >> [t_kafka, t_s3, t_opensearch]

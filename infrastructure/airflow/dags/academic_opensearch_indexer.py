"""
academic_opensearch_indexer.py
------------------------------
Airflow DAG: syncs the MIT OCW academic database (on RDS) to AWS OpenSearch.

Creates / updates two indices:
  academic-courses-v1          — all 43+ MIT OCW courses
  academic-research-topics-v1  — all 10 curated research topics

Schedule: daily at 02:00 UTC (low-traffic window).
On the first run (or after a schema change) it recreates the index mapping.

Signals completion by producing a 'academic.opensearch.sync' Kafka event
so downstream consumers (e.g. the SageMaker enrichment pipeline) know
fresh data is available.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta
from typing import Any

import boto3
import psycopg2  # type: ignore
import requests
from airflow import DAG
from airflow.models import Variable
from airflow.operators.python import PythonOperator
from airflow.utils.dates import days_ago
from requests_aws4auth import AWS4Auth  # type: ignore

logger = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────

AWS_REGION     = Variable.get("aws_region",          default_var=os.environ.get("AWS_REGION", "us-east-1"))
OPENSEARCH_URL = Variable.get("opensearch_url",      default_var=os.environ.get("OPENSEARCH_URL", ""))
DB_SECRET_ARN  = Variable.get("db_secret_arn",       default_var=os.environ.get("DB_SECRET_ARN", ""))
DB_HOST        = Variable.get("db_host",             default_var=os.environ.get("DB_HOST", ""))
COURSES_INDEX  = Variable.get("os_courses_index",    default_var="academic-courses-v1")
TOPICS_INDEX   = Variable.get("os_topics_index",     default_var="academic-research-topics-v1")

COURSES_MAPPING_SSM = Variable.get(
    "os_courses_mapping_ssm",
    default_var="/sri/production/opensearch/mappings/academic-courses",
)
TOPICS_MAPPING_SSM  = Variable.get(
    "os_topics_mapping_ssm",
    default_var="/sri/production/opensearch/mappings/academic-topics",
)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _aws_auth() -> AWS4Auth:
    credentials = boto3.Session().get_credentials()
    return AWS4Auth(
        credentials.access_key,
        credentials.secret_key,
        AWS_REGION,
        "es",
        session_token=credentials.token,
    )


def _get_db_conn():
    """Open a psycopg2 connection to the RDS PostgreSQL instance."""
    sm = boto3.client("secretsmanager", region_name=AWS_REGION)
    secret = json.loads(sm.get_secret_value(SecretId=DB_SECRET_ARN)["SecretString"])
    return psycopg2.connect(
        host=secret.get("host", DB_HOST),
        port=int(secret.get("port", 5432)),
        dbname=secret.get("dbname", "sriplatform"),
        user=secret.get("username"),
        password=secret.get("password"),
        connect_timeout=10,
        sslmode="require",
    )


def _get_ssm_mapping(param_name: str) -> dict:
    ssm = boto3.client("ssm", region_name=AWS_REGION)
    resp = ssm.get_parameter(Name=param_name)
    return json.loads(resp["Parameter"]["Value"])


def _ensure_index(index_name: str, mapping: dict, auth: AWS4Auth) -> None:
    url = f"{OPENSEARCH_URL}/{index_name}"
    r = requests.head(url, auth=auth, timeout=10)
    if r.status_code == 200:
        logger.info("Index '%s' already exists — skipping creation", index_name)
        return
    r = requests.put(url, auth=auth, json=mapping, timeout=30,
                     headers={"Content-Type": "application/json"})
    r.raise_for_status()
    logger.info("Created index '%s'", index_name)


def _bulk_index(index_name: str, docs: list[dict], auth: AWS4Auth) -> None:
    if not docs:
        logger.warning("No documents to index for '%s'", index_name)
        return

    body_lines: list[str] = []
    for doc in docs:
        body_lines.append(json.dumps({"index": {"_index": index_name, "_id": doc["id"]}}))
        body_lines.append(json.dumps(doc))
    body = "\n".join(body_lines) + "\n"

    url = f"{OPENSEARCH_URL}/_bulk"
    r = requests.post(url, auth=auth, data=body, timeout=60,
                      headers={"Content-Type": "application/x-ndjson"})
    r.raise_for_status()
    result = r.json()
    if result.get("errors"):
        failed = [i for i in result["items"] if i.get("index", {}).get("error")]
        logger.warning("%d/%d documents failed to index", len(failed), len(docs))
    else:
        logger.info("Bulk indexed %d documents into '%s'", len(docs), index_name)


# ─── Task functions ───────────────────────────────────────────────────────────

def ensure_indices(**_: Any) -> None:
    """Create OpenSearch indices with proper mappings if they don't exist."""
    if not OPENSEARCH_URL:
        raise ValueError("OPENSEARCH_URL not configured")
    auth = _aws_auth()
    courses_mapping = _get_ssm_mapping(COURSES_MAPPING_SSM)
    topics_mapping  = _get_ssm_mapping(TOPICS_MAPPING_SSM)
    _ensure_index(COURSES_INDEX, courses_mapping, auth)
    _ensure_index(TOPICS_INDEX,  topics_mapping,  auth)
    logger.info("Indices ready: %s, %s", COURSES_INDEX, TOPICS_INDEX)


def index_courses(**_: Any) -> int:
    """Read all courses from RDS and bulk-index to OpenSearch."""
    auth = _aws_auth()
    conn = _get_db_conn()
    now  = datetime.utcnow().isoformat() + "Z"

    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    c.id, c.mit_course_num, c.title, c.description, c.level,
                    c.discipline_id, c.specialization_id,
                    c.instructors, c.topics, c.resource_types,
                    c.difficulty, c.hours_per_week, c.semester, c.year, c.url,
                    d.name AS discipline_name,
                    s.name AS specialization_name
                FROM ocw_courses c
                JOIN academic_disciplines d ON d.id = c.discipline_id
                LEFT JOIN academic_specializations s ON s.id = c.specialization_id
                ORDER BY c.difficulty, c.mit_course_num
            """)
            rows = cur.fetchall()
            cols = [desc[0] for desc in cur.description]
    finally:
        conn.close()

    docs = []
    for row in rows:
        d = dict(zip(cols, row))
        docs.append({
            "id":                d["id"],
            "mit_course_num":    d["mit_course_num"],
            "title":             d["title"],
            "description":       d["description"],
            "level":             d["level"],
            "discipline_id":     d["discipline_id"],
            "discipline_name":   d["discipline_name"],
            "specialization_id": d["specialization_id"],
            "specialization_name": d["specialization_name"],
            "instructors":       d["instructors"] or [],
            "topics":            d["topics"] or [],
            "resource_types":    d["resource_types"] or [],
            "difficulty":        d["difficulty"],
            "hours_per_week":    d["hours_per_week"],
            "semester":          d["semester"],
            "year":              d["year"],
            "url":               d["url"],
            "indexed_at":        now,
        })

    _bulk_index(COURSES_INDEX, docs, auth)
    logger.info("Indexed %d courses → %s", len(docs), COURSES_INDEX)
    return len(docs)


def index_topics(**_: Any) -> int:
    """Read all research topics from RDS and bulk-index to OpenSearch."""
    auth = _aws_auth()
    conn = _get_db_conn()
    now  = datetime.utcnow().isoformat() + "Z"

    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    rt.id, rt.title, rt.description, rt.why_it_matters,
                    rt.discipline_id, rt.open_questions, rt.key_skills, rt.career_paths,
                    rt.difficulty,
                    d.name AS discipline_name,
                    COALESCE(
                        array_agg(rtc.course_id) FILTER (WHERE rtc.course_id IS NOT NULL),
                        '{}'
                    ) AS course_ids
                FROM research_topics rt
                JOIN academic_disciplines d ON d.id = rt.discipline_id
                LEFT JOIN research_topic_courses rtc ON rtc.topic_id = rt.id
                GROUP BY rt.id, d.name
                ORDER BY rt.sort_order
            """)
            rows = cur.fetchall()
            cols = [desc[0] for desc in cur.description]
    finally:
        conn.close()

    docs = []
    for row in rows:
        d = dict(zip(cols, row))
        docs.append({
            "id":             d["id"],
            "title":          d["title"],
            "description":    d["description"],
            "why_it_matters": d["why_it_matters"] or "",
            "discipline_id":  d["discipline_id"],
            "discipline_name":d["discipline_name"],
            "key_skills":     d["key_skills"] or [],
            "open_questions": d["open_questions"] or [],
            "career_paths":   d["career_paths"] or [],
            "difficulty":     d["difficulty"],
            "course_ids":     list(d["course_ids"] or []),
            "indexed_at":     now,
        })

    _bulk_index(TOPICS_INDEX, docs, auth)
    logger.info("Indexed %d research topics → %s", len(docs), TOPICS_INDEX)
    return len(docs)


def emit_sync_event(**_: Any) -> None:
    """Produce an 'academic.opensearch.sync' event to Confluent Cloud."""
    try:
        from kafka_utils import get_producer  # type: ignore
        producer = get_producer()
        payload = json.dumps({
            "event":     "academic.opensearch.sync",
            "indices":   [COURSES_INDEX, TOPICS_INDEX],
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "_source":   "airflow-academic-indexer",
        }).encode()
        producer.produce("academic.opensearch.sync", key=b"sync", value=payload)
        producer.flush(timeout=10)
        logger.info("Emitted academic.opensearch.sync event to Confluent")
    except Exception as exc:
        logger.warning("Kafka sync event failed (non-fatal): %s", exc)


# ─── DAG definition ───────────────────────────────────────────────────────────

default_args = {
    "owner":           "sri-platform",
    "depends_on_past": False,
    "start_date":      days_ago(1),
    "retries":         2,
    "retry_delay":     timedelta(minutes=10),
    "email_on_failure": False,
}

with DAG(
    dag_id="academic_opensearch_indexer",
    default_args=default_args,
    description="Sync MIT OCW academic DB (RDS) → AWS OpenSearch daily",
    schedule_interval="0 2 * * *",   # 02:00 UTC daily
    catchup=False,
    max_active_runs=1,
    tags=["academic", "opensearch", "research-navigator"],
) as dag:

    t_ensure = PythonOperator(
        task_id="ensure_indices",
        python_callable=ensure_indices,
    )

    t_courses = PythonOperator(
        task_id="index_courses",
        python_callable=index_courses,
    )

    t_topics = PythonOperator(
        task_id="index_topics",
        python_callable=index_topics,
    )

    t_emit = PythonOperator(
        task_id="emit_sync_event",
        python_callable=emit_sync_event,
    )

    t_ensure >> [t_courses, t_topics] >> t_emit

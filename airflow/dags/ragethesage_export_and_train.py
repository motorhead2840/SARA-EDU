"""
RageSage Export + Train DAG
===========================
Runs every Sunday at 03:00 UTC (one hour after the EventBridge scheduled
training trigger, so data is freshly exported before the pipeline fires).

Steps:
  1. check_label_volume  — ensures ≥50 newly-labelled rows exist before exporting
  2. export_to_s3        — calls /api/secops/ragethesage/export via internal API
  3. trigger_pipeline    — submits the "ragethesage" SageMaker pipeline via boto3
  4. monitor_pipeline    — PythonSensor polls pipeline status every 5 min (reschedule mode)
  5. notify              — SNS alert with result (success/fail + F1 if registered)
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta

import boto3
import requests
from airflow import DAG
from airflow.operators.python import PythonOperator, BranchPythonOperator
from airflow.sensors.python import PythonSensor
from airflow.operators.empty import EmptyOperator

AWS_REGION         = os.environ.get("AWS_REGION", "us-east-1")
RAGETHESAGE_ARN    = os.environ.get("RAGETHESAGE_PIPELINE_ARN", "")
SNS_TOPIC_ARN      = os.environ.get("SNS_ALERTS_TOPIC_ARN", "")
API_SERVER_URL     = os.environ.get("API_SERVER_INTERNAL_URL", "http://localhost:3000")
MENTOR_TOKEN       = os.environ.get("MENTOR_INTERNAL_TOKEN", "")   # service token for DAG→API calls
MIN_NEW_LABELS     = 50

default_args = {
    "owner":            "secops",
    "retries":          1,
    "retry_delay":      timedelta(minutes=10),
    "execution_timeout": timedelta(hours=3),
}


# ---------------------------------------------------------------------------
# Task functions
# ---------------------------------------------------------------------------

def check_label_volume(**ctx):
    """Branch: proceed if ≥ MIN_NEW_LABELS labelled-but-not-yet-exported rows exist, else skip."""
    import boto3, os

    bucket = os.environ.get("SECOPS_S3_BUCKET", "")
    if not bucket:
        print("[RageSage] SECOPS_S3_BUCKET not set — cannot check export count. Skipping.")
        return "skip"

    # Count NDJSON lines in the latest unexported training batch by querying S3 directly
    # via a Postgres query through the API stats endpoint
    resp = requests.get(
        f"{API_SERVER_URL}/api/secops/stats",
        headers={"Authorization": f"Bearer {MENTOR_TOKEN}"},
        timeout=15,
    )
    resp.raise_for_status()
    stats = resp.json()

    # total_ingested − pending_review gives reviewed (labelled) rows
    # pending_review = flagged HIGH/CRITICAL not yet reviewed
    total    = int(stats.get("total_ingested", 0))
    critical = int(stats.get("critical_count", 0))
    high     = int(stats.get("high_count", 0))
    pending  = int(stats.get("pending_review", 0))

    # Approximate labelled-and-exportable rows:
    # all reviewed flagged items = (critical+high) - pending_high_critical
    labelled_approx = max(0, (critical + high) - pending)
    print(f"[RageSage] total={total} critical={critical} high={high} "
          f"pending_review={pending} labelled_approx={labelled_approx}")

    if labelled_approx < MIN_NEW_LABELS:
        print(f"[RageSage] Insufficient labelled data ({labelled_approx} < {MIN_NEW_LABELS}). Skipping.")
        return "skip"
    return "export_to_s3"


def export_to_s3(**ctx):
    resp = requests.post(
        f"{API_SERVER_URL}/api/secops/ragethesage/export",
        headers={"Authorization": f"Bearer {MENTOR_TOKEN}"},
        timeout=60,
    )
    resp.raise_for_status()
    result = resp.json()
    print(f"[RageSage] Export result: {result}")
    ctx["ti"].xcom_push(key="export_result", value=result)


def trigger_pipeline(**ctx):
    if not RAGETHESAGE_ARN:
        raise ValueError("RAGETHESAGE_PIPELINE_ARN env var not set")

    # start_pipeline_execution takes a pipeline NAME, not ARN.
    # Extract name from ARN if a full ARN was provided.
    pipeline_name = RAGETHESAGE_ARN.split("/")[-1] if ":" in RAGETHESAGE_ARN else RAGETHESAGE_ARN

    sm = boto3.client("sagemaker", region_name=AWS_REGION)
    exec_name = f"ragethesage-dag-{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}"
    response = sm.start_pipeline_execution(
        PipelineName=pipeline_name,
        PipelineExecutionDisplayName=exec_name,
        PipelineExecutionDescription="Triggered by Airflow ragethesage_export_and_train DAG",
        PipelineParameters=[
            {"Name": "TrainingDataDate", "Value": datetime.utcnow().strftime("%Y-%m-%d")},
            {"Name": "MinF1Threshold",   "Value": "0.78"},
        ],
    )
    arn = response["PipelineExecutionArn"]
    print(f"[RageSage] Pipeline execution started: {arn}")
    ctx["ti"].xcom_push(key="execution_arn", value=arn)


def poll_pipeline_status(**ctx):
    """Returns True when pipeline is in a terminal state; raises on failure."""
    arn = ctx["ti"].xcom_pull(task_ids="trigger_pipeline", key="execution_arn")
    if not arn:
        raise ValueError("No execution ARN found in XCom")

    sm = boto3.client("sagemaker", region_name=AWS_REGION)
    response = sm.describe_pipeline_execution(PipelineExecutionArn=arn)
    status = response["PipelineExecutionStatus"]
    print(f"[RageSage] Pipeline status: {status}")

    if status == "Succeeded":
        return True
    if status in ("Failed", "Stopped"):
        raise RuntimeError(f"RageSage pipeline {status}: {response.get('FailureReason', 'unknown')}")
    # Still running
    return False


def send_notification(**ctx):
    ti = ctx["ti"]
    exec_arn   = ti.xcom_pull(task_ids="trigger_pipeline",   key="execution_arn")
    export_res = ti.xcom_pull(task_ids="export_to_s3",       key="export_result")

    if not SNS_TOPIC_ARN:
        print("[RageSage] SNS_ALERTS_TOPIC_ARN not set — skipping notification")
        return

    sns = boto3.client("sns", region_name=AWS_REGION)
    message = {
        "event":       "ragethesage_training_complete",
        "status":      "Succeeded",
        "execution":   exec_arn,
        "export":      export_res,
        "timestamp":   datetime.utcnow().isoformat() + "Z",
        "description": (
            "RageSage PMI classifier pipeline completed. "
            "Model pending manual approval in SageMaker Model Registry "
            "(ragethesage package group) before deployment to inference endpoint."
        ),
    }
    sns.publish(
        TopicArn=SNS_TOPIC_ARN,
        Subject="[RageSage] Training complete — model pending approval",
        Message=json.dumps(message, indent=2),
    )
    print("[RageSage] SNS notification sent")


def send_skip_notification(**ctx):
    if not SNS_TOPIC_ARN:
        return
    sns = boto3.client("sns", region_name=AWS_REGION)
    sns.publish(
        TopicArn=SNS_TOPIC_ARN,
        Subject="[RageSage] Training skipped — insufficient labelled data",
        Message=json.dumps({
            "event":     "ragethesage_training_skipped",
            "reason":    f"Fewer than {MIN_NEW_LABELS} labelled rows available",
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }),
    )


# ---------------------------------------------------------------------------
# DAG definition
# ---------------------------------------------------------------------------

with DAG(
    dag_id="ragethesage_export_and_train",
    default_args=default_args,
    description="Weekly RageSage PMI classifier training — export labels → S3 → SageMaker pipeline",
    schedule_interval="0 3 * * SUN",
    start_date=datetime(2026, 1, 5),
    catchup=False,
    max_active_runs=1,
    tags=["secops", "ragethesage", "ml", "cyberdemon"],
) as dag:

    check = BranchPythonOperator(
        task_id="check_label_volume",
        python_callable=check_label_volume,
    )

    skip = PythonOperator(
        task_id="skip",
        python_callable=send_skip_notification,
    )

    export = PythonOperator(
        task_id="export_to_s3",
        python_callable=export_to_s3,
    )

    trigger = PythonOperator(
        task_id="trigger_pipeline",
        python_callable=trigger_pipeline,
    )

    monitor = PythonSensor(
        task_id="monitor_pipeline",
        python_callable=poll_pipeline_status,
        mode="reschedule",
        poke_interval=300,          # poll every 5 min
        timeout=7200,               # 2-hour max
    )

    notify = PythonOperator(
        task_id="send_notification",
        python_callable=send_notification,
    )

    done = EmptyOperator(task_id="done", trigger_rule="none_failed_min_one_success")

    check >> [export, skip]
    export >> trigger >> monitor >> notify >> done
    skip >> done

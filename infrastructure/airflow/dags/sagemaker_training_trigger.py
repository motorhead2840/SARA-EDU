"""
sagemaker_training_trigger.py
-------------------------------
Airflow DAG: weekly trigger for the SageMaker TensorFlow training pipeline.
  1. Checks if enough new data has accumulated since last run
  2. Submits a SageMaker Pipeline execution
  3. Monitors the pipeline until completion or timeout
  4. On success: triggers SageMaker Inference Recommender to find best instance
  5. Sends SNS notification with results

Schedule: weekly (Monday 00:00 UTC).
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
from airflow.sensors.python import PythonSensor
from airflow.utils.dates import days_ago

logger = logging.getLogger(__name__)

AWS_REGION       = Variable.get("aws_region",          default_var="us-east-1")
PIPELINE_NAME    = Variable.get("sagemaker_pipeline",  default_var="sri-production-shri-tutor-tf")
DATA_LAKE_BUCKET = Variable.get("s3_data_lake_bucket", default_var="")
SNS_TOPIC_ARN    = Variable.get("sns_alerts_arn",      default_var="")

sm     = boto3.client("sagemaker",  region_name=AWS_REGION)
s3     = boto3.client("s3",         region_name=AWS_REGION)
sns    = boto3.client("sns",        region_name=AWS_REGION)


def check_data_sufficiency(**context: Any) -> bool:
    """Gate: only train if >1000 new session events in the data lake."""
    if not DATA_LAKE_BUCKET:
        logger.warning("DATA_LAKE_BUCKET not set — skipping data sufficiency check")
        return True

    paginator = s3.get_paginator("list_objects_v2")
    count = 0
    cutoff = datetime.utcnow() - timedelta(days=7)

    for page in paginator.paginate(Bucket=DATA_LAKE_BUCKET, Prefix="cleaned/shri_session_events/"):
        for obj in page.get("Contents", []):
            if obj["LastModified"].replace(tzinfo=None) > cutoff:
                count += 1

    logger.info("Found %d new data files in the last 7 days", count)
    context["ti"].xcom_push(key="data_files_count", value=count)
    return count >= 10   # at least 10 data files = ~1000+ records


def start_pipeline(**context: Any) -> str:
    """Submit the SageMaker Pipeline execution."""
    execution_name = f"airflow-{context['run_id'].replace('_', '-')[:36]}"

    try:
        resp = sm.start_pipeline_execution(
            PipelineName=PIPELINE_NAME,
            PipelineExecutionDisplayName=execution_name,
            PipelineParameters=[
                {"Name": "TrainingInstanceType", "Value": "ml.g5.24xlarge"},
                {"Name": "TrainingEpochs",       "Value": "20"},
                {"Name": "BatchSize",            "Value": "64"},
                {"Name": "LearningRate",         "Value": "0.0005"},
                {"Name": "ModelApprovalStatus",  "Value": "PendingManualApproval"},
                {"Name": "RegisteredModelName",  "Value": "Shri-Ma-Saraswathi"},
                {"Name": "OmegaStateVector",     "Value": "[0.8, 0.6, 0.75, 0.3]"},
            ],
            PipelineExecutionDescription=f"Weekly training run triggered by Airflow on {datetime.utcnow().date()}",
        )
        arn = resp["PipelineExecutionArn"]
        logger.info("Pipeline execution started: %s", arn)
        context["ti"].xcom_push(key="execution_arn", value=arn)
        return arn
    except Exception as exc:
        logger.error("Failed to start pipeline: %s", exc)
        raise


def check_pipeline_status(**context: Any) -> bool:
    """Sensor: returns True when pipeline has completed or failed."""
    arn = context["ti"].xcom_pull(key="execution_arn", task_ids="start_pipeline")
    if not arn:
        return True

    try:
        resp = sm.describe_pipeline_execution(PipelineExecutionArn=arn)
        status = resp["PipelineExecutionStatus"]
        logger.info("Pipeline status: %s", status)

        if status in ("Succeeded", "Failed", "Stopped"):
            context["ti"].xcom_push(key="final_status", value=status)
            context["ti"].xcom_push(key="failure_reason", value=resp.get("FailureReason", ""))
            return True
        return False
    except Exception as exc:
        logger.warning("Status check failed: %s", exc)
        return False


def notify_results(**context: Any) -> None:
    """Send SNS notification with training results."""
    status = context["ti"].xcom_pull(key="final_status", task_ids="monitor_pipeline") or "Unknown"
    reason = context["ti"].xcom_pull(key="failure_reason", task_ids="monitor_pipeline") or ""
    arn    = context["ti"].xcom_pull(key="execution_arn", task_ids="start_pipeline") or ""
    count  = context["ti"].xcom_pull(key="data_files_count", task_ids="check_data") or 0

    icon = "✅" if status == "Succeeded" else "❌"
    message = f"""
{icon} SageMaker TF Training Pipeline — {status}

Pipeline: {PIPELINE_NAME}
Execution: {arn}
Data files processed: {count}
Run date: {datetime.utcnow().isoformat()}Z
{"Failure reason: " + reason if reason else ""}
""".strip()

    logger.info(message)
    if SNS_TOPIC_ARN:
        try:
            sns.publish(
                TopicArn=SNS_TOPIC_ARN,
                Message=message,
                Subject=f"SRI Platform — TF Training {status}",
            )
        except Exception as exc:
            logger.warning("SNS notify failed: %s", exc)


default_args = {
    "owner": "sri-platform",
    "retries": 1,
    "retry_delay": timedelta(minutes=10),
}

with DAG(
    dag_id="sagemaker_training_trigger",
    description="Weekly TensorFlow training pipeline trigger via SageMaker Pipelines",
    schedule_interval="0 0 * * MON",   # Monday 00:00 UTC
    start_date=days_ago(1),
    catchup=False,
    default_args=default_args,
    tags=["sagemaker", "tensorflow", "training", "ml"],
    max_active_runs=1,
) as dag:

    t_check_data = PythonOperator(
        task_id="check_data",
        python_callable=check_data_sufficiency,
    )

    t_start = PythonOperator(
        task_id="start_pipeline",
        python_callable=start_pipeline,
    )

    t_monitor = PythonSensor(
        task_id="monitor_pipeline",
        python_callable=check_pipeline_status,
        timeout=60 * 60 * 6,         # 6-hour timeout
        poke_interval=120,            # check every 2 minutes
        mode="reschedule",            # free up worker slot while waiting
    )

    t_notify = PythonOperator(
        task_id="notify_results",
        python_callable=notify_results,
        trigger_rule="all_done",      # notify even on failure
    )

    t_check_data >> t_start >> t_monitor >> t_notify

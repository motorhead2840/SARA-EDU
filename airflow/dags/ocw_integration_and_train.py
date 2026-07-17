"""
OCW Integration and Train DAG
=============================
Schedules and orchestrates:
  1. run_ocw_pipeline             - Crawl, curate, deduplicate, and process OpenCourseWare (OCW) materials.
  2. trigger_synthetic_generation - Hit /shri-api/sagemaker/generate-data with the newly-curated SFT dataset to merge and form training-ready data on S3.
  3. launch_training              - Submits SageMaker training to fine-tune Nemotron-Mini-4B with QLoRA.
  4. monitor_training             - Polls SageMaker job status until finished.
  5. deploy_endpoint              - Deploys the trained model to a SageMaker endpoint.
  6. notify                       - SNS alert with results.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

import boto3
import requests
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.sensors.python import PythonSensor
from airflow.operators.empty import EmptyOperator

AWS_REGION         = os.environ.get("AWS_REGION", "us-east-1")
SNS_TOPIC_ARN      = os.environ.get("SNS_ALERTS_TOPIC_ARN", "")
API_SERVER_URL     = os.environ.get("API_SERVER_INTERNAL_URL", "http://localhost:8080")
MENTOR_TOKEN       = os.environ.get("MENTOR_INTERNAL_TOKEN", "")
REPO_ROOT          = Path(__file__).resolve().parent.parent.parent
OCW_OUTPUT_DIR     = str(REPO_ROOT / "data" / "ocw_curated")

default_args = {
    "owner":            "mlops",
    "retries":          1,
    "retry_delay":      timedelta(minutes=10),
    "execution_timeout": timedelta(hours=4),
}


# ---------------------------------------------------------------------------
# Task functions
# ---------------------------------------------------------------------------

def run_ocw_pipeline(**ctx):
    """Executes the custom OCW crawler, curator, and SFT dataset processor."""
    script_path = str(REPO_ROOT / "ocw_pipeline" / "pipeline.py")
    cmd = [
        sys.executable, script_path,
        "--output-dir", OCW_OUTPUT_DIR,
        "--quality-threshold", "0.3",
        "--pairs-per-doc", "4"
    ]
    print(f"Running OCW data pipeline command: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    print("Pipeline Output:")
    print(result.stdout)
    
    # Locate the generated manifest
    manifest_file = os.path.join(OCW_OUTPUT_DIR, "manifest.json")
    with open(manifest_file, "r") as f:
        manifest = json.load(f)
        
    print(f"OCW Pipeline Succeeded. Manifest: {manifest}")
    ctx["ti"].xcom_push(key="manifest", value=manifest)


def trigger_synthetic_generation(**ctx):
    """Hits the FastAPI endpoint /shri-api/sagemaker/generate-data to merge syllabus chunks and OCW."""
    manifest = ctx["ti"].xcom_pull(task_ids="run_ocw_pipeline", key="manifest")
    sft_dataset_path = manifest.get("sft_dataset_path")
    if sft_dataset_path and not os.path.isabs(sft_dataset_path):
        sft_dataset_path = os.path.abspath(os.path.join(str(REPO_ROOT), sft_dataset_path))
    
    headers = {"X-Mentor-Token": os.environ.get("MENTOR_API_SECRET", MENTOR_TOKEN)}
    payload = {
        "pairs_per_chunk": 4,
        "s3_prefix": "mentor-training/ocw-data",
        "mentor_type": "all",
        "ocw_data_path": sft_dataset_path
    }
    
    endpoint = f"{API_SERVER_URL}/shri-api/sagemaker/generate-data"
    print(f"Triggering synthetic data generation at {endpoint}...")
    resp = requests.post(endpoint, headers=headers, json=payload, timeout=600)
    resp.raise_for_status()
    
    res = resp.json()
    print(f"Synthetic data generation complete. S3 URI: {res['s3_uri']}, Record Count: {res['record_count']}")
    ctx["ti"].xcom_push(key="s3_uri", value=res["s3_uri"])


def launch_training(**ctx):
    """Launches the SageMaker training job via the FastAPI endpoint."""
    s3_uri = ctx["ti"].xcom_pull(task_ids="trigger_synthetic_generation", key="s3_uri")
    if not s3_uri:
        raise ValueError("S3 data URI not found in XCom.")
        
    headers = {"X-Mentor-Token": os.environ.get("MENTOR_API_SECRET", MENTOR_TOKEN)}
    payload = {
        "data_s3_uri": s3_uri,
        "model_id": "nvidia/Nemotron-Mini-4B-Instruct",
        "instance_type": "ml.g4dn.2xlarge",
        "registered_model_name": "Shri-Ma-Saraswathi-OCW"
    }
    
    endpoint = f"{API_SERVER_URL}/shri-api/sagemaker/train"
    print(f"Launching SageMaker training at {endpoint}...")
    resp = requests.post(endpoint, headers=headers, json=payload, timeout=60)
    resp.raise_for_status()
    
    res = resp.json()
    print(f"SageMaker training job launched: {res['job_name']}")
    ctx["ti"].xcom_push(key="job_name", value=res["job_name"])
    ctx["ti"].xcom_push(key="model_output_s3", value=res["model_output_s3"])


def monitor_training(**ctx):
    """Monitors SageMaker training progress using FastAPI status endpoint."""
    job_name = ctx["ti"].xcom_pull(task_ids="launch_training", key="job_name")
    if not job_name:
        raise ValueError("Job name not found in XCom.")
        
    headers = {"X-Mentor-Token": os.environ.get("MENTOR_API_SECRET", MENTOR_TOKEN)}
    endpoint = f"{API_SERVER_URL}/shri-api/sagemaker/status"
    
    resp = requests.get(endpoint, headers=headers, timeout=15)
    resp.raise_for_status()
    status = resp.json()
    
    current_job_status = status.get("job_status")
    print(f"Current SageMaker training job '{job_name}' status: {current_job_status}")
    
    if current_job_status == "Completed":
        return True
    if current_job_status in ("Failed", "Stopped"):
        raise RuntimeError(f"SageMaker training job {job_name} ended with status: {current_job_status}")
    
    return False


def deploy_endpoint(**ctx):
    """Deploys the newly trained model to SageMaker real-time inference endpoint."""
    model_output_s3 = ctx["ti"].xcom_pull(task_ids="launch_training", key="model_output_s3")
    if not model_output_s3:
        raise ValueError("Model output S3 URI not found in XCom.")
        
    headers = {"X-Mentor-Token": os.environ.get("MENTOR_API_SECRET", MENTOR_TOKEN)}
    payload = {
        "model_data_s3": model_output_s3,
        "endpoint_name": "shri-mentor-ocw-v1",
        "instance_type": "ml.g4dn.xlarge"
    }
    
    endpoint = f"{API_SERVER_URL}/shri-api/sagemaker/deploy"
    print(f"Deploying SageMaker endpoint at {endpoint}...")
    resp = requests.post(endpoint, headers=headers, json=payload, timeout=60)
    resp.raise_for_status()
    
    res = resp.json()
    print(f"Deployment initiated: {res['endpoint_name']} (status: {res['status']})")


def send_notification(**ctx):
    """Publishes a completion notification to SNS."""
    ti = ctx["ti"]
    job_name = ti.xcom_pull(task_ids="launch_training", key="job_name")
    
    if not SNS_TOPIC_ARN:
        print("SNS_ALERTS_TOPIC_ARN not set — skipping notification")
        return
        
    sns = boto3.client("sns", region_name=AWS_REGION)
    message = {
        "event": "ocw_pipeline_and_training_complete",
        "status": "Succeeded",
        "sagemaker_job": job_name,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "description": "SHRI-ACADEMY OCW integration and SFT fine-tuning run completed successfully. Model registered in MLflow."
    }
    sns.publish(
        TopicArn=SNS_TOPIC_ARN,
        Subject="[SHRI-ACADEMY] OCW pipeline & training run complete",
        Message=json.dumps(message, indent=2)
    )
    print("SNS Notification sent.")


# ---------------------------------------------------------------------------
# DAG definition
# ---------------------------------------------------------------------------

with DAG(
    dag_id="ocw_integration_and_train",
    default_args=default_args,
    description="Monthly OpenCourseWare acquisition and Socratic SFT fine-tuning pipeline",
    schedule_interval="0 4 1 * *",  # Monthly on the 1st day at 04:00 AM UTC
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["education", "ocw", "sft", "sagemaker"],
) as dag:

    step1_run_pipeline = PythonOperator(
        task_id="run_ocw_pipeline",
        python_callable=run_ocw_pipeline,
    )

    step2_gen_data = PythonOperator(
        task_id="trigger_synthetic_generation",
        python_callable=trigger_synthetic_generation,
    )

    step3_train = PythonOperator(
        task_id="launch_training",
        python_callable=launch_training,
    )

    step4_monitor = PythonSensor(
        task_id="monitor_training",
        python_callable=monitor_training,
        mode="reschedule",
        poke_interval=300,          # Poll every 5 minutes
        timeout=14400,              # 4-hour max
    )

    step5_deploy = PythonOperator(
        task_id="deploy_endpoint",
        python_callable=deploy_endpoint,
    )

    step6_notify = PythonOperator(
        task_id="send_notification",
        python_callable=send_notification,
    )

    done = EmptyOperator(task_id="done")

    step1_run_pipeline >> step2_gen_data >> step3_train >> step4_monitor >> step5_deploy >> step6_notify >> done

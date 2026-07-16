"""
routes/sagemaker.py — FastAPI router for SageMaker mentor training pipeline.

Endpoints (all require mentor auth):
  POST /shri-api/sagemaker/generate-data  — kick off synthetic data generation
  POST /shri-api/sagemaker/train          — launch SageMaker training job
  POST /shri-api/sagemaker/deploy         — deploy trained model as endpoint
  GET  /shri-api/sagemaker/status         — poll job / endpoint status

Env vars consumed:
  SAGEMAKER_ROLE_ARN        — IAM execution role for SageMaker jobs
  SAGEMAKER_S3_BUCKET       — S3 bucket for data + model artefacts (falls back to SECOPS_S3_BUCKET)
  SAGEMAKER_ENDPOINT_NAME   — set after deploy; used by eval mode in main.py
  AWS_REGION                — defaults to us-east-1
  HF_TOKEN                  — optional HuggingFace token for gated model access
  NVIDIA_API_KEY            — required for data generation
"""

import asyncio
import json
import logging
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Header

from async_kafka_utils import publish_event_async
from sagemaker_client import invoke_shri_mentor_async


try:
    import boto3
    _boto3_available = True
except ImportError:
    boto3 = None  # type: ignore
    _boto3_available = False
from pydantic import BaseModel

log = logging.getLogger(__name__)

router = APIRouter()

# ── Auth helper (reuse mentor auth pattern) ───────────────────────────────────
def _require_mentor(x_mentor_token: Optional[str] = Header(None)):
    """Minimal mentor auth gate — matches the pattern used in api-server routes."""
    secret = os.environ.get("MENTOR_API_SECRET")
    if not secret:
        raise HTTPException(status_code=503, detail="Mentor API secret not configured")
    if x_mentor_token != secret:
        raise HTTPException(status_code=401, detail="Invalid mentor token")
    return True


def _get_bucket() -> str:
    bucket = os.environ.get("SAGEMAKER_S3_BUCKET") or os.environ.get("SECOPS_S3_BUCKET")
    if not bucket:
        raise HTTPException(status_code=503, detail="SAGEMAKER_S3_BUCKET or SECOPS_S3_BUCKET env var not set")
    return bucket


def _get_role() -> str:
    role = os.environ.get("SAGEMAKER_ROLE_ARN")
    if not role:
        raise HTTPException(status_code=503, detail="SAGEMAKER_ROLE_ARN env var not set")
    return role


# ── Pydantic models ───────────────────────────────────────────────────────────
class GenerateDataRequest(BaseModel):
    pairs_per_chunk: int = 8
    s3_prefix: str = "mentor-training/data"
    mentor_type: str = "shri"


class GenerateDataResponse(BaseModel):
    s3_uri: str
    record_count: int
    chunks_processed: int


class TrainRequest(BaseModel):
    data_s3_uri: str
    model_id: str = "nvidia/Nemotron-Mini-4B-Instruct"
    instance_type: str = "ml.g4dn.2xlarge"
    registered_model_name: str = "Shri-Ma-Saraswathi"
    omega_state_vector: Optional[List[float]] = None
    use_hyperpod_cluster: bool = False


class TrainResponse(BaseModel):
    job_name: str
    model_output_s3: str
    instance_type: str
    status: str


class DeployRequest(BaseModel):
    model_data_s3: str
    endpoint_name: str = "shri-mentor-v1"
    instance_type: str = "ml.g4dn.xlarge"


class DeployResponse(BaseModel):
    endpoint_name: str
    instance_type: str
    status: str


class StatusResponse(BaseModel):
    job_name: Optional[str] = None
    job_status: Optional[str] = None
    endpoint_name: Optional[str] = None
    endpoint_status: Optional[str] = None
    eval_mode_active: bool


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/generate-data", response_model=GenerateDataResponse)
async def generate_data(
    req: GenerateDataRequest,
    _: bool = Depends(_require_mentor),
):
    """
    Generate synthetic Q&A training data from the 25 syllabus chunks using
    the NVIDIA Nemotron API. Uploads JSONL to S3 and returns the S3 URI.
    Runs generate_data.py as a subprocess (CPU-only, ~2-3 min for 200 pairs).
    """
    if not os.environ.get("NVIDIA_API_KEY"):
        raise HTTPException(status_code=503, detail="NVIDIA_API_KEY not set")

    bucket = _get_bucket()
    region = os.environ.get("AWS_REGION", "us-east-1")

    script = Path(__file__).parent.parent / "mentor_sagemaker" / "generate_data.py"
    cmd = [
        sys.executable, str(script),
        "--bucket", bucket,
        "--prefix", req.s3_prefix,
        "--pairs-per-chunk", str(req.pairs_per_chunk),
        "--region", region,
        "--mentor-type", req.mentor_type,
    ]

    log.info(f"Launching data generation: {' '.join(cmd)}")
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=600)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Data generation timed out (>10 min)")

    if proc.returncode != 0:
        err = stderr.decode()[-2000:] if stderr else "unknown error"
        log.error(f"Data generation failed: {err}")
        raise HTTPException(status_code=500, detail=f"Data generation failed: {err}")

    try:
        manifest = json.loads(stdout.decode().strip().splitlines()[-1])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse manifest: {e}")

    return GenerateDataResponse(
        s3_uri=manifest["s3_uri"],
        record_count=manifest["record_count"],
        chunks_processed=manifest["chunks_processed"],
    )


@router.post("/train", response_model=TrainResponse)
async def launch_training(
    req: TrainRequest,
    _: bool = Depends(_require_mentor),
):
    """
    Submit a SageMaker HuggingFace Training Job to fine-tune Nemotron-Mini-4B
    with LoRA on the generated JSONL dataset. Returns immediately — job runs async.
    Poll /status for progress.
    """
    role = _get_role()
    bucket = _get_bucket()
    region = os.environ.get("AWS_REGION", "us-east-1")
    hf_token = os.environ.get("HF_TOKEN")

    try:
        # Import here to avoid loading AWS sagemaker SDK at startup
        from mentor_sagemaker.launch_training import launch  # type: ignore
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: launch(
                role_arn=role,
                bucket=bucket,
                data_s3_uri=req.data_s3_uri,
                region=region,
                model_id=req.model_id,
                instance_type=req.instance_type,
                hf_token=hf_token,
                wait=False,
                registered_model_name=req.registered_model_name,
                omega_state_vector=req.omega_state_vector,
                use_hyperpod_cluster=req.use_hyperpod_cluster,
            ),
        )
    except Exception as e:
        log.error(f"Training launch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return TrainResponse(
        job_name=result["job_name"],
        model_output_s3=result["model_output_s3"],
        instance_type=result["instance_type"],
        status=result["status"],
    )


@router.post("/deploy", response_model=DeployResponse)
async def deploy_endpoint(
    req: DeployRequest,
    _: bool = Depends(_require_mentor),
):
    """
    Deploy a trained model.tar.gz as a SageMaker real-time endpoint.
    The endpoint name will be set as SAGEMAKER_ENDPOINT_NAME for eval mode.
    """
    role = _get_role()
    region = os.environ.get("AWS_REGION", "us-east-1")
    hf_token = os.environ.get("HF_TOKEN")

    try:
        from mentor_sagemaker.deploy_endpoint import deploy  # type: ignore
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: deploy(
                role_arn=role,
                model_data_s3=req.model_data_s3,
                endpoint_name=req.endpoint_name,
                region=region,
                hf_token=hf_token,
            ),
        )
    except Exception as e:
        log.error(f"Deployment failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    log.info(
        f"Endpoint '{req.endpoint_name}' deployed. "
        f"Set SAGEMAKER_ENDPOINT_NAME={req.endpoint_name} and MENTOR_EVAL_MODE=true to activate eval mode."
    )

    return DeployResponse(
        endpoint_name=result["endpoint_name"],
        instance_type=result["instance_type"],
        status=result["status"],
    )


@router.get("/status", response_model=StatusResponse)
async def get_status(_: bool = Depends(_require_mentor)):
    """Return the status of the latest training job and the eval endpoint."""
    region = os.environ.get("AWS_REGION", "us-east-1")
    endpoint_name = os.environ.get("SAGEMAKER_ENDPOINT_NAME")
    eval_mode = os.environ.get("MENTOR_EVAL_MODE", "").lower() == "true"

    if not _boto3_available or boto3 is None:
        raise HTTPException(status_code=503, detail="boto3 not installed — SageMaker features unavailable")

    sm = boto3.client("sagemaker", region_name=region)

    job_name = None
    job_status = None
    endpoint_status = None

    # Latest training job
    try:
        jobs = sm.list_training_jobs(
            NameContains="shri-mentor",
            SortBy="CreationTime",
            SortOrder="Descending",
            MaxResults=1,
        )
        if jobs["TrainingJobSummaries"]:
            j = jobs["TrainingJobSummaries"][0]
            job_name = j["TrainingJobName"]
            job_status = j["TrainingJobStatus"]
    except Exception as e:
        log.warning(f"Could not fetch training jobs: {e}")

    # Endpoint status
    if endpoint_name:
        try:
            ep = sm.describe_endpoint(EndpointName=endpoint_name)
            endpoint_status = ep["EndpointStatus"]
        except Exception as e:
            endpoint_status = f"not found ({e})"

    return StatusResponse(
        job_name=job_name,
        job_status=job_status,
        endpoint_name=endpoint_name,
        endpoint_status=endpoint_status,
        eval_mode_active=eval_mode and bool(endpoint_name),
    )


# ── Combined Async Flow Route ───────────────────────────────────────────────────

class AsyncQueryRequest(BaseModel):
    query: str
    user_id: str
    topic: Optional[str] = "shri-mentor-events"


class AsyncQueryResponse(BaseModel):
    response: Optional[str]
    status: str


@router.post("/async-query", response_model=AsyncQueryResponse)
async def async_query(req: AsyncQueryRequest):
    """
    Example combined async flow:
    1. Publishes a query event asynchronously to Confluent Cloud (Kafka)
    2. Invokes the SageMaker endpoint asynchronously using aioboto3
    3. Publishes a response event asynchronously to Confluent Cloud (Kafka)
    """
    # Step 1: Publish incoming query event to Kafka
    start_time = time.time()
    iso_timestamp = datetime.now(timezone.utc).isoformat()
    query_event = {
        "event_type": "query_received",
        "user_id": req.user_id,
        "query": req.query,
        "timestamp_unix": start_time,
        "timestamp_iso": iso_timestamp,
    }
    try:
        await publish_event_async(req.topic, query_event)
    except Exception as e:
        log.warning(f"Failed to publish query_received event to Kafka: {e}")

    # Step 2: Invoke SageMaker asynchronously
    response_text = await invoke_shri_mentor_async(req.query, req.user_id)

    # Step 3: Publish response generated event to Kafka
    end_time = time.time()
    response_event = {
        "event_type": "response_generated",
        "user_id": req.user_id,
        "query": req.query,
        "response": response_text,
        "latency_seconds": end_time - start_time,
        "timestamp_unix": end_time,
        "timestamp_iso": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await publish_event_async(req.topic, response_event)
    except Exception as e:
        log.warning(f"Failed to publish response_generated event to Kafka: {e}")

    return AsyncQueryResponse(
        response=response_text,
        status="success" if response_text else "failed"
    )



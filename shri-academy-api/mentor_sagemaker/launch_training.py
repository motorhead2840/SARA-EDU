"""
launch_training.py — Launch a SageMaker HuggingFace Training Job for the Shri mentor.

Reads the S3 data URI from generate_data.py's manifest, creates the estimator,
and submits the job. Can be run standalone or called from the FastAPI route.

Usage:
    python shri-academy-api/sagemaker/launch_training.py \
        --role-arn arn:aws:iam::123456789012:role/SageMakerExecutionRole \
        --bucket my-bucket \
        --data-s3-uri s3://my-bucket/mentor-training/data/train.jsonl \
        --region us-east-1

Env vars:
    SAGEMAKER_ROLE_ARN    — SageMaker execution role
    AWS_REGION            — defaults to us-east-1
"""

import argparse
import json
import logging
import os
from datetime import datetime

import boto3
import sagemaker
from sagemaker.huggingface import HuggingFace

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ── Defaults ──────────────────────────────────────────────────────────────────
DEFAULT_MODEL_ID = "nvidia/Nemotron-Mini-4B-Instruct"
# g4dn.2xlarge: 1× T4 16 GB — cheapest GPU for 4-bit LoRA on 4B params
# Upgrade to g5.2xlarge (A10G 24 GB) for faster training
TRAINING_INSTANCE = "ml.g4dn.2xlarge"

# HuggingFace DLC — PyTorch 2.1, transformers 4.37, CUDA 12.1
HF_CONTAINER = {
    "pytorch_version": "2.1.0",
    "transformers_version": "4.37.0",
    "py_version": "py310",
}


def get_session(region: str) -> sagemaker.Session:
    boto_session = boto3.Session(region_name=region)
    return sagemaker.Session(boto_session=boto_session)


def launch(
    role_arn: str,
    bucket: str,
    data_s3_uri: str,
    region: str = "us-east-1",
    model_id: str = DEFAULT_MODEL_ID,
    instance_type: str = TRAINING_INSTANCE,
    job_name: str | None = None,
    hf_token: str | None = None,
    wait: bool = False,
) -> dict:
    if job_name is None:
        ts = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        job_name = f"shri-mentor-{ts}"

    session = get_session(region)

    environment = {
        "TRANSFORMERS_CACHE": "/tmp/hf_cache",
    }
    if hf_token:
        environment["HF_TOKEN"] = hf_token

    hyperparameters = {
        "model_id": model_id,
        "epochs": "3",
        "per_device_train_batch_size": "4",
        "gradient_accumulation_steps": "4",
        "learning_rate": "2e-4",
        "max_seq_length": "2048",
        "lora_r": "16",
        "lora_alpha": "32",
        "lora_dropout": "0.1",
    }

    estimator = HuggingFace(
        entry_point="train.py",
        source_dir=os.path.join(os.path.dirname(__file__), "training"),
        role=role_arn,
        sagemaker_session=session,
        instance_type=instance_type,
        instance_count=1,
        transformers_version=HF_CONTAINER["transformers_version"],
        pytorch_version=HF_CONTAINER["pytorch_version"],
        py_version=HF_CONTAINER["py_version"],
        hyperparameters=hyperparameters,
        environment=environment,
        volume_size=50,  # GB — model + cache
        max_run=3 * 3600,  # 3 hour ceiling
        output_path=f"s3://{bucket}/mentor-training/output",
        base_job_name="shri-mentor",
    )

    log.info(f"Submitting training job '{job_name}' on {instance_type} ...")
    estimator.fit(
        {"training": data_s3_uri.rsplit("/", 1)[0]},  # S3 prefix, not file
        job_name=job_name,
        wait=wait,
        logs=wait,
    )

    result = {
        "job_name": estimator.latest_training_job.name,
        "model_output_s3": f"s3://{bucket}/mentor-training/output/{estimator.latest_training_job.name}/output/model.tar.gz",
        "instance_type": instance_type,
        "model_id": model_id,
        "status": "InProgress" if not wait else "Completed",
    }
    log.info(f"Training job result: {result}")
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--role-arn", default=os.environ.get("SAGEMAKER_ROLE_ARN"))
    parser.add_argument("--bucket", required=True)
    parser.add_argument("--data-s3-uri", required=True)
    parser.add_argument("--region", default=os.environ.get("AWS_REGION", "us-east-1"))
    parser.add_argument("--model-id", default=DEFAULT_MODEL_ID)
    parser.add_argument("--instance-type", default=TRAINING_INSTANCE)
    parser.add_argument("--hf-token", default=os.environ.get("HF_TOKEN"))
    parser.add_argument("--wait", action="store_true")
    args = parser.parse_args()

    if not args.role_arn:
        raise ValueError("--role-arn or SAGEMAKER_ROLE_ARN env var is required")

    result = launch(
        role_arn=args.role_arn,
        bucket=args.bucket,
        data_s3_uri=args.data_s3_uri,
        region=args.region,
        model_id=args.model_id,
        instance_type=args.instance_type,
        hf_token=args.hf_token,
        wait=args.wait,
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()

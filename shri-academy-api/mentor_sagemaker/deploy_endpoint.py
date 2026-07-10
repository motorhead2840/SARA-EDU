"""
deploy_endpoint.py — Deploy a trained Shri mentor model as a SageMaker real-time endpoint.

Run after the training job completes and the model.tar.gz is in S3.

Usage:
    python shri-academy-api/sagemaker/deploy_endpoint.py \
        --role-arn arn:aws:iam::123456789012:role/SageMakerExecutionRole \
        --model-data s3://my-bucket/mentor-training/output/<job>/output/model.tar.gz \
        --endpoint-name shri-mentor-v1 \
        --region us-east-1

Env vars:
    SAGEMAKER_ROLE_ARN
    AWS_REGION
"""

import argparse
import json
import logging
import os

import boto3
import sagemaker
from sagemaker.huggingface import HuggingFaceModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

INFERENCE_INSTANCE = "ml.g4dn.xlarge"  # 1× T4 — sufficient for 4B inference

HF_CONTAINER = {
    "pytorch_version": "2.1.0",
    "transformers_version": "4.37.0",
    "py_version": "py310",
}


def deploy(
    role_arn: str,
    model_data_s3: str,
    endpoint_name: str,
    region: str = "us-east-1",
    instance_type: str = INFERENCE_INSTANCE,
    hf_token: str | None = None,
) -> dict:
    boto_session = boto3.Session(region_name=region)
    session = sagemaker.Session(boto_session=boto_session)

    environment = {
        "HF_TASK": "text-generation",
        "MAX_NEW_TOKENS": "1024",
    }
    if hf_token:
        environment["HF_TOKEN"] = hf_token

    model = HuggingFaceModel(
        model_data=model_data_s3,
        role=role_arn,
        sagemaker_session=session,
        transformers_version=HF_CONTAINER["transformers_version"],
        pytorch_version=HF_CONTAINER["pytorch_version"],
        py_version=HF_CONTAINER["py_version"],
        env=environment,
    )

    log.info(f"Deploying to endpoint '{endpoint_name}' on {instance_type} ...")
    predictor = model.deploy(
        initial_instance_count=1,
        instance_type=instance_type,
        endpoint_name=endpoint_name,
    )

    result = {
        "endpoint_name": endpoint_name,
        "model_data": model_data_s3,
        "instance_type": instance_type,
        "region": region,
        "status": "InService",
    }
    log.info(f"Endpoint deployed: {result}")
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--role-arn", default=os.environ.get("SAGEMAKER_ROLE_ARN"))
    parser.add_argument("--model-data", required=True, help="S3 URI of model.tar.gz")
    parser.add_argument("--endpoint-name", default="shri-mentor-v1")
    parser.add_argument("--region", default=os.environ.get("AWS_REGION", "us-east-1"))
    parser.add_argument("--instance-type", default=INFERENCE_INSTANCE)
    parser.add_argument("--hf-token", default=os.environ.get("HF_TOKEN"))
    args = parser.parse_args()

    if not args.role_arn:
        raise ValueError("--role-arn or SAGEMAKER_ROLE_ARN env var is required")

    result = deploy(
        role_arn=args.role_arn,
        model_data_s3=args.model_data,
        endpoint_name=args.endpoint_name,
        region=args.region,
        instance_type=args.instance_type,
        hf_token=args.hf_token,
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()

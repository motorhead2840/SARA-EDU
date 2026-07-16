#!/usr/bin/env python3
"""
verify_phase1.py - Verify IAM roles, S3 buckets, Feature Store groups, and setup environment variables.
Supports both active AWS credential checking and dry-run static validation.
"""

import os
import re
import sys
import secrets
import logging
from pathlib import Path

FALLBACK_ACCOUNT_ID = "123456789012"
S3_BUCKET_TF_REGEX = r'sagemaker\s*=\s*"\$\{var\.project\}-\$\{var\.environment\}-sagemaker"'

# Ensure we can import from parent directory if needed
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from dotenv import load_dotenv, find_dotenv
    # Load from the repo root or look up find_dotenv
    dotenv_path = find_dotenv() or str(Path(__file__).parent.parent.parent / ".env")
    load_dotenv(dotenv_path)
    _dotenv_available = True
except ImportError:
    _dotenv_available = False
    dotenv_path = str(Path(__file__).parent.parent.parent / ".env")

try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
    _boto3_available = True
except ImportError:
    boto3 = None  # type: ignore
    _boto3_available = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger("Phase1Verifier")


def get_aws_client(service_name: str, region: str):
    if not _boto3_available or boto3 is None:
        return None
    try:
        return boto3.client(service_name, region_name=region)
    except (NoCredentialsError, ClientError):
        return None


def verify_iam_role(iam_client, role_arn: str) -> tuple[bool, str]:
    """Verify if the IAM Role exists and has sagemaker as trusted service."""
    if not iam_client:
        return False, "AWS credentials not available"
    try:
        # Extract role name from ARN
        role_name = role_arn.split("/")[-1]
        resp = iam_client.get_role(RoleName=role_name)
        role = resp["Role"]
        
        # Verify trust policy
        assume_policy = role.get("AssumeRolePolicyDocument", {})
        trusted_sagemaker = False
        for statement in assume_policy.get("Statement", []):
            principal = statement.get("Principal", {})
            service = principal.get("Service", "")
            if service == "sagemaker.amazonaws.com" or "sagemaker.amazonaws.com" in service:
                trusted_sagemaker = True
                break
        
        if trusted_sagemaker:
            return True, f"Role '{role_name}' exists and trusts SageMaker"
        else:
            return True, f"Role '{role_name}' exists but does NOT trust SageMaker in assume role policy"
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "")
        if error_code == "NoSuchEntity":
            return False, f"Role '{role_arn}' does not exist"
        return False, f"Error checking role '{role_arn}': {e}"
    except Exception as e:
        return False, f"Error: {e}"


def verify_s3_bucket(s3_client, bucket_name: str, region: str, auto_create: bool = False) -> tuple[bool, str]:
    """Verify S3 Bucket exists and is accessible. Attempt creation if auto_create is True."""
    if not s3_client:
        return False, "AWS credentials not available"
    try:
        s3_client.head_bucket(Bucket=bucket_name)
        return True, f"Bucket '{bucket_name}' exists and is accessible"
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        if error_code in ("404", "NoSuchBucket"):
            if auto_create:
                logger.info(f"Bucket '{bucket_name}' not found. Attempting to create in {region}...")
                try:
                    if region == "us-east-1":
                        s3_client.create_bucket(Bucket=bucket_name)
                    else:
                        s3_client.create_bucket(
                            Bucket=bucket_name,
                            CreateBucketConfiguration={"LocationConstraint": region}
                        )
                    return True, f"Bucket '{bucket_name}' successfully created"
                except Exception as create_err:
                    return False, f"Failed to create bucket '{bucket_name}': {create_err}"
            return False, f"Bucket '{bucket_name}' does not exist"
        return False, f"Bucket '{bucket_name}' head check failed with code {error_code}: {e}"
    except Exception as e:
        return False, f"Error checking bucket '{bucket_name}': {e}"


def verify_feature_group(sm_client, feature_group_name: str) -> tuple[bool, str]:
    """Verify if SageMaker Feature Store Feature Group exists and is active."""
    if not sm_client:
        return False, "AWS credentials not available"
    try:
        resp = sm_client.describe_feature_group(FeatureGroupName=feature_group_name)
        status = resp.get("FeatureGroupStatus", "Unknown")
        if status == "Created":
            return True, f"Feature group '{feature_group_name}' is Active (status: {status})"
        return False, f"Feature group '{feature_group_name}' exists but has status: {status}"
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "")
        if "ResourceNotFound" in error_code or error_code == "ValidationException":
            return False, f"Feature group '{feature_group_name}' does not exist"
        return False, f"Error checking Feature Group '{feature_group_name}': {e}"
    except Exception as e:
        return False, f"Error: {e}"


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Phase 1 Verification Script")
    parser.add_argument("--auto-create", action="store_true", help="Auto-create the S3 bucket if it is missing")
    parser.add_argument("--write-dotenv", action="store_true", help="Generate or update .env file with configured values")
    args = parser.parse_args()

    logger.info("=== Phase 1: Infrastructure and Environment Configuration Verification ===")
    
    # Load current configuration. In the Terraform infrastructure, project is defined as "sri"
    # and environment is "production" (e.g. s3 bucket is "sri-production-sagemaker").
    project_name = os.environ.get("PROJECT_NAME_PREFIX", "sri")
    environment = os.environ.get("ENVIRONMENT", "production")
    
    aws_region = os.environ.get("AWS_REGION", "us-east-1")
    sagemaker_role_arn = os.environ.get("SAGEMAKER_ROLE_ARN")
    
    # SECOPS_S3_BUCKET is the historical fallback bucket used originally in the codebase
    sagemaker_s3_bucket = os.environ.get("SAGEMAKER_S3_BUCKET") or os.environ.get("SECOPS_S3_BUCKET")
    mentor_api_secret = os.environ.get("MENTOR_API_SECRET")
    
    # generate_data.py falls back to OpenAI models (like gpt-4o) if the API key begins with "sk-"
    nvidia_api_key = os.environ.get("NVIDIA_API_KEY") or os.environ.get("OPENAI_API_KEY")
    hf_token = os.environ.get("HF_TOKEN")

    # If sagemaker_role_arn or sagemaker_s3_bucket are not set, derive from standard resources
    standard_resource_name = f"{project_name}-{environment}-sagemaker"
    
    role_was_derived = False
    if not sagemaker_role_arn:
        # We need an account ID to derive a full ARN, so let's check if boto3 can tell us, else we use placeholder
        account_id = FALLBACK_ACCOUNT_ID
        try:
            if _boto3_available and boto3:
                sts = boto3.client("sts")
                account_id = sts.get_caller_identity()["Account"]
        except (NoCredentialsError, ClientError):
            logger.info("Could not retrieve AWS caller identity dynamically (NoCredentials or ClientError).")
        sagemaker_role_arn = f"arn:aws:iam::{account_id}:role/{standard_resource_name}"
        role_was_derived = True

    bucket_was_derived = False
    if not sagemaker_s3_bucket:
        sagemaker_s3_bucket = standard_resource_name
        bucket_was_derived = True

    feature_group_mentor = f"{project_name}-{environment}-mentor-activity"
    feature_group_blockchain = f"{project_name}-{environment}-blockchain-events"

    # 1. Check AWS Connectivity & Credentials
    credentials_active = False
    if _boto3_available:
        try:
            sts_client = boto3.client("sts")
            caller_identity = sts_client.get_caller_identity()
            account_id = caller_identity.get("Account")
            arn = caller_identity.get("Arn")
            logger.info(f"AWS Credentials Active! Connected to Account ID: {account_id} as Identity: {arn}")
            credentials_active = True
        except Exception as e:
            logger.warning(f"AWS Credentials NOT active (No connection / NoCredentials): {e}")
            logger.info("Running in DRY-RUN/STATIC check mode. Static assets and configurations will be verified.")
    else:
        logger.warning("boto3 package not installed or import failed. Static check mode only.")

    # 2. Perform Verification
    verification_results = {}
    
    if credentials_active:
        iam = get_aws_client("iam", aws_region)
        s3 = get_aws_client("s3", aws_region)
        sm = get_aws_client("sagemaker", aws_region)
        
        # Verify IAM Role
        role_ok, role_msg = verify_iam_role(iam, sagemaker_role_arn)
        verification_results["IAM_ROLE"] = (role_ok, role_msg)
        
        # Verify S3 Bucket
        s3_ok, s3_msg = verify_s3_bucket(s3, sagemaker_s3_bucket, aws_region, auto_create=args.auto_create)
        verification_results["S3_BUCKET"] = (s3_ok, s3_msg)
        
        # Verify Feature Groups
        fg_mentor_ok, fg_mentor_msg = verify_feature_group(sm, feature_group_mentor)
        fg_bc_ok, fg_bc_msg = verify_feature_group(sm, feature_group_blockchain)
        verification_results["FEATURE_GROUP_MENTOR"] = (fg_mentor_ok, fg_mentor_msg)
        verification_results["FEATURE_GROUP_BLOCKCHAIN"] = (fg_bc_ok, fg_bc_msg)
    else:
        # Static Dry Run Analysis
        logger.info("[Dry-Run] Verifying resources match Terraform configuration...")
        
        # Verify IAM role exists in iam.tf
        iam_tf_path = Path(__file__).parent.parent.parent / "infrastructure" / "terraform" / "iam.tf"
        role_ok, role_msg = False, "IAM role definition not verified"
        if iam_tf_path.exists():
            content = iam_tf_path.read_text()
            if 'resource "aws_iam_role" "sagemaker"' in content:
                role_ok = True
                role_msg = f"[Dry-Run Check Passed] SageMaker IAM Role is declared in {iam_tf_path.name}"
            else:
                role_msg = f"[Dry-Run Check Failed] SageMaker IAM Role is NOT found in {iam_tf_path.name}"
        else:
            role_msg = f"Dry-run could not find {iam_tf_path}"
        verification_results["IAM_ROLE"] = (role_ok, role_msg)

        # Verify S3 bucket exists in s3.tf
        s3_tf_path = Path(__file__).parent.parent.parent / "infrastructure" / "terraform" / "s3.tf"
        s3_ok, s3_msg = False, "S3 bucket definition not verified"
        if s3_tf_path.exists():
            content = s3_tf_path.read_text()
            # Match using our module-level constant for flexible whitespace, or raw resource
            s3_match = re.search(S3_BUCKET_TF_REGEX, content)
            if s3_match or 'resource "aws_s3_bucket" "sagemaker"' in content:
                s3_ok = True
                s3_msg = f"[Dry-Run Check Passed] SageMaker S3 Bucket is declared in {s3_tf_path.name}"
            else:
                s3_msg = f"[Dry-Run Check Failed] SageMaker S3 Bucket is NOT found in {s3_tf_path.name}"
        else:
            s3_msg = f"Dry-run could not find {s3_tf_path}"
        verification_results["S3_BUCKET"] = (s3_ok, s3_msg)

        # Verify Feature Groups in sagemaker_extended.tf / sagemaker.tf
        fg_tf_path = Path(__file__).parent.parent.parent / "infrastructure" / "terraform" / "sagemaker_extended.tf"
        fg_mentor_ok, fg_mentor_msg = False, "Feature group mentor activity definition not verified"
        fg_bc_ok, fg_bc_msg = False, "Feature group blockchain events definition not verified"
        if fg_tf_path.exists():
            content = fg_tf_path.read_text()
            if 'resource "aws_sagemaker_feature_group" "mentor_activity"' in content:
                fg_mentor_ok = True
                fg_mentor_msg = f"[Dry-Run Check Passed] mentor_activity feature group is declared in {fg_tf_path.name}"
            else:
                fg_mentor_msg = f"[Dry-Run Check Failed] mentor_activity feature group is NOT found in {fg_tf_path.name}"
                
            if 'resource "aws_sagemaker_feature_group" "blockchain_events"' in content:
                fg_bc_ok = True
                fg_bc_msg = f"[Dry-Run Check Passed] blockchain_events feature group is declared in {fg_tf_path.name}"
            else:
                fg_bc_msg = f"[Dry-Run Check Failed] blockchain_events feature group is NOT found in {fg_tf_path.name}"
        else:
            fg_mentor_msg = f"Dry-run could not find {fg_tf_path}"
            fg_bc_msg = f"Dry-run could not find {fg_tf_path}"
            
        verification_results["FEATURE_GROUP_MENTOR"] = (fg_mentor_ok, fg_mentor_msg)
        verification_results["FEATURE_GROUP_BLOCKCHAIN"] = (fg_bc_ok, fg_bc_msg)

    # 3. Check and generate secrets/API keys
    secret_auto_generated = False
    if not mentor_api_secret:
        logger.warning("MENTOR_API_SECRET is not configured!")
        new_secret = secrets.token_hex(32)
        logger.info("Auto-generated a secure MENTOR_API_SECRET: *** [AUTO-GENERATED]")
        mentor_api_secret = new_secret
        secret_auto_generated = True
    else:
        logger.info("MENTOR_API_SECRET is set and active.")

    if not nvidia_api_key:
        logger.warning("NVIDIA_API_KEY / OPENAI_API_KEY is not configured! Fine-tuning data generation will fail.")
    else:
        logger.info("Teacher API Key is configured.")

    if not hf_token:
        logger.info("HF_TOKEN is not configured (optional, required if accessing gated HuggingFace models).")
    else:
        logger.info("HF_TOKEN is configured.")

    # 4. Print beautiful status report
    print("\n" + "="*80)
    print("PHASE 1 RESOURCES VERIFICATION REPORT")
    print("="*80)
    
    all_ok = True
    for key, (ok, msg) in verification_results.items():
        status_str = "🟢 OK" if ok else "🔴 FAIL"
        if not ok:
            all_ok = False
        print(f"[{status_str}] {key:25} : {msg}")
        
    print("-"*80)
    print("ENVIRONMENT CONFIGURATION:")
    print(f"  PROJECT PREFIX:      {project_name}")
    print(f"  ENVIRONMENT:         {environment}")
    print(f"  AWS_REGION:          {aws_region}")
    get_suffix = lambda derived_flag: " (derived/fallback)" if derived_flag else ""
    print(f"  SAGEMAKER_ROLE_ARN:  {sagemaker_role_arn}{get_suffix(role_was_derived)}")
    print(f"  SAGEMAKER_S3_BUCKET: {sagemaker_s3_bucket}{get_suffix(bucket_was_derived)}")
    print(f"  MENTOR_API_SECRET:   *** [SET]" if mentor_api_secret else "  MENTOR_API_SECRET:   None")
    print(f"  NVIDIA_API_KEY:      *** [SET]" if nvidia_api_key else "  NVIDIA_API_KEY:      None")
    print(f"  HF_TOKEN:            *** [SET]" if hf_token else "  HF_TOKEN:            None")
    print("="*80 + "\n")

    # 5. Write `.env` file if requested or if a secret was dynamically auto-generated
    if args.write_dotenv or secret_auto_generated or not Path(dotenv_path).exists():
        if secret_auto_generated and not args.write_dotenv:
            logger.info("Auto-enabling write-dotenv to persist the newly auto-generated MENTOR_API_SECRET.")
        logger.info(f"Writing updated configuration to {dotenv_path}...")
        
        # Read existing file content if it exists
        existing_lines = []
        if Path(dotenv_path).exists():
            existing_lines = Path(dotenv_path).read_text().splitlines()
            
        keys_to_update = {
            "SAGEMAKER_ROLE_ARN": sagemaker_role_arn,
            "SAGEMAKER_S3_BUCKET": sagemaker_s3_bucket,
            "AWS_REGION": aws_region,
            "MENTOR_API_SECRET": mentor_api_secret,
        }
        
        if nvidia_api_key:
            keys_to_update["NVIDIA_API_KEY"] = nvidia_api_key
        if hf_token:
            keys_to_update["HF_TOKEN"] = hf_token
            
        new_lines = []
        for line in existing_lines:
            # Check if this line is a comment or empty
            stripped_line = line.strip()
            if not stripped_line or stripped_line.startswith("#"):
                new_lines.append(line)
                continue
                
            # Check if this line is one of our keys
            matched_key = None
            for key in keys_to_update:
                if stripped_line.startswith(f"{key}="):
                    matched_key = key
                    break
            
            if matched_key:
                # Replace line with new value
                new_lines.append(f"{matched_key}={keys_to_update[matched_key]}")
                del keys_to_update[matched_key]
            else:
                new_lines.append(line)
                
        # Append remaining keys that were not found in existing lines
        if keys_to_update:
            new_lines.append("")
            new_lines.append("# Auto-generated SageMaker and Mentor API environment variables")
            for key, val in keys_to_update.items():
                new_lines.append(f"{key}={val}")
            
        # Write back to file
        Path(dotenv_path).write_text("\n".join(new_lines) + "\n")
        logger.info("Successfully wrote .env configuration!")


if __name__ == "__main__":
    main()

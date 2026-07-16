#!/usr/bin/env python3
"""
verify_phase2.py - Verify Phase 2 readiness for Synthetic Training Data Generation.
Checks required environment variables, syllabus knowledge chunk import, generator script availability,
and provides live/dry-run checks for teacher model (NVIDIA NIM) connectivity and S3 writeability.
"""

import os
import sys
import json
import logging
import argparse
import tempfile
from pathlib import Path

# Ensure parent directory is in sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from dotenv import load_dotenv, find_dotenv
    dotenv_path = find_dotenv() or str(Path(__file__).parent.parent.parent / ".env")
    load_dotenv(dotenv_path)
    _dotenv_available = True
except ImportError:
    _dotenv_available = False
    dotenv_path = str(Path(__file__).parent.parent.parent / ".env")
    # Manual dotenv parsing fallback when python-dotenv is not installed
    p = Path(dotenv_path)
    if p.exists():
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                val = val.strip()
                if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                    val = val[1:-1]
                os.environ[key.strip()] = val

try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
    _boto3_available = True
except ImportError:
    boto3 = None  # type: ignore
    _boto3_available = False

try:
    import openai
    from openai import OpenAI
    _openai_available = True
except ImportError:
    OpenAI = None  # type: ignore
    _openai_available = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger("Phase2Verifier")


def check_syllabus() -> tuple[bool, str]:
    """Verify that syllabus.py exists, is importable, and has non-empty chunks."""
    try:
        from syllabus import SYLLABUS_CHUNKS
        chunk_count = len(SYLLABUS_CHUNKS)
        if chunk_count > 0:
            return True, f"Imported syllabus successfully with {chunk_count} curriculum chunks"
        else:
            return False, "Syllabus was imported, but SYLLABUS_CHUNKS is empty"
    except Exception as e:
        return False, f"Failed to import syllabus: {e}"


def check_generator_script() -> tuple[bool, str]:
    """Verify that generate_data.py exists and is syntactically valid."""
    script_path = Path(__file__).parent / "generate_data.py"
    if not script_path.exists():
        return False, f"generate_data.py not found at {script_path}"
    
    # Check syntax by compiling the script
    try:
        with open(script_path, "r", encoding="utf-8") as f:
            source = f.read()
        compile(source, str(script_path), "exec")
        return True, "generate_data.py exists and compiled successfully (syntax OK)"
    except Exception as e:
        return False, f"Syntax or compile error in generate_data.py: {e}"


def check_s3_write(s3_client, bucket_name: str, region: str) -> tuple[bool, str]:
    """Check write access to the S3 bucket by uploading and deleting a tiny dummy file."""
    if not s3_client:
        return False, "AWS credentials not available"
    
    test_key = "mentor-training/phase2-write-test.txt"
    try:
        # Check bucket existence first
        s3_client.head_bucket(Bucket=bucket_name)
        
        # Try uploading a dummy file
        s3_client.put_object(
            Bucket=bucket_name,
            Key=test_key,
            Body=b"Phase 2 verification S3 write check",
            ContentType="text/plain"
        )
        
        # Clean up immediately
        s3_client.delete_object(Bucket=bucket_name, Key=test_key)
        return True, f"S3 write and delete operations succeeded on bucket '{bucket_name}'"
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        return False, f"S3 bucket '{bucket_name}' write/head check failed with code {error_code}: {e}"
    except Exception as e:
        return False, f"Error checking S3 write on bucket '{bucket_name}': {e}"


def check_teacher_connectivity(api_key: str) -> tuple[bool, str]:
    """Check connectivity to NVIDIA NIM teacher model endpoint."""
    if not _openai_available:
        return False, "openai package is not installed"
    if not api_key:
        return False, "NVIDIA_API_KEY is not configured"
    
    try:
        # Instantiating the OpenAI client with a client-level timeout.
        # A 15-second timeout allows for transient API network latency while 
        # preventing connectivity checks from hanging indefinitely.
        client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=api_key,
            timeout=15.0
        )
        # Attempt a very lightweight model check or a minimal chat completion
        # We target nvidia/llama-3.1-nemotron-70b-instruct as specified in generate_data.py
        logger.info("Testing connectivity to NVIDIA NIM endpoint...")
        resp = client.chat.completions.create(
            model="nvidia/llama-3.1-nemotron-70b-instruct",
            messages=[{"role": "user", "content": "Respond with the single word: OK"}],
            max_tokens=10,
            temperature=0.1
        )
        text = resp.choices[0].message.content.strip()
        return True, f"Connected to NVIDIA NIM! Teacher model response: '{text}'"
    except Exception as e:
        return False, f"NVIDIA NIM connectivity check failed: {e}"


def run_live_test(api_key: str, bucket_name: str, region: str) -> bool:
    """Run an end-to-end synthetic data generation for exactly 1 chunk and upload to S3."""
    logger.info("=== RUNNING LIVE PHASE 2 DATA GENERATION INTEGRATION TEST ===")
    
    if not _openai_available:
        logger.error("openai package missing. Cannot run live integration test.")
        return False
    if not api_key:
        logger.error("NVIDIA_API_KEY is not configured. Cannot run live integration test.")
        return False
    if not _boto3_available:
        logger.error("boto3 package missing. Cannot run live S3 upload test.")
        return False
    
    try:
        from syllabus import SYLLABUS_CHUNKS
        from generate_data import build_client, generate_pairs, to_training_record, SYSTEM_PROMPT_SHRI, upload_to_s3
    except ImportError as e:
        logger.error(f"Failed to import from generator files: {e}")
        return False

    if not SYLLABUS_CHUNKS:
        logger.error("No syllabus chunks available.")
        return False
    
    test_chunk_id, test_chunk_text = SYLLABUS_CHUNKS[0]
    logger.info(f"Generating 1 Q&A pair for test chunk '{test_chunk_id}'...")
    
    try:
        client = build_client()
        pairs = generate_pairs(client, test_chunk_text, n=1, retries=2)
        if not pairs:
            logger.error("Failed to generate Q&A pair from teacher model.")
            return False
        
        pair = pairs[0]
        logger.info(f"Generated Q: '{pair['question']}'")
        logger.info(f"Generated A: '{pair['answer']}'")
        
        # Format record
        record = to_training_record(pair["question"], pair["answer"], system_prompt=SYSTEM_PROMPT_SHRI)
        
        # Save and upload local file using a unique temporary directory context manager
        with tempfile.TemporaryDirectory() as temp_dir_str:
            test_dir = Path(temp_dir_str)
            local_file = test_dir / "test_train.jsonl"
            with open(local_file, "w", encoding="utf-8") as f:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
                
            logger.info(f"Wrote local test dataset to {local_file}")
            
            # Upload to S3
            test_s3_key = "mentor-training/test-data/train.jsonl"
            s3_uri = upload_to_s3(str(local_file), bucket_name, test_s3_key, region)
            logger.info(f"Integration test S3 upload successful: {s3_uri}")
            
        return True
    except Exception as e:
        logger.error(f"Live integration test failed: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Phase 2 Verification Script")
    parser.add_argument("--live-test", action="store_true", help="Execute an end-to-end live generation test with NVIDIA NIM and S3 upload")
    parser.add_argument("--bucket", help="S3 bucket name override")
    args = parser.parse_args()

    logger.info("=== Phase 2: Synthetic Training Data Generation Verification ===")
    
    # 1. Environment Config
    project_name = os.environ.get("PROJECT_NAME_PREFIX", "sri")
    environment = os.environ.get("ENVIRONMENT", "production")
    aws_region = os.environ.get("AWS_REGION", "us-east-1")
    
    sagemaker_s3_bucket = args.bucket or os.environ.get("SAGEMAKER_S3_BUCKET") or os.environ.get("SECOPS_S3_BUCKET")
    if not sagemaker_s3_bucket:
        sagemaker_s3_bucket = f"{project_name}-{environment}-sagemaker"
        bucket_derived = True
    else:
        bucket_derived = False

    mentor_api_secret = os.environ.get("MENTOR_API_SECRET")
    nvidia_api_key = os.environ.get("NVIDIA_API_KEY")

    # Check for active AWS credentials
    credentials_active = False
    if _boto3_available:
        try:
            sts_client = boto3.client("sts")
            sts_client.get_caller_identity()
            credentials_active = True
        except Exception:
            pass

    verification_results = {}

    # 2. Check Syllabus Chunk Parsing
    syl_ok, syl_msg = check_syllabus()
    verification_results["SYLLABUS_CHUNKS"] = (syl_ok, syl_msg)

    # 3. Check Data Generator Script Compilation & Syntax
    gen_ok, gen_msg = check_generator_script()
    verification_results["GENERATOR_SCRIPT"] = (gen_ok, gen_msg)

    # 4. Check Environment Variables
    env_ok = True
    env_msgs = []
    if not mentor_api_secret:
        env_ok = False
        env_msgs.append("MENTOR_API_SECRET is missing (needed for auth routes)")
    else:
        env_msgs.append("MENTOR_API_SECRET is set")

    if not nvidia_api_key:
        env_ok = False
        env_msgs.append("NVIDIA_API_KEY is missing (needed for synthetic generation)")
    else:
        env_msgs.append("NVIDIA_API_KEY is set")

    if not sagemaker_s3_bucket:
        env_ok = False
        env_msgs.append("SAGEMAKER_S3_BUCKET is missing")
    else:
        derived_suffix = " (derived/fallback)" if bucket_derived else ""
        env_msgs.append(f"SAGEMAKER_S3_BUCKET set to {sagemaker_s3_bucket}{derived_suffix}")

    verification_results["ENVIRONMENT_VARS"] = (env_ok, "; ".join(env_msgs))

    # 5. Check Teacher Model Connectivity
    if nvidia_api_key:
        conn_ok, conn_msg = check_teacher_connectivity(nvidia_api_key)
        verification_results["NVIDIA_NIM_CONNECTIVITY"] = (conn_ok, conn_msg)
    else:
        verification_results["NVIDIA_NIM_CONNECTIVITY"] = (False, "NVIDIA_API_KEY not configured, skipping connectivity check")

    # 6. Check S3 Write Permissions
    if credentials_active:
        s3 = boto3.client("s3", region_name=aws_region)
        s3_write_ok, s3_write_msg = check_s3_write(s3, sagemaker_s3_bucket, aws_region)
        verification_results["S3_BUCKET_WRITE"] = (s3_write_ok, s3_write_msg)
    else:
        # Static dry-run verification
        s3_tf_path = Path(__file__).parent.parent.parent / "infrastructure" / "terraform" / "s3.tf"
        if s3_tf_path.exists():
            content = s3_tf_path.read_text()
            if 'resource "aws_s3_bucket" "sagemaker"' in content:
                verification_results["S3_BUCKET_WRITE"] = (True, f"[Dry-Run Check Passed] SageMaker S3 bucket configured in {s3_tf_path.name}")
            else:
                verification_results["S3_BUCKET_WRITE"] = (False, f"[Dry-Run Check Failed] SageMaker S3 bucket resource NOT found in {s3_tf_path.name}")
        else:
            verification_results["S3_BUCKET_WRITE"] = (False, f"S3 write check skipped (No AWS credentials and s3.tf not found at {s3_tf_path})")

    # 7. Print Beautiful Status Report
    print("\n" + "="*80)
    print("PHASE 2 RESOURCES VERIFICATION REPORT")
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
    print(f"  SAGEMAKER_S3_BUCKET: {sagemaker_s3_bucket}")
    print(f"  MENTOR_API_SECRET:   *** [SET]" if mentor_api_secret else "  MENTOR_API_SECRET:   None")
    print(f"  NVIDIA_API_KEY:      *** [SET]" if nvidia_api_key else "  NVIDIA_API_KEY:      None")
    print("="*80 + "\n")

    # 8. Optional Live Integration Test
    if args.live_test:
        if not all_ok:
            logger.warning("Verification failed. Live test might fail or cannot run due to missing prerequisites.")
        live_ok = run_live_test(nvidia_api_key, sagemaker_s3_bucket, aws_region)
        if live_ok:
            logger.info("🟢 LIVE INTEGRATION TEST PASSED SUCCESSFULLY!")
        else:
            logger.error("🔴 LIVE INTEGRATION TEST FAILED!")
            sys.exit(1)

    if not all_ok:
        sys.exit(1)


if __name__ == "__main__":
    main()

"""
generate_data.py — Synthetic training data generation for Shri mentor fine-tuning.

Uses the NVIDIA Nemotron-4 API to produce Q&A pairs from each syllabus chunk,
then uploads the JSONL dataset to S3 for SageMaker training.

Usage:
    python shri-academy-api/sagemaker/generate_data.py \
        --bucket my-bucket \
        --prefix mentor-training/data \
        --pairs-per-chunk 8 \
        --region us-east-1

Env vars required:
    NVIDIA_API_KEY
    AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY  (or instance role)
"""

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path

import boto3
from openai import OpenAI

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ── Shared syllabus chunks (single source of truth) ──────────────────────────
sys.path.insert(0, str(Path(__file__).parent.parent))
from syllabus import SYLLABUS_CHUNKS  # type: ignore

# ── NVIDIA API client ─────────────────────────────────────────────────────────
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
NVIDIA_MODEL = "nvidia/llama-3.1-nemotron-51b-instruct"

SYSTEM_PROMPT = (
    "You are Shri, a knowledgeable AI mentor for Shri Academy. "
    "You teach students across all academic subjects using Socratic questioning "
    "and supportive guidance. You are patient, precise, and pedagogically rigorous."
)

GENERATOR_PROMPT = """\
You are building a fine-tuning dataset for an educational AI mentor.

Given the following academic content, generate {n} high-quality question-answer pairs.
Each pair must:
- Cover a different aspect of the content
- Use a mix of styles: direct questions, 'explain why', 'compare', 'what would happen if', and Socratic follow-ups
- Have a mentor-style answer: accurate, clear, appropriately detailed (3-6 sentences), and pedagogically sound
- NOT just repeat the source text verbatim — rephrase, synthesise, and explain

SOURCE CONTENT:
{chunk}

Return ONLY a JSON array with exactly {n} objects, each with keys "question" and "answer".
No extra commentary. No markdown fences. Valid JSON only.
"""


def build_client() -> OpenAI:
    api_key = os.environ.get("NVIDIA_API_KEY")
    if not api_key:
        raise EnvironmentError("NVIDIA_API_KEY is not set")
    return OpenAI(base_url=NVIDIA_BASE_URL, api_key=api_key)


def generate_pairs(client: OpenAI, chunk_text: str, n: int, retries: int = 3) -> list[dict]:
    prompt = GENERATOR_PROMPT.format(chunk=chunk_text, n=n)
    for attempt in range(1, retries + 1):
        try:
            resp = client.chat.completions.create(
                model=NVIDIA_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.8,
                max_tokens=2048,
            )
            raw = resp.choices[0].message.content.strip()
            # Strip markdown fences if present
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            pairs = json.loads(raw)
            if not isinstance(pairs, list):
                raise ValueError("Expected JSON array")
            valid = [p for p in pairs if isinstance(p, dict) and "question" in p and "answer" in p]
            if not valid:
                raise ValueError("No valid pairs in response")
            return valid[:n]
        except Exception as e:
            log.warning(f"Attempt {attempt}/{retries} failed: {e}")
            if attempt < retries:
                time.sleep(2 ** attempt)
    log.error(f"All retries exhausted for chunk, returning empty")
    return []


def to_training_record(question: str, answer: str) -> dict:
    """Format as chat JSONL for SFTTrainer."""
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
            {"role": "assistant", "content": answer},
        ]
    }


def upload_to_s3(local_path: str, bucket: str, key: str, region: str) -> str:
    s3 = boto3.client("s3", region_name=region)
    s3.upload_file(local_path, bucket, key)
    s3_uri = f"s3://{bucket}/{key}"
    log.info(f"Uploaded {local_path} → {s3_uri}")
    return s3_uri


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic mentor training data")
    parser.add_argument("--bucket", required=True, help="S3 bucket name")
    parser.add_argument("--prefix", default="mentor-training/data", help="S3 key prefix")
    parser.add_argument("--pairs-per-chunk", type=int, default=8, help="Q&A pairs per syllabus chunk")
    parser.add_argument("--region", default=os.environ.get("AWS_REGION", "us-east-1"))
    parser.add_argument("--output-dir", default="/tmp/mentor-training", help="Local output directory")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    client = build_client()

    all_records: list[dict] = []
    for chunk_id, chunk_text in SYLLABUS_CHUNKS:
        log.info(f"Generating {args.pairs_per_chunk} pairs for chunk '{chunk_id}' ...")
        pairs = generate_pairs(client, chunk_text, args.pairs_per_chunk)
        records = [to_training_record(p["question"], p["answer"]) for p in pairs]
        all_records.extend(records)
        log.info(f"  → {len(records)} records (total so far: {len(all_records)})")
        time.sleep(0.5)  # gentle rate-limit pause

    if not all_records:
        log.error("No training records generated — aborting")
        sys.exit(1)

    # Write JSONL
    local_file = os.path.join(args.output_dir, "train.jsonl")
    with open(local_file, "w", encoding="utf-8") as f:
        for record in all_records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    log.info(f"Wrote {len(all_records)} records to {local_file}")

    # Upload to S3
    s3_key = f"{args.prefix.rstrip('/')}/train.jsonl"
    s3_uri = upload_to_s3(local_file, args.bucket, s3_key, args.region)

    # Write manifest for launch_training.py to consume
    manifest = {
        "s3_uri": s3_uri,
        "record_count": len(all_records),
        "chunks_processed": len(SYLLABUS_CHUNKS),
        "pairs_per_chunk": args.pairs_per_chunk,
    }
    manifest_file = os.path.join(args.output_dir, "manifest.json")
    with open(manifest_file, "w") as f:
        json.dump(manifest, f, indent=2)

    print(json.dumps(manifest))  # stdout for API caller to capture


if __name__ == "__main__":
    main()

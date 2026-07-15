"""
generate_data.py — Synthetic training data generation for Shri mentor fine-tuning.

Uses GPT-4o to produce high-quality Q&A pairs from each syllabus chunk
(teacher-student distillation pattern), then uploads the JSONL dataset to S3
for SageMaker training with Nemotron-Mini-4B.

Usage:
    python shri-academy-api/mentor_sagemaker/generate_data.py \
        --bucket my-bucket \
        --prefix mentor-training/data \
        --pairs-per-chunk 8 \
        --region us-east-1

Env vars required:
    OPENAI_API_KEY2
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

# ── NVIDIA NIM (teacher model for data generation) ───────────────────────────
GENERATOR_MODEL = "nvidia/llama-3.1-nemotron-70b-instruct"

SYSTEM_PROMPT_SHRI = (
    "You are Shri, a knowledgeable AI mentor for Shri Academy. "
    "You teach students across all academic subjects using Socratic questioning "
    "and supportive guidance. You are patient, precise, and pedagogically rigorous."
)

SYSTEM_PROMPT_SARASWATHI = (
    "You are Shri-Ma-Saraswathi, a wise and compassionate AI mentor for Shri Academy. "
    "You guide students using deep psychological, educational, and philosophical insights from "
    "the Bhagavad Gita and modern educational psychology. You are patient, supportive, and "
    "focused on emotional balance, resilience, and self-realization."
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
    api_key = os.environ.get("NVIDIA_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise EnvironmentError("NVIDIA_API_KEY or OPENAI_API_KEY is not set")
    if api_key.startswith("sk-"):
        return OpenAI(
            base_url="https://api.openai.com/v1",
            api_key=api_key
        )
    return OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key
    )


def generate_pairs(client: OpenAI, chunk_text: str, n: int, retries: int = 3) -> list[dict]:
    api_key = os.environ.get("NVIDIA_API_KEY") or os.environ.get("OPENAI_API_KEY") or ""
    model = "gpt-4o" if api_key.startswith("sk-") else GENERATOR_MODEL
    prompt = GENERATOR_PROMPT.format(chunk=chunk_text, n=n)
    for attempt in range(1, retries + 1):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.8,
                max_tokens=2048,
            )
            raw = resp.choices[0].message.content.strip()
            # Robust JSON extraction
            cleaned_raw = raw.strip()
            if "```" in cleaned_raw:
                parts = cleaned_raw.split("```")
                for part in parts:
                    part_stripped = part.strip()
                    if part_stripped.startswith("json"):
                        part_stripped = part_stripped[4:].strip()
                    if part_stripped.startswith("[") or part_stripped.startswith("{"):
                        cleaned_raw = part_stripped
                        break
            # Find actual JSON array boundaries
            start_idx = cleaned_raw.find("[")
            end_idx = cleaned_raw.rfind("]")
            if start_idx != -1 and end_idx != -1:
                cleaned_raw = cleaned_raw[start_idx:end_idx+1]

            pairs = json.loads(cleaned_raw)
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


def to_training_record(question: str, answer: str, system_prompt: str = SYSTEM_PROMPT_SHRI) -> dict:
    """Format as chat JSONL for SFTTrainer."""
    return {
        "messages": [
            {"role": "system", "content": system_prompt},
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
    parser.add_argument("--mentor-type", choices=["shri", "saraswathi", "all"], default="shri", help="Mentor type")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    client = build_client()

    # Filter chunks and select appropriate system prompt depending on mentor type
    selected_chunks = []
    for chunk_id, chunk_text in SYLLABUS_CHUNKS:
        is_saraswathi = chunk_id.startswith("saraswathi_")
        if args.mentor_type == "saraswathi" and is_saraswathi:
            selected_chunks.append((chunk_id, chunk_text))
        elif args.mentor_type == "shri" and not is_saraswathi:
            selected_chunks.append((chunk_id, chunk_text))
        elif args.mentor_type == "all":
            selected_chunks.append((chunk_id, chunk_text))

    log.info(f"Selected {len(selected_chunks)} chunks for mentor type '{args.mentor_type}'")

    all_records: list[dict] = []
    for chunk_id, chunk_text in selected_chunks:
        log.info(f"Generating {args.pairs_per_chunk} pairs for chunk '{chunk_id}' ...")
        pairs = generate_pairs(client, chunk_text, args.pairs_per_chunk)
        
        # Decide prompt for each chunk
        if chunk_id.startswith("saraswathi_"):
            sys_prompt = SYSTEM_PROMPT_SARASWATHI
        else:
            sys_prompt = SYSTEM_PROMPT_SHRI
            
        records = [to_training_record(p["question"], p["answer"], system_prompt=sys_prompt) for p in pairs]
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
        "chunks_processed": len(selected_chunks),
        "pairs_per_chunk": args.pairs_per_chunk,
        "mentor_type": args.mentor_type,
    }
    manifest_file = os.path.join(args.output_dir, "manifest.json")
    with open(manifest_file, "w") as f:
        json.dump(manifest, f, indent=2)

    print(json.dumps(manifest))  # stdout for API caller to capture


if __name__ == "__main__":
    main()

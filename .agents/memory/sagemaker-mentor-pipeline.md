---
name: SageMaker Mentor Pipeline
description: Rules and gotchas for the shri-academy-api SageMaker Nemotron fine-tuning pipeline (generate_data, LoRA train, deploy, eval mode).
---

# SageMaker Mentor Pipeline

## Critical Rules

### Package naming — never name a local package 'sagemaker'
The local training helper package MUST be named `mentor_sagemaker/` (not `sagemaker/`).
If it were named `sagemaker/`, Python would resolve `import sagemaker` inside that very package to itself, breaking `from sagemaker.huggingface import HuggingFace`.

**Why:** Python resolves local packages before installed packages when the project root is on sys.path. The AWS SDK package is also called `sagemaker`, so shadowing it causes silent import failures at runtime.

**How to apply:** Any new helper packages for AWS SDK wrappers must not share a name with the SDK they wrap.

### boto3 — always lazy-import at startup
`main.py` imports boto3 with a try/except at module level:
```python
try:
    import boto3
    _boto3_available = True
except ImportError:
    boto3 = None
    _boto3_available = False
```
The SageMaker eval path is only invoked when `MENTOR_EVAL_MODE=true` AND `SAGEMAKER_ENDPOINT_NAME` is set, so the app runs normally without boto3 installed.

**Why:** boto3 is not available in the dev environment by default; the try/except prevents startup crash when only the mentor chat features are needed.

**How to apply:** Any new route that needs boto3 should also guard with `if not _boto3_available: raise HTTPException(503, ...)`.

### Transformers version — align training requirements with SageMaker DLC
`mentor_sagemaker/training/requirements.txt` pins `transformers>=4.37.0,<4.42.0`.
The deploy container in `deploy_endpoint.py` is pinned to `transformers_version="4.37.0"`.
These must stay in sync — a major version mismatch between training and inference causes model loading failures.

### Eval mode activation sequence
1. `POST /shri-api/sagemaker/generate-data` — generate synthetic JSONL (~200 pairs)
2. `POST /shri-api/sagemaker/train` — submit SageMaker training job (returns job name, async)
3. Poll `GET /shri-api/sagemaker/status` until job status = `Completed`
4. `POST /shri-api/sagemaker/deploy` — deploy model as real-time endpoint
5. Set env vars `SAGEMAKER_ENDPOINT_NAME` and `MENTOR_EVAL_MODE=true`

All four endpoints require header `X-Mentor-Token: <MENTOR_API_SECRET>`.

### Required env vars (not yet set in Replit secrets)
- `SAGEMAKER_ROLE_ARN` — IAM execution role for SageMaker
- `SAGEMAKER_S3_BUCKET` — S3 bucket (or falls back to `SECOPS_S3_BUCKET`)
- `MENTOR_API_SECRET` — auth token for the pipeline routes
- `SAGEMAKER_ENDPOINT_NAME` — populated after first deploy
- `MENTOR_EVAL_MODE` — set to `true` after endpoint is live and validated
- `HF_TOKEN` — optional, needed if model is gated on HuggingFace
- `AWS_REGION` — defaults to `us-east-1`

### SYLLABUS_CHUNKS location
Moved from inline in `main.py` to `shri-academy-api/syllabus.py`.
Both `main.py` and `mentor_sagemaker/generate_data.py` import from it.
`generate_data.py` uses `sys.path.insert(0, ...)` to find it since it runs as a subprocess.

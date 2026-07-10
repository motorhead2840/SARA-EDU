---
name: SecOps Data Collection Server + RageSage
description: Three-tier content scoring (Profanity/Vulgarity/PMI), SecOps DB schema, Cyberdemon event queue, RageSage SageMaker pipeline for PMI classifier training.
---

## Content Index (contentIndex.ts)
Three-tier scoring, all 0–1:
- Profanity: explicit slurs/hate speech — compiled regex list in module
- Vulgarity: crude/degrading — compiled regex list in module
- PMI (Perverted Mentation Index): contextual patterns — grooming, dehumanisation, violent ideation, radicalisation; weighted by category breadth
- Composite = PMI×0.5 + profanity×0.3 + vulgarity×0.2
- Tiers: CLEAN < 0.15, LOW < 0.40, MEDIUM < 0.65, HIGH < 0.85, CRITICAL ≥ 0.85
- Dynamic patterns loaded from `secops_blocked_patterns` table every 10 min via `loadDynamicPatterns()`

## Database tables (secopsDb.ts)
- `secops_raw_content` — every scored item with tier + flags
- `secops_training_labels` — human labels; `exported_to_s3` flag prevents re-export
- `secops_blocked_patterns` — dynamic regex blocklist, reloaded every 10 min
- `secops_cyberdemon_events` — outbox pattern for Cyberdemon dispatch; mark dispatched via flush endpoint

## API routes (routes/secops.ts)
- `POST /api/secops/ingest` — unauthenticated (intentionally public, sits inside the tutoring flow); 5% CLEAN sampling for training diversity
- All other routes require `requireMentor` — identity read from `res.locals.mentor` (NOT req.mentor)
- `POST /api/secops/ragethesage/export` — exports labelled NDJSON to S3, marks `exported_to_s3=TRUE`
- `POST /api/secops/ragethesage/train` — calls `StartPipelineExecution` with pipeline NAME not ARN; ARN→name extraction: `arn.split('/').pop()`

**Why ARN vs name matters:** `StartPipelineExecutionCommand.PipelineName` accepts name only; passing full ARN causes immediate API error. Env var `RAGETHESAGE_PIPELINE_ARN` may be either — always extract name before calling.

## RageSage Terraform (ragethesage.tf)
- ECR repo: `{project}/ragethesage-trainer`
- S3 bucket: `{project}-{env}-secops`
- Feature Group: `secops-content-index`
- Pipeline: `ragethesage` — 5 steps: DataPrep → Training (ml.g4dn.xlarge) → Evaluation (PropertyFile: metrics.json) → QualityGate (JsonGet f1_macro ≥ 0.78) → Register
- Quality gate uses `Std:JsonGet` on `PropertyFiles.EvaluationReport` path `f1_macro` — evaluate.py must write `{"f1_macro": float, ...}` to `/opt/ml/processing/evaluation/metrics.json`
- Model resource `aws_sagemaker_model.ragethesage` required before endpoint config; placeholder model_data_url updated post-approval
- OpenSearch reference: `aws_opensearch_domain.main.arn` (NOT elasticsearch)
- SNS reference: `aws_sns_topic.alerts` (defined in developer_tools.tf)
- Schedule: EventBridge every Sunday 02:00 UTC

## Airflow DAG (ragethesage_export_and_train)
- Sunday 03:00 UTC (1h after EventBridge trigger, so export runs first)
- Label volume check: uses (critical + high) - pending_review as proxy for labelled-exportable rows (≥50 required)
- `start_pipeline_execution` also extracts name from ARN: `RAGETHESAGE_ARN.split('/')[-1]`
- PythonSensor: reschedule mode, 5-min poke, 2-hr timeout

## Required env vars (api-server ECS task)
- `RAGETHESAGE_PIPELINE_ARN` — from `terraform output ragethesage_pipeline_arn`
- `SECOPS_S3_BUCKET` — from `terraform output secops_s3_bucket`
Both also in SSM: `/{project}/{env}/ragethesage/pipeline_arn`, `/{project}/{env}/secops/s3_bucket`

## Cyberdemon integration pattern
Outbox table `secops_cyberdemon_events`. Cyberdemon polls `GET /api/secops/cyberdemon/queue` and calls `POST /api/secops/cyberdemon/flush` with `{eventIds:[...]}` to acknowledge. Events are never deleted — `dispatched` flag provides audit trail.

## First-time setup after terraform apply
1. Build + push `ragethesage-trainer` Docker image to ECR
2. Set `RAGETHESAGE_PIPELINE_ARN` + `SECOPS_S3_BUCKET` on ECS task
3. Collect + label ≥50 items via Mentor Portal SecOps tab
4. Export then trigger: `/api/secops/ragethesage/export` then `/api/secops/ragethesage/train`
5. Approve model in SageMaker Console → Model Registry → ragethesage → set Approved

## NVIDIA Confidential Computing — planned L1 security layer
- Source: nvidia.com/en-us/data-center/solutions/confidential-computing/
- Target workload: RageSage SageMaker training job
- H100 instance for CC-ON: `p5.48xlarge` (H100 SXM5) — do NOT use p4d (A100)
- CC-ON encrypts all HBM memory; NVLink/PCIe data path encrypted in transit
- Remote attestation via RIM-bundle + OCSP — verifiable by Shri Academy as data owner
- Operator-blind: AWS SageMaker control plane cannot access training computation
- Checklist for integration is in SECURITY_INFRA tab of Mentor Portal (mentor dashboard)
- F1 quality gate threshold = 0.78 (consistent across Terraform, Airflow DAG, and mentor dashboard)

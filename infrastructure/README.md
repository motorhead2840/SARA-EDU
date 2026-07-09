# SRI Platform — AWS Infrastructure

All resources are managed by Terraform and live in `us-east-1`.

## Architecture

```
                        Internet
                            │
                            ▼
                 AWS Global Accelerator (2 anycast IPs)
                            │
                            ▼
                  Route 53 (sriplatform.com)
                            │
                            ▼
              ACM (wildcard TLS) ─► ALB (public)
                                        │
                            ┌───────────┴───────────┐
                            ▼                       ▼
                      ECS Fargate             ECS Fargate
                      (api-server)            (shri-academy-api)
                            │                       │
                            └───────────┬───────────┘
                                        │  Private subnets (3 AZs)
          ┌─────────────────────────────┼──────────────────────────────┐
          │                             │                              │
          ▼                             ▼                              ▼
   RDS PostgreSQL 15            MSK Kafka 3.5.1                ElastiCache
   (Multi-AZ + replica)         12 topics, IAM auth             Redis 7 (3-node)
                                         │
               ┌─────────────────────────┤
               │                         │
               ▼                         ▼
         MWAA Airflow 2.8.1        stream_cleaner (15 min)
         ┌────────────────────┐    scholarship_metrics (hourly)
         │ ml_enrichment DAG  │    sagemaker_training_trigger (weekly)
         │ (30 min)           │
         └────────────────────┘
               │
     ┌─────────┴────────────────┐
     ▼                          ▼
OpenSearch 2.11           S3 Data Lake (6 buckets)
ISM: hot→warm→delete      assets / chromadb / airflow /
Alerting → SNS            kafka-logs / sagemaker / data-lake
     │
     ▼
SageMaker Platform
  ├── Feature Store (student-engagement, mentor-activity, blockchain-events)
  ├── TF Pipeline (shri_tutor_tf): data→train→eval→register
  ├── SageMaker Studio (Jupyter, GPU kernel: g4dn.xlarge)
  ├── Model Monitor (drift detection)
  ├── Clarify (bias/explainability)
  ├── Ground Truth (labelling)
  └── Edge Manager (offline edge device fleet)

ML Services (managed, no infra)
  ├── Amazon Bedrock    — Claude 3 / Titan / Llama3 for AI tutor
  ├── Amazon Comprehend — sentiment + key phrases on chat messages
  ├── Amazon Transcribe — voice tutoring (speech-to-text)
  ├── Amazon Polly      — TTS responses (neural, Joanna voice)
  ├── Amazon Rekognition — visual content moderation
  ├── Amazon Textract   — student PDF extraction
  ├── Amazon Lex v2     — intake bot (shri-intake)
  ├── Amazon Kendra     — intelligent course material search
  └── Amazon Translate  — multi-language student support

Deep Learning Compute
  ├── GPU Training ASG  — p3.2xlarge (Tesla V100), DL AMI (TF)
  ├── GPU Inference LT  — g4dn.xlarge (T4), DL AMI (PyTorch)
  ├── Spot Fleet        — p3/g5 mix for cost-optimised training
  ├── AWS Batch (GPU)   — managed TF training jobs
  ├── Graviton3 ASG     — m7g.xlarge ARM workers (~40% cheaper)
  └── EFS (training data shared filesystem across GPU nodes)

Developer Tools
  ├── CodeArtifact      — private npm + PyPI registries
  ├── AWS X-Ray         — distributed tracing (ECS services)
  ├── CloudWatch Dashboards (ops / ml / blockchain)
  ├── CloudWatch Alarms — 5xx rate, RDS CPU, Kafka consumer lag
  ├── CodeGuru Reviewer — automated PR code analysis
  ├── Cloud9            — browser IDE (SSM Session Manager)
  └── Image Builder     — weekly custom AMI pipeline (AL2023)

AWS Managed Blockchain
  ├── Ethereum mainnet  — AMB accessor token + AMB Query API
  ├── SARA event indexer Lambda (every 5 min → Kafka + OpenSearch)
  └── Hyperledger Fabric — SARA governance + scholarship audit trail

Ground Station (Satellite)
  ├── Mission profile   — X-band downlink (8160 MHz, 30 MHz BW)
  ├── Kinesis stream    — satellite data ingestion buffer
  └── Bridge Lambda     — Kinesis → Kafka + S3 data lake

AWS Outposts (on-premises extension — activated after hardware delivery)
  ├── Outpost subnet    — extends VPC to on-premises rack
  ├── RDS on Outpost    — local low-latency database
  └── ECS on Outpost    — local container workloads

AWS Transit Gateway     — multi-VPC backbone (future multi-region)

GitHub Actions (OIDC — no long-lived keys)
   motorhead2840/Cyberdemon → ECR → ECS api-server
   motorhead2840/OpenTag    → ECR → ECS shri-api

AWS CodePipeline (console-triggered alternative CI)
   same repos via CodeStar GitHub Connection
```

## Quick Start

### 1. Bootstrap remote state (once)

```bash
bash infrastructure/scripts/bootstrap.sh
```

### 2. Initialise and apply Terraform

```bash
cd infrastructure/terraform
terraform init
terraform plan -out=plan.tfplan
terraform apply plan.tfplan
```

> ⚠️ First apply takes ~40 min (MSK + OpenSearch + MWAA are slow to provision).

### 3. Activate the GitHub CodeStar connection

After `terraform apply`, open:
**AWS Console → Developer Tools → Connections**
and click **Update pending connection** to complete the GitHub OAuth handshake.

### 4. Wire GitHub Actions secrets

Add to **both** `motorhead2840/Cyberdemon` and `motorhead2840/OpenTag` under
**Settings → Secrets → Actions**:

| Secret | Value |
|--------|-------|
| `AWS_DEPLOY_ROLE_ARN` | Output from bootstrap script |

### 5. Upload Airflow DAGs

```bash
AIRFLOW_BUCKET=$(terraform -chdir=infrastructure/terraform output -raw s3_airflow_bucket)

aws s3 sync infrastructure/airflow/dags/ s3://${AIRFLOW_BUCKET}/dags/
aws s3 cp  infrastructure/airflow/requirements.txt s3://${AIRFLOW_BUCKET}/requirements.txt
```

### 6. Provision Kafka topics

Invoke the Lambda once to create all 12 topics:

```bash
aws lambda invoke \
  --function-name sri-kafka-topic-provisioner \
  --payload '{}' \
  /tmp/kafka-topics-response.json

cat /tmp/kafka-topics-response.json
```

### 7. Airflow connections

In the MWAA UI (`airflow.<domain>`), add:

| Conn ID | Type | Host | Schema | Login | Password | Port |
|---------|------|------|--------|-------|----------|------|
| `postgres_replica` | Postgres | RDS replica endpoint | sriplatform | sriplatform | (from Secrets Manager) | 5432 |

## Services & Costs (rough estimates)

### Core Infrastructure

| Service | Config | Est. monthly |
|---------|--------|-------------|
| RDS PostgreSQL 15 | db.t3.medium Multi-AZ + replica | ~$150 |
| ElastiCache Redis 7 | cache.t3.medium × 3 | ~$150 |
| MSK Kafka 3.5.1 | kafka.m5.large × 3 | ~$360 |
| OpenSearch 2.11 | r6g.large × 3 + 3 masters | ~$450 |
| ECS Fargate | 2 services × 2 tasks (min) | ~$60 |
| MWAA Airflow 2.8.1 | mw1.small | ~$320 |
| ALB | — | ~$20 |
| NAT Gateways | × 3 | ~$100 |
| S3 | ~500 GB across 6 buckets | ~$12 |
| Route 53 + ACM | 1 zone + wildcard cert | ~$1 |
| **Core subtotal** | | **~$1,623 / mo** |

### ML & AI Services

| Service | Config | Est. monthly |
|---------|--------|-------------|
| AMB Ethereum | Accessor token (mainnet node) | ~$300 |
| AMB Hyperledger Fabric | Starter edition, 1 member | ~$250 |
| SageMaker Studio | Domain + g4dn.xlarge kernel (per-use) | ~$50–200 |
| SageMaker TF Pipeline | p3.2xlarge training (1× weekly, ~2hr) | ~$35 |
| AWS Batch (GPU Spot) | p3.2xlarge spot (per training run) | ~$20 |
| Amazon Bedrock | Claude 3 Sonnet (per-token) | ~$50–300 |
| Amazon Comprehend | 500K units/mo | ~$50 |
| Amazon Polly | 1M chars/mo (neural) | ~$16 |
| Amazon Kendra | Developer Edition | ~$810 |
| Amazon Lex v2 | 10K text requests/mo | ~$7 |
| Amazon Transcribe | 100 hrs/mo | ~$144 |
| **ML subtotal** | | **~$1,732–2,132 / mo** |

### Extended Services

| Service | Config | Est. monthly |
|---------|--------|-------------|
| Global Accelerator | 2 IP × 1 listener | ~$18 |
| Transit Gateway | 1 attachment | ~$36 |
| EFS (training data) | 100 GB, maxIO | ~$30 |
| AWS Ground Station | Per-contact ($9.50/min) — as needed | variable |
| CodeArtifact | 10 GB storage | ~$1 |
| Cloud9 | t3.medium (auto-stop 30 min) | ~$5 |
| X-Ray | 5M traces/mo | ~$5 |
| **Extended subtotal** | | **~$95 / mo + contacts** |

### Outposts (after hardware delivery — not recurring)
AWS Outposts pricing is capacity-based; contact AWS for a quote. Rack pricing starts at ~$1,500–5,000/mo depending on capacity.

### Grand Total (without Outposts, without Ground Station contacts)
**~$3,450–3,850 / mo**

## Kafka Topics

| Topic | Producers | Consumers | Retention |
|-------|-----------|-----------|-----------|
| `shri.session.events` | api-server | Airflow cleaner | 7 days |
| `shri.chat.messages` | api-server | Airflow cleaner | 7 days |
| `shri.frustration.events` | api-server | Airflow cleaner | 7 days |
| `subscription.created` | api-server | Airflow cleaner | 30 days |
| `subscription.cancelled` | api-server | Airflow cleaner | 30 days |
| `payment.fiat.events` | api-server | Airflow cleaner | 30 days |
| `payment.crypto.events` | api-server | Airflow cleaner | 30 days |
| `mentor.metrics.snapshots` | Airflow DAG | mentor dashboards | 30 days |
| `blockchain.token.events` | api-server | Airflow cleaner | 90 days |
| `data.cleaned` | Airflow cleaner | OpenSearch sink | 7 days |
| `opensearch.ingestion` | Airflow cleaner | OpenSearch | 3 days |
| `sagemaker.features` | Airflow cleaner | SageMaker FS | 7 days |

## Kafka producer integration (api-server)

Events are emitted automatically from `src/lib/kafkaProducer.ts`.
No MSK in dev — the producer gracefully no-ops when `KAFKA_BOOTSTRAP` is unset.

Example usage already wired in subscription and blockchain routes:
```typescript
import { kafka } from '../lib/kafkaProducer.js';

await kafka.subscriptionCreated({ email, tier, source: 'stripe' });
await kafka.paymentCrypto({ email, tx_hash, currency, amount_crypto, tier });
```

## Terraform Files

| File | Services |
|------|----------|
| `providers.tf` | AWS provider, S3 remote state |
| `variables.tf` | All input variables |
| `vpc.tf` | VPC, subnets, NAT, security groups |
| `rds.tf` | PostgreSQL 15 Multi-AZ + replica |
| `elasticache.tf` | Redis 7 cluster |
| `msk.tf` | Kafka 3.5.1 + 12 topic definitions |
| `opensearch.tf` | OpenSearch 2.11 cluster |
| `opensearch_extended.tf` | ISM policies, aliases, UltraWarm |
| `s3.tf` | 6 S3 buckets |
| `ecs.tf` | ECS Fargate cluster + services |
| `mwaa.tf` | Airflow 2.8.1 |
| `sagemaker.tf` | Domain, student-engagement Feature Group |
| `sagemaker_extended.tf` | Studio, TF Pipeline, Ground Truth, Edge Manager |
| `deep_learning.tf` | Deep Learning AMIs, GPU ASG, Spot Fleet, AWS Batch |
| `tensorflow.tf` | SageMaker TF Pipeline, Monitor, Clarify |
| `ml_services.tf` | Bedrock, Comprehend, Transcribe, Polly, Rekognition, Textract, Lex, Kendra, Translate |
| `developer_tools.tf` | CodeArtifact, X-Ray, CloudWatch dashboards/alarms, CodeGuru, Cloud9, SSM |
| `blockchain.tf` | AMB Ethereum accessor token |
| `blockchain_extended.tf` | AMB Query, Hyperledger Fabric, SARA event indexer |
| `ground_station.tf` | Satellite mission profile, Kinesis, bridge Lambda |
| `outposts.tf` | Outpost subnet, RDS on Outpost, ECS capacity (activated post-delivery) |
| `compute.tf` | Image Builder, Graviton3 ARM workers, Global Accelerator, Transit Gateway |
| `route53.tf` | Hosted zone, ACM cert, health checks |
| `iam.tf` | All IAM roles |
| `cicd.tf` | CodePipeline, CodeBuild, CodeStar connection |
| `outputs.tf` | All resource endpoints and ARNs |

## Airflow DAGs

| DAG | Schedule | Purpose |
|-----|----------|---------|
| `stream_cleaner` | every 15 min | Cleans Kafka events → S3 + OpenSearch + SageMaker FS |
| `scholarship_metrics_snapshot` | hourly | KPI snapshot → Kafka + OpenSearch + S3 |
| `ml_enrichment` | every 30 min | Comprehend sentiment + Polly TTS + Translate |
| `sagemaker_training_trigger` | weekly (Monday) | TF model training pipeline + SNS notify |

## Lambda Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `sri-kafka-topic-provisioner` | Manual (once) | Idempotently creates all 12 Kafka topics |
| `sri-opensearch-provisioner` | Manual (once) | Index templates + ISM policies + aliases |
| `sri-sara-event-indexer` | EventBridge (5 min) | Etherscan → Kafka + OpenSearch |
| `sri-satellite-kinesis-bridge` | Kinesis stream | Ground Station frames → Kafka + S3 |

## SecOps Data Collection Server & RageSage

### Architecture

```
User / Chat / API input
        │
        ▼
POST /api/secops/ingest
        │
        ▼
contentIndex.ts ─── Three-tier scoring:
  ├── Profanity Score   (0–1) ── explicit slurs, hate speech
  ├── Vulgarity Score   (0–1) ── crude/degrading language
  └── PMI Score         (0–1) ── Perverted Mentation Index:
                                  grooming, predatory framing,
                                  dehumanisation, violent ideation,
                                  radicalisation signals
        │
        ├── Tier CLEAN / LOW   ── discard (5% sampled for training diversity)
        ├── Tier MEDIUM        ── stored → secops_raw_content
        ├── Tier HIGH          ── stored + Cyberdemon event queued
        └── Tier CRITICAL      ── stored + Cyberdemon event queued + request blocked

secops_raw_content (PostgreSQL)
secops_training_labels (human-reviewed)
secops_blocked_patterns (dynamic regex blocklist, reloaded every 10 min)
secops_cyberdemon_events (dispatch queue for Cyberdemon SecOps)

Mentor Portal
  ├── GET  /api/secops/flagged           ── review queue
  ├── POST /api/secops/label/:id         ── label for RageSage training
  ├── POST /api/secops/pattern           ── add dynamic blocklist pattern
  ├── GET  /api/secops/stats             ── aggregate risk dashboard
  ├── GET  /api/secops/cyberdemon/queue  ── pending Cyberdemon events
  ├── POST /api/secops/cyberdemon/flush  ── mark dispatched
  ├── POST /api/secops/ragethesage/export ── export labels → S3
  └── POST /api/secops/ragethesage/train  ── trigger SageMaker pipeline
```

### RageSage SageMaker Pipeline

| Resource | Detail |
|----------|--------|
| ECR repo | `{project}/ragethesage-trainer` — HuggingFace DistilBERT fine-tuning container |
| S3 bucket | `{project}-{env}-secops` — training data NDJSON + model artefacts |
| Feature Group | `secops-content-index` — scored + labelled content features |
| Pipeline | `ragethesage` — 5-step: DataPrep → Training → Evaluation → QualityGate (F1 ≥ 0.78) → Register |
| Training instance | `ml.g4dn.xlarge` (T4 GPU) |
| Model Package Group | `ragethesage` — versions with `PendingManualApproval` status |
| Inference endpoint | `{project}-ragethesage-{env}` — async inference, 10 concurrent max |
| Schedule | EventBridge every Sunday 02:00 UTC |
| Airflow DAG | `ragethesage_export_and_train` — Sunday 03:00 UTC, gates on ≥50 labelled rows |

### Required environment variables (api-server)

```bash
RAGETHESAGE_PIPELINE_ARN   # from terraform output ragethesage_pipeline_arn
SECOPS_S3_BUCKET           # from terraform output secops_s3_bucket
```

Both are also stored in SSM:
- `/{project}/{env}/ragethesage/pipeline_arn`
- `/{project}/{env}/secops/s3_bucket`

### Cyberdemon integration

`secops_cyberdemon_events` table acts as a durable outbox. Cyberdemon's SecOps pipeline polls `GET /api/secops/cyberdemon/queue` and flushes processed events via `POST /api/secops/cyberdemon/flush`. Events carry severity (`MEDIUM`/`HIGH`/`CRITICAL`), `event_type` (`CRITICAL_PMI` | `HIGH_RISK_CONTENT` | `PATTERN_BREACH`), and the full scoring payload for downstream SIEM ingestion.

### RageSage first-time setup

After `terraform apply`:

1. Build and push the training container:
   ```bash
   # Build from infrastructure/docker/ragethesage/
   docker build -t ragethesage-trainer .
   aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_URI
   docker tag ragethesage-trainer:latest $ECR_URI:latest
   docker push $ECR_URI:latest
   ```

2. Set the env vars on the ECS task definition:
   ```bash
   RAGETHESAGE_PIPELINE_ARN=$(terraform output -raw ragethesage_pipeline_arn)
   SECOPS_S3_BUCKET=$(terraform output -raw secops_s3_bucket)
   ```

3. Collect and label at least 50 content items via the Mentor Portal SecOps tab.

4. Trigger first training run:
   ```bash
   curl -X POST /api/secops/ragethesage/export -H "Authorization: Bearer $MENTOR_TOKEN"
   curl -X POST /api/secops/ragethesage/train  -H "Authorization: Bearer $MENTOR_TOKEN"
   ```

5. Approve the registered model in SageMaker Console → Model Registry → ragethesage → set approval to `Approved`.

## Post-Outpost Delivery Checklist

When AWS delivers and activates the Outpost rack:

1. Get the Outpost ARN from AWS Console → AWS Outposts → Outposts
2. Get the Local Gateway ID (`lgw-*`) and Local Gateway Route Table ID (`lgt-*`)
3. Add to `terraform.tfvars`:
   ```hcl
   outpost_arn                          = "arn:aws:outposts:us-east-1:ACCT:outpost/op-XXXX"
   outpost_local_gateway_id             = "lgw-XXXX"
   outpost_local_gateway_route_table_id = "lgt-XXXX"
   ```
4. Run: `terraform apply -target=aws_subnet.outpost -target=aws_db_instance.outpost`

## AWS Amplify Deployment (Frontend Apps)

Both frontend applications—**Shri Academy** (`artifacts/shri-academy`) and **SRI Platform** (`artifacts/sri-platform`)—are built with Vite and are configured to deploy seamlessly to AWS Amplify.

### 1. Connect the Repository in AWS Amplify
1. Open the **AWS Console** and navigate to the **AWS Amplify** service.
2. Click **Create new app** or **Host web app**.
3. Select **GitHub** as your repository provider, authorize AWS Amplify, and select the `<your-org>/<your-repo>` repository.
4. Select the branch you wish to deploy (e.g., `main`).

### 2. Configure Monorepo Build Settings
Amplify automatically detects the workspace-based monorepo configuration using the root-level `amplify.yml` or the sub-folder specific `amplify.yml` files we've configured. Under the **Build Settings** step in the setup wizard:
1. Enable the **Monorepo** setting checkbox.
2. Specify the path to the app's root directory:
   - For **Shri Academy**: `artifacts/shri-academy`
   - For **SRI Platform**: `artifacts/sri-platform`
3. Amplify will automatically load the build configurations. Note that:
   - It installs `pnpm` globally.
   - It runs `pnpm install --frozen-lockfile` to install all dependencies cleanly.
   - It defaults `PORT` to `8080` and `BASE_PATH` to `/` to satisfy Vite build constraints. It outputs built artifacts to `dist/public` (which resolves to `artifacts/shri-academy/dist/public` or `artifacts/sri-platform/dist/public` relative to the configured app root).

### 3. Configure Environment Variables
If your frontends require customized API endpoints or external integrations:
1. Go to **App Settings** > **Environment variables** in the Amplify Console.
2. Add any build-time or runtime configuration variables (e.g. `PORT`, `BASE_PATH`, or api endpoints).

### 4. Set Up Single Page Application (SPA) Redirects
Since Vite applications use client-side routing, any direct navigation to nested sub-routes (e.g., `/dashboard` or `/pricing`) will result in a 404 error if not handled by the host server.
1. Navigate to **App Settings** > **Rewrites and redirects**.
2. Add the following redirect rule:
   - **Source address**: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
   - **Target address**: `/index.html`
   - **Type**: `200 (Rewrite)`

### 5. Trigger and Verify Deployment
1. Click **Save and deploy**.
2. Once the pipeline completes, open the provided `amplifyapp.com` URL to test your live application.


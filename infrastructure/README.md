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

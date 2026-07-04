# SRI Platform — AWS Infrastructure

All resources are managed by Terraform and live in `us-east-1`.

## Architecture

```
Internet
    │
    ▼
Route 53 (sriplatform.com)
    │
    ▼
ACM (TLS) ─► ALB (public)
                │
        ┌───────┴───────┐
        ▼               ▼
  ECS Fargate       ECS Fargate
  (api-server)      (shri-academy-api)
        │               │
        └───────┬───────┘
                │  Private subnets (3 AZs)
    ┌───────────┼───────────────────────────┐
    │           │                           │
    ▼           ▼                           ▼
  RDS         MSK (Kafka)           ElastiCache
  Postgres    12 topics              Redis 7
  (primary +  IAM auth               (cluster)
   replica)
                │
                ▼
          MWAA (Airflow)
          stream_cleaner DAG (15 min)
          scholarship_metrics DAG (hourly)
                │
        ┌───────┴──────────────┐
        ▼                      ▼
   OpenSearch           S3 Data Lake
   (5 indices)          (Parquet/NDJSON)
        │
        ▼
   SageMaker
   Feature Store
   student-engagement

AWS Managed Blockchain
   Ethereum node (mainnet)
   via AMB accessor token

GitHub Actions (OIDC)
   motorhead2840/Cyberdemon → ECR → ECS api-server
   motorhead2840/OpenTag    → ECR → ECS shri-api

AWS CodePipeline (secondary CI path — console-triggered)
   same repos via CodeStar Connection
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

| Service | Config | Est. monthly |
|---------|--------|-------------|
| RDS PostgreSQL | db.t3.medium Multi-AZ | ~$100 |
| ElastiCache Redis | cache.t3.medium × 3 | ~$150 |
| MSK Kafka | kafka.m5.large × 3 | ~$360 |
| OpenSearch | r6g.large × 3 + 3 masters | ~$450 |
| ECS Fargate | 2 services × 2 tasks | ~$60 |
| MWAA | mw1.small | ~$320 |
| SageMaker | Domain (Studio only) | ~$0 |
| ALB | — | ~$20 |
| NAT Gateways | × 3 | ~$100 |
| AMB Ethereum | Accessor token | ~$300 |
| S3 | ~500 GB | ~$12 |
| Route 53 | 1 zone | ~$1 |
| **Total** | | **~$1,873 / mo** |

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

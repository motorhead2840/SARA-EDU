---
name: AWS Infrastructure
description: Full AWS stack for SRI Platform — Terraform IaC in infrastructure/terraform/, MWAA DAGs, GitHub Actions CI/CD.
---

## Location
All IaC lives in `infrastructure/`:
- `terraform/` — 15 .tf files, one per service
- `airflow/dags/` — stream_cleaner.py (15-min), scholarship_metrics_snapshot.py (hourly)
- `airflow/requirements.txt` — upload to S3 before MWAA starts
- `codebuild/` — buildspec-cyberdemon.yml, buildspec-opentag.yml
- `scripts/bootstrap.sh` — run ONCE before `terraform init`
- `lambda/kafka_topics/handler.py` — topic provisioner (invoke once post-apply)
- `README.md` — full runbook with costs (~$1,873/mo), step-by-step

## Services (all us-east-1)
- VPC: 3 AZs, public/private/database subnets, NAT gateways, S3+ECR VPC endpoints
- RDS PostgreSQL 15 Multi-AZ (db.t3.medium) + read replica for analytics
- ElastiCache Redis 7 (cache.t3.medium, 3-node cluster)
- MSK Kafka 3.5.1 (kafka.m5.large × 3), IAM auth, TLS, 12 topics defined
- OpenSearch 2.11 (r6g.large × 3 + 3 dedicated masters), Fine-Grained Access Control
- ECS Fargate cluster (api-server + shri-api services, auto-scaling 2-10 tasks)
- ALB → Route 53 (sriplatform.com) + ACM wildcard cert
- MWAA 2.8.1 (mw1.small, 2 schedulers, 1-10 workers)
- SageMaker domain + student-engagement FeatureGroup + model package group
- AWS Managed Blockchain: Ethereum accessor token (AMB mainnet node)
- S3 buckets: assets, chromadb-vectors, airflow, kafka-logs, sagemaker, data-lake
- ECR repos: sri/api-server, sri/shri-academy-api
- CodeStar Connection (GitHub OAuth — must complete in Console post-apply)
- CodePipeline × 2: motorhead2840/Cyberdemon → api-server, motorhead2840/OpenTag → shri-api
- GitHub Actions OIDC deploy role (motorhead2840/*)

## Bootstrap sequence (run once)
1. `bash infrastructure/scripts/bootstrap.sh` — creates S3 state bucket, DynamoDB lock, OIDC provider, deploy role
2. `cd infrastructure/terraform && terraform init && terraform plan && terraform apply`
3. Console → Developer Tools → Connections → complete GitHub OAuth
4. Upload Airflow DAGs + requirements.txt to S3 airflow bucket
5. Invoke lambda `sri-kafka-topic-provisioner` to create 12 Kafka topics

## Kafka topics (12 total)
session/chat/frustration events, subscription.created/cancelled, payment.fiat/crypto, mentor.metrics.snapshots, blockchain.token.events, data.cleaned, opensearch.ingestion, sagemaker.features

## Kafka producer (api-server)
`src/lib/kafkaProducer.ts` — singleton, lazy connect, graceful no-op when KAFKA_BOOTSTRAP unset (dev safe).
`kafka.*` helpers: subscriptionCreated, subscriptionCancelled, paymentFiat, paymentCrypto, blockchainTokenEvent, mentorMetricsRead.
Already wired into subscription.ts (fiat checkout + crypto confirm) and mentor.ts (metrics read).

**Why:** Events are fire-and-forget (void) — Kafka failures never block HTTP responses.

## GitHub Actions
`.github/workflows/deploy-cyberdemon.yml` and `deploy-opentag.yml` — OIDC auth, ECR push, ECS rolling deploy with health check. Secret needed in both repos: `AWS_DEPLOY_ROLE_ARN`.

## MWAA Airflow connections to set (in UI post-deploy)
- `postgres_replica` — points to RDS replica endpoint

## Terraform backend
S3 bucket: `sri-platform-tfstate`, DynamoDB: `sri-platform-tflock`, region: us-east-1

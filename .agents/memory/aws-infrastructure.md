---
name: AWS Infrastructure
description: Full AWS stack for SRI Platform — Terraform IaC in infrastructure/terraform/, MWAA DAGs, GitHub Actions CI/CD, ML services, Deep Learning, Ground Station, Outposts.
---

## Terraform file inventory (infrastructure/terraform/)
26 .tf files, one concern per file. Key additions beyond original 15:
- `deep_learning.tf` — DL AMIs (SSM lookup), GPU training/inference launch templates, Spot Fleet, AWS Batch, EFS
- `tensorflow.tf` — SageMaker TF Pipeline (5-step: feature-eng→train→eval→condition→register), Monitor, Clarify
- `ml_services.tf` — Bedrock (IAM only), Comprehend, Transcribe, Polly, Rekognition, Textract, Lex v2, Kendra, Translate
- `developer_tools.tf` — CodeArtifact (npm+pypi+internal), X-Ray groups/sampling, CloudWatch dashboards (ops/ml/blockchain), alarms, CodeGuru, Cloud9, SSM params
- `blockchain_extended.tf` — AMB Query IAM, Hyperledger Fabric network, SARA event indexer Lambda (dedicated IAM role)
- `ground_station.tf` — Mission profile, X-band antenna configs, Kinesis stream, bridge Lambda (dedicated IAM role)
- `outposts.tf` — Conditional on `var.outpost_arn`; needs both `outpost_local_gateway_id` (lgw-*) AND `outpost_local_gateway_route_table_id` (lgt-*) — these are different IDs
- `compute.tf` — Image Builder (AL2023 parent image wildcard ARN is correct for Image Builder), ARM64 ASG uses `al2023-ami-kernel-default-arm64` SSM param (NOT the x86 DL AMI), Global Accelerator, Transit Gateway
- `opensearch_extended.tf` — ISM policies via Lambda provisioner, index aliases, domain policy
- `sagemaker_extended.tf` — Studio, TF App Image Config, Ground Truth, extra Feature Groups (mentor-activity, blockchain-events), Edge Manager device fleet

## Lambda functions (infrastructure/lambda/)
- `kafka_topics/handler.py` — Kafka topic provisioner (invoke once post-MSK)
- `opensearch_provision/handler.py` — index templates + ISM + aliases (HEAD returns empty body — handled)
- `sara_event_indexer/handler.py` — polls Etherscan, publishes to Kafka key=`tx_hash` (not `hash`), OpenSearch _id=`tx_hash`
- `satellite_bridge/handler.py` — Kinesis→Kafka bridge, base64 decode error handled before `raw_bytes` reference

## IAM role naming conventions
Each new Lambda has its own dedicated role (not shared with lambda_kafka):
- `lambda_sara_indexer` — SSM, Secrets Manager, Kafka, OpenSearch, CloudWatch Logs
- `lambda_satellite_bridge` — Kinesis read, Kafka write, S3 put (satellite/*), SSM, CloudWatch Logs
- `lambda_opensearch` — VPC, OpenSearch ESHttp*, CloudWatch Logs

## Airflow DAGs (4 total)
- `stream_cleaner` — 15 min (existing)
- `scholarship_metrics_snapshot` — hourly (existing)
- `ml_enrichment` — 30 min: Comprehend sentiment+keyphrases, Translate, Polly TTS, OpenSearch index
- `sagemaker_training_trigger` — weekly Monday: checks data sufficiency (≥10 files), submits SageMaker Pipeline, PythonSensor monitors, SNS notify on done

## Bootstrap sequence
1. `bash infrastructure/scripts/bootstrap.sh` (once)
2. `cd infrastructure/terraform && terraform init && terraform apply`
3. Console → Developer Tools → Connections → complete GitHub OAuth (CodeStar)
4. Upload Airflow DAGs + requirements.txt to S3 MWAA bucket
5. Invoke `sri-kafka-topic-provisioner` Lambda once
6. Invoke `sri-opensearch-provisioner` Lambda once  ← new step
7. Add `AWS_DEPLOY_ROLE_ARN` to GitHub secrets on both repos

## Cost estimate (approximate)
~$3,450–3,850/mo (without Outposts rack fee, without Ground Station contacts)
Key additions: Kendra DEVELOPER_EDITION ~$810/mo, Bedrock ~$50–300/mo usage-based, Fabric ~$250/mo

## Outposts — two separate variables required
`outpost_local_gateway_id` = `lgw-*` (used as `gateway_id` on route)
`outpost_local_gateway_route_table_id` = `lgt-*` (used for VPC association)
These are different and commonly confused.

**Why:** AWS Terraform provider rejects LGW IDs in `local_gateway_route_table_id`; must be the route table ID.

## Kafka producer wiring (api-server)
- `lib/kafkaProducer.ts` — singleton, lazy connect, graceful no-op when `KAFKA_BOOTSTRAP` unset
- Wired into `routes/subscription.ts` (fiat checkout + crypto confirm) and `routes/mentor.ts` (metrics read)
- All emits are fire-and-forget (`void kafka.*()`) — never blocks HTTP response

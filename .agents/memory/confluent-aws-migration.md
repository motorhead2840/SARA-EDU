---
name: Confluent Cloud + Research Navigator AWS Migration
description: MSK→Confluent migration details, Bedrock integration, academic OpenSearch setup, and Confluent auth pattern across all layers.
---

# MSK → Confluent Cloud Migration + Research Navigator AWS

## The Rule
Confluent Cloud replaced AWS MSK entirely. Auth is SASL/PLAIN, not MSK IAM.
No `kafka-cluster:*` IAM actions are ever needed. Credentials come from Secrets Manager.

**Why:** Platform migrated to avoid MSK VPC peering complexity and to gain Confluent's managed topic control plane and Schema Registry.

**How to apply:** Any new Kafka producer/consumer — whether Node, Python (Lambda, Airflow), or ECS container — uses SASL_SSL + PLAIN with credentials from Secrets Manager (`${project}/${env}/confluent/app-key`, `/airflow-key`, `/lambda-key`). Never use `kafka-cluster:*` IAM statements.

## Credential Flow

```
Confluent Cloud API Key → AWS Secrets Manager (JSON: {api_key, api_secret, bootstrap})
                        → ECS secrets injection (individual fields via :key:: syntax)
                        → Node: KAFKA_BOOTSTRAP, KAFKA_API_KEY, KAFKA_API_SECRET env vars
                        → Python: boto3 sm.get_secret_value() at runtime via kafka_utils.py
```

## Key Files

- `infrastructure/terraform/confluent.tf` — full cluster + 17 topics (12 original + 5 academic)
- `infrastructure/terraform/academic.tf` — academic S3 bucket, OpenSearch SSM index configs, Bedrock IAM, CloudWatch alarms
- `infrastructure/airflow/dags/kafka_utils.py` — shared Confluent producer/consumer factory for all Airflow DAGs
- `artifacts/api-server/src/lib/kafkaProducerClient.ts` — KafkaJS SASL/PLAIN client
- `artifacts/api-server/src/lib/kafkaProducer.ts` — typed event helpers (platform + academic.*)
- `artifacts/api-server/src/lib/opensearchClient.ts` — OpenSearch client with AWS SigV4 via fromNodeProviderChain()

## Confluent Kafka Topic Names (17 total)

Original (12): shri.session.events, shri.chat.messages, shri.frustration.events, subscription.created, subscription.cancelled, payment.fiat.events, payment.crypto.events, mentor.metrics.snapshots, blockchain.token.events, data.cleaned, opensearch.ingestion, sagemaker.features

New academic (5): academic.course.viewed, academic.search.query, academic.plan.generated, academic.profile.saved, academic.opensearch.sync

## Bedrock Integration

- ECS shri-api task: BEDROCK_ENABLED=true, BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
- Python research.py: Bedrock primary → OpenAI fallback → 503 if neither
- IAM: ecs_task_bedrock inline policy in academic.tf (arn:aws:bedrock:region::foundation-model/*)

## OpenSearch Academic Indices

- Courses: `academic-courses-v1`
- Topics: `academic-research-topics-v1`
- Airflow DAG `academic_opensearch_indexer` runs daily at 02:00 UTC
- Index mappings stored in SSM: `/${project}/${env}/opensearch/mappings/academic-*`

## Common Gotchas

- `confluent_kafka_topic` needs `credentials` block referencing the app API key + REST endpoint
- Confluent bootstrap endpoint format: `pkc-*.confluent.cloud:9092` (no `SASL_SSL://` prefix needed for KafkaJS; strip it for confluent-kafka Python)
- OpenSearch SigV4 in Lambda: use `botocore.auth.SigV4Auth` + `botocore.awsrequest.AWSRequest` with `urllib.request` — NOT plain urllib without signing
- Airflow DAGs must use `producer.produce()` + `producer.flush()` (confluent-kafka API), NOT `producer.send()` + `producer.close()` (kafka-python API)
- kafka_topics Lambda provisioner: DEPRECATED — kept as placeholder with 410 response

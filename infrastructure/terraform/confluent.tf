# ─── Confluent Cloud (replaces AWS MSK) ──────────────────────────────────────
#
# Provider: confluentinc/confluent ~> 1.83
# Cluster:  DEDICATED 2-CKU, AWS us-east-1, MULTI_ZONE
# Auth:     Confluent Cloud API keys stored in AWS Secrets Manager
# Topics:   All 12 original platform topics + 5 new Research Navigator topics
#           managed directly in Terraform — no Lambda provisioner needed.
#
# Bootstrap endpoint stored in SSM:
#   /${var.project}/${var.environment}/confluent/bootstrap
#
# Confluent API key+secret for app tier stored in Secrets Manager:
#   ${var.project}/${var.environment}/confluent/app-key
#   (JSON: { api_key, api_secret, bootstrap })

# ── Environment & Cluster ─────────────────────────────────────────────────────

resource "confluent_environment" "main" {
  display_name = "${var.project}-${var.environment}"

  lifecycle {
    prevent_destroy = true
  }
}

resource "confluent_kafka_cluster" "main" {
  display_name = "${var.project}-${var.environment}-kafka"
  availability = "MULTI_ZONE"
  cloud        = "AWS"
  region       = var.aws_region

  dedicated {
    cku = var.confluent_cluster_ckus
  }

  environment {
    id = confluent_environment.main.id
  }

  lifecycle {
    prevent_destroy = true
  }
}

# ── Service Accounts ──────────────────────────────────────────────────────────

resource "confluent_service_account" "app" {
  display_name = "${var.project}-${var.environment}-app"
  description  = "API server + Python Shri API service account"
}

resource "confluent_service_account" "airflow" {
  display_name = "${var.project}-${var.environment}-airflow"
  description  = "MWAA Airflow DAG service account"
}

resource "confluent_service_account" "lambda" {
  display_name = "${var.project}-${var.environment}-lambda"
  description  = "Lambda functions (sara-indexer, satellite-bridge) service account"
}

# ── Role Bindings (CloudClusterAdmin gives produce + consume on all topics) ──

resource "confluent_role_binding" "app_admin" {
  principal   = "User:${confluent_service_account.app.id}"
  role_name   = "CloudClusterAdmin"
  crn_pattern = confluent_kafka_cluster.main.rbac_crn
}

resource "confluent_role_binding" "airflow_admin" {
  principal   = "User:${confluent_service_account.airflow.id}"
  role_name   = "CloudClusterAdmin"
  crn_pattern = confluent_kafka_cluster.main.rbac_crn
}

resource "confluent_role_binding" "lambda_admin" {
  principal   = "User:${confluent_service_account.lambda.id}"
  role_name   = "CloudClusterAdmin"
  crn_pattern = confluent_kafka_cluster.main.rbac_crn
}

# ── API Keys ──────────────────────────────────────────────────────────────────

resource "confluent_api_key" "app" {
  display_name = "${var.project}-${var.environment}-app"
  description  = "API key for api-server + Python Shri API"

  owner {
    id          = confluent_service_account.app.id
    api_version = confluent_service_account.app.api_version
    kind        = confluent_service_account.app.kind
  }

  managed_resource {
    id          = confluent_kafka_cluster.main.id
    api_version = confluent_kafka_cluster.main.api_version
    kind        = confluent_kafka_cluster.main.kind
    environment { id = confluent_environment.main.id }
  }

  depends_on = [confluent_role_binding.app_admin]
}

resource "confluent_api_key" "airflow" {
  display_name = "${var.project}-${var.environment}-airflow"
  description  = "API key for MWAA DAGs"

  owner {
    id          = confluent_service_account.airflow.id
    api_version = confluent_service_account.airflow.api_version
    kind        = confluent_service_account.airflow.kind
  }

  managed_resource {
    id          = confluent_kafka_cluster.main.id
    api_version = confluent_kafka_cluster.main.api_version
    kind        = confluent_kafka_cluster.main.kind
    environment { id = confluent_environment.main.id }
  }

  depends_on = [confluent_role_binding.airflow_admin]
}

resource "confluent_api_key" "lambda_functions" {
  display_name = "${var.project}-${var.environment}-lambda"
  description  = "API key for Lambda functions"

  owner {
    id          = confluent_service_account.lambda.id
    api_version = confluent_service_account.lambda.api_version
    kind        = confluent_service_account.lambda.kind
  }

  managed_resource {
    id          = confluent_kafka_cluster.main.id
    api_version = confluent_kafka_cluster.main.api_version
    kind        = confluent_kafka_cluster.main.kind
    environment { id = confluent_environment.main.id }
  }

  depends_on = [confluent_role_binding.lambda_admin]
}

# ── Credentials in AWS Secrets Manager ───────────────────────────────────────

resource "aws_secretsmanager_secret" "confluent_app" {
  name                    = "${var.project}/${var.environment}/confluent/app-key"
  description             = "Confluent Cloud API key for app tier (api-server + shri-api)"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "confluent_app" {
  secret_id = aws_secretsmanager_secret.confluent_app.id
  secret_string = jsonencode({
    api_key    = confluent_api_key.app.id
    api_secret = confluent_api_key.app.secret
    bootstrap  = confluent_kafka_cluster.main.bootstrap_endpoint
  })
}

resource "aws_secretsmanager_secret" "confluent_airflow" {
  name                    = "${var.project}/${var.environment}/confluent/airflow-key"
  description             = "Confluent Cloud API key for MWAA"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "confluent_airflow" {
  secret_id = aws_secretsmanager_secret.confluent_airflow.id
  secret_string = jsonencode({
    api_key    = confluent_api_key.airflow.id
    api_secret = confluent_api_key.airflow.secret
    bootstrap  = confluent_kafka_cluster.main.bootstrap_endpoint
  })
}

resource "aws_secretsmanager_secret" "confluent_lambda" {
  name                    = "${var.project}/${var.environment}/confluent/lambda-key"
  description             = "Confluent Cloud API key for Lambda functions"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "confluent_lambda" {
  secret_id = aws_secretsmanager_secret.confluent_lambda.id
  secret_string = jsonencode({
    api_key    = confluent_api_key.lambda_functions.id
    api_secret = confluent_api_key.lambda_functions.secret
    bootstrap  = confluent_kafka_cluster.main.bootstrap_endpoint
  })
}

# ── SSM Parameter — bootstrap endpoint ───────────────────────────────────────

resource "aws_ssm_parameter" "confluent_bootstrap" {
  name        = "/${var.project}/${var.environment}/confluent/bootstrap"
  type        = "String"
  value       = confluent_kafka_cluster.main.bootstrap_endpoint
  description = "Confluent Cloud Kafka bootstrap endpoint"
}

# ── Kafka Topics ──────────────────────────────────────────────────────────────

locals {
  confluent_topics = [
    # ── Core platform topics (carried over from MSK) ──────────────────────────
    { name = "shri.session.events",      partitions = 6, retention_ms = "604800000"   },
    { name = "shri.chat.messages",       partitions = 6, retention_ms = "604800000"   },
    { name = "shri.frustration.events",  partitions = 3, retention_ms = "604800000"   },
    { name = "subscription.created",     partitions = 3, retention_ms = "2592000000"  },
    { name = "subscription.cancelled",   partitions = 3, retention_ms = "2592000000"  },
    { name = "payment.fiat.events",      partitions = 3, retention_ms = "2592000000"  },
    { name = "payment.crypto.events",    partitions = 3, retention_ms = "2592000000"  },
    { name = "mentor.metrics.snapshots", partitions = 3, retention_ms = "2592000000"  },
    { name = "blockchain.token.events",  partitions = 6, retention_ms = "7776000000"  },
    { name = "data.cleaned",             partitions = 6, retention_ms = "604800000"   },
    { name = "opensearch.ingestion",     partitions = 6, retention_ms = "259200000"   },
    { name = "sagemaker.features",       partitions = 6, retention_ms = "604800000"   },
    # ── Research Navigator topics ──────────────────────────────────────────────
    { name = "academic.course.viewed",   partitions = 6, retention_ms = "604800000"   },
    { name = "academic.search.query",    partitions = 3, retention_ms = "259200000"   },
    { name = "academic.plan.generated",  partitions = 3, retention_ms = "2592000000"  },
    { name = "academic.profile.saved",   partitions = 3, retention_ms = "7776000000"  },
    { name = "academic.opensearch.sync", partitions = 6, retention_ms = "259200000"   },
    # ── Shri Academy student activity topics (new) ────────────────────────────
    { name = "student.game.played",      partitions = 3, retention_ms = "604800000"   },
    { name = "student.forum.posted",     partitions = 3, retention_ms = "2592000000"  },
    { name = "student.mythology.viewed", partitions = 3, retention_ms = "604800000"   },
  ]
}

resource "confluent_kafka_topic" "topics" {
  for_each = { for t in local.confluent_topics : t.name => t }

  topic_name       = each.key
  partitions_count = each.value.partitions

  kafka_cluster {
    id = confluent_kafka_cluster.main.id
  }

  environment {
    id = confluent_environment.main.id
  }

  rest_endpoint = confluent_kafka_cluster.main.rest_endpoint

  config = {
    "retention.ms"        = each.value.retention_ms
    "compression.type"    = "lz4"
    "cleanup.policy"      = "delete"
    "min.insync.replicas" = "2"
    "message.max.bytes"   = "10485760"
  }

  credentials {
    key    = confluent_api_key.app.id
    secret = confluent_api_key.app.secret
  }

  depends_on = [confluent_role_binding.app_admin]
}

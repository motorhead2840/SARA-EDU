# ─── MSK (Managed Streaming for Kafka) ───────────────────────────────────────

resource "aws_msk_configuration" "main" {
  name              = "${var.project}-${var.environment}-kafka-config"
  kafka_versions    = [var.kafka_version]

  server_properties = <<-EOF
    auto.create.topics.enable=false
    default.replication.factor=3
    min.insync.replicas=2
    num.partitions=6
    log.retention.hours=168
    log.retention.bytes=10737418240
    compression.type=lz4
    message.max.bytes=10485760
    replica.fetch.max.bytes=10485760
  EOF
}

resource "aws_msk_cluster" "main" {
  cluster_name           = "${var.project}-${var.environment}-kafka"
  kafka_version          = var.kafka_version
  number_of_broker_nodes = var.kafka_broker_count

  broker_node_group_info {
    instance_type   = var.kafka_broker_instance_type
    client_subnets  = aws_subnet.private[*].id
    security_groups = [aws_security_group.kafka.id]

    storage_info {
      ebs_storage_info {
        volume_size = 500
      }
    }
  }

  configuration_info {
    arn      = aws_msk_configuration.main.arn
    revision = aws_msk_configuration.main.latest_revision
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
    encryption_at_rest_kms_key_arn = aws_kms_key.kafka.arn
  }

  client_authentication {
    sasl {
      iam = true
    }
  }

  open_monitoring {
    prometheus {
      jmx_exporter { enabled_in_broker = true }
      node_exporter { enabled_in_broker = true }
    }
  }

  broker_logs {
    cloudwatch_logs {
      enabled   = true
      log_group = aws_cloudwatch_log_group.kafka.name
    }
    s3 {
      enabled = true
      bucket  = aws_s3_bucket.kafka_logs.id
      prefix  = "kafka-logs/"
    }
  }
}

resource "aws_kms_key" "kafka" {
  description             = "MSK encryption key"
  deletion_window_in_days = 7
}

resource "aws_cloudwatch_log_group" "kafka" {
  name              = "/msk/${var.project}-${var.environment}"
  retention_in_days = 30
}

# ─── Kafka Topics ─────────────────────────────────────────────────────────────
# Topics are created via the MSK topic provisioner Lambda (see cicd.tf)
# Topic definitions are documented here for reference:
#
#  shri.session.events       — AI tutoring session open/close events
#  shri.chat.messages        — Individual chat messages (Circuit A/B)
#  shri.frustration.events   — Frustration level changes
#  subscription.created      — New subscription activations
#  subscription.cancelled    — Cancellations and expirations
#  payment.fiat.events       — Stripe payment events
#  payment.crypto.events     — On-chain payment confirmations
#  mentor.metrics.snapshots  — Hourly scholarship metric snapshots
#  blockchain.token.events   — SARA token transfer/mint events
#  data.cleaned              — Output topic from Airflow cleaning DAG
#  opensearch.ingestion      — Documents ready for indexing
#  sagemaker.features        — Feature vectors for ML training
#
# Partitions: 6 (2 per AZ), Replication: 3, Retention: 7 days

resource "aws_lambda_function" "kafka_topic_provisioner" {
  function_name = "${var.project}-kafka-topic-provisioner"
  role          = aws_iam_role.lambda_kafka.arn
  runtime       = "python3.12"
  handler       = "handler.lambda_handler"
  timeout       = 300

  filename         = "${path.module}/../lambda/kafka_topics.zip"
  source_code_hash = filebase64sha256("${path.module}/../lambda/kafka_topics.zip")

  environment {
    variables = {
      KAFKA_BOOTSTRAP       = aws_msk_cluster.main.bootstrap_brokers_sasl_iam
      TOPICS_JSON           = jsonencode(local.kafka_topics)
    }
  }

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.kafka.id]
  }
}

locals {
  kafka_topics = [
    { name = "shri.session.events",      partitions = 6, retention_ms = 604800000 },
    { name = "shri.chat.messages",       partitions = 6, retention_ms = 604800000 },
    { name = "shri.frustration.events",  partitions = 3, retention_ms = 604800000 },
    { name = "subscription.created",     partitions = 3, retention_ms = 2592000000 },
    { name = "subscription.cancelled",   partitions = 3, retention_ms = 2592000000 },
    { name = "payment.fiat.events",      partitions = 3, retention_ms = 2592000000 },
    { name = "payment.crypto.events",    partitions = 3, retention_ms = 2592000000 },
    { name = "mentor.metrics.snapshots", partitions = 3, retention_ms = 2592000000 },
    { name = "blockchain.token.events",  partitions = 6, retention_ms = 7776000000 },
    { name = "data.cleaned",             partitions = 6, retention_ms = 604800000 },
    { name = "opensearch.ingestion",     partitions = 6, retention_ms = 259200000 },
    { name = "sagemaker.features",       partitions = 6, retention_ms = 604800000 },
  ]
}

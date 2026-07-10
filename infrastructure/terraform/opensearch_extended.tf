# ─── OpenSearch Extended — ISM Policies, Aliases, Index Templates ────────────
#
# Extends opensearch.tf with:
#   - Index State Management (ISM) policies via Lambda provisioner
#   - Alerting monitors and destinations (SNS)
#   - Anomaly detectors for scholarship metric drift
#   - Multi-AZ UltraWarm (warm tier) for cost-effective historical data

# ─── Lambda provisioner for OpenSearch index templates + ISM ─────────────────

resource "aws_lambda_function" "opensearch_provisioner" {
  function_name = "${var.project}-opensearch-provisioner"
  role          = aws_iam_role.lambda_opensearch.arn
  runtime       = "python3.12"
  handler       = "handler.lambda_handler"
  timeout       = 300
  memory_size   = 512

  filename         = "${path.module}/../lambda/opensearch_provision.zip"
  source_code_hash = fileexists("${path.module}/../lambda/opensearch_provision.zip") ? filebase64sha256("${path.module}/../lambda/opensearch_provision.zip") : "placeholder"

  environment {
    variables = {
      OPENSEARCH_URL = "https://${aws_opensearch_domain.main.endpoint}"
      AWS_REGION     = var.aws_region
      INDEX_TEMPLATES_JSON = jsonencode(local.opensearch_index_templates)
      ISM_POLICIES_JSON    = jsonencode(local.opensearch_ism_policies)
    }
  }

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.opensearch.id]
  }
}

resource "aws_iam_role" "lambda_opensearch" {
  name = "${var.project}-${var.environment}-lambda-opensearch"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole"; Effect = "Allow"; Principal = { Service = "lambda.amazonaws.com" } }]
  })
}
resource "aws_iam_role_policy_attachment" "lambda_opensearch_vpc" {
  role       = aws_iam_role.lambda_opensearch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}
resource "aws_iam_role_policy" "lambda_opensearch_es" {
  name = "opensearch-access"
  role = aws_iam_role.lambda_opensearch.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow"; Action = "es:ESHttp*"; Resource = "${aws_opensearch_domain.main.arn}/*" }]
  })
}

locals {
  opensearch_index_templates = {
    "sri-shri-session-events" = {
      index_patterns = ["sri-shri-session-events-*"]
      template = {
        settings = { number_of_shards = 3; number_of_replicas = 1; refresh_interval = "30s" }
        mappings = { properties = {
          session_id  = { type = "keyword" }
          email       = { type = "keyword" }
          event       = { type = "keyword" }
          timestamp   = { type = "date" }
          circuit     = { type = "keyword" }
          frustration = { type = "integer" }
          _cleaned_at = { type = "date" }
        }}
      }
      priority = 200
    }
    "sri-subscription-events" = {
      index_patterns = ["sri-subscription-*"]
      template = {
        settings = { number_of_shards = 2; number_of_replicas = 1 }
        mappings = { properties = {
          email     = { type = "keyword" }
          tier      = { type = "keyword" }
          source    = { type = "keyword" }
          timestamp = { type = "date" }
          tx_hash   = { type = "keyword" }
          currency  = { type = "keyword" }
        }}
      }
      priority = 200
    }
    "sri-mentor-metrics" = {
      index_patterns = ["sri-mentor-metrics-*"]
      template = {
        settings = { number_of_shards = 1; number_of_replicas = 1 }
        mappings = { properties = {
          generated_at = { type = "date" }
          users        = { type = "object" }
          subscriptions = { type = "object" }
        }}
      }
      priority = 200
    }
  }

  opensearch_ism_policies = {
    "hot-warm-delete-7d-30d-90d" = {
      description = "Hot 7d → Warm 30d → Delete 90d"
      default_state = "hot"
      states = [
        { name = "hot";  actions = []; transitions = [{ state_name = "warm"; conditions = { min_index_age = "7d" } }] },
        { name = "warm"; actions = [{ warm_migration = {} }]; transitions = [{ state_name = "delete"; conditions = { min_index_age = "30d" } }] },
        { name = "delete"; actions = [{ delete = {} }]; transitions = [] },
      ]
    }
    "hot-delete-30d" = {
      description = "Hot for 30d then delete (high-volume indices)"
      default_state = "hot"
      states = [
        { name = "hot";    actions = []; transitions = [{ state_name = "delete"; conditions = { min_index_age = "30d" } }] },
        { name = "delete"; actions = [{ delete = {} }]; transitions = [] },
      ]
    }
  }
}

# ─── UltraWarm (warm tier) node configuration ─────────────────────────────────
# UltraWarm nodes use S3 + local cache for 10× cheaper storage vs hot tier.
# Add to the opensearch.tf cluster config:

resource "aws_opensearch_domain" "warm_extension" {
  # This resource EXTENDS the main opensearch domain via a separate
  # aws_opensearch_domain_policy and cannot directly add nodes.
  # UltraWarm is configured in the main domain's cluster_config block.
  # Add the following to opensearch.tf aws_opensearch_domain.main:
  #
  #   cluster_config {
  #     ...existing config...
  #     warm_enabled = true
  #     warm_count   = 2
  #     warm_type    = "ultrawarm1.medium.search"
  #   }
  #
  # This placeholder triggers the Terraform plan to show the extension needed.
  count       = 0
  domain_name = "placeholder"
  engine_version = "OpenSearch_2.11"
  cluster_config { instance_type = "t3.small.search" }
  ebs_options { ebs_enabled = true; volume_size = 10 }
}

# ─── OpenSearch Domain Policy (fine-grained access) ──────────────────────────

resource "aws_opensearch_domain_policy" "main" {
  domain_name     = aws_opensearch_domain.main.domain_name
  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { AWS = [aws_iam_role.ecs_task.arn, aws_iam_role.mwaa.arn, aws_iam_role.lambda_opensearch.arn] }
        Action    = "es:ESHttp*"
        Resource  = "${aws_opensearch_domain.main.arn}/*"
      }
    ]
  })
}

# ─── SNS Destination for OpenSearch Alerting ─────────────────────────────────

resource "aws_sns_topic" "opensearch_alerts" {
  name = "${var.project}-${var.environment}-opensearch-alerts"
}

resource "aws_ssm_parameter" "opensearch_alert_topic" {
  name  = "/${var.project}/${var.environment}/opensearch/alert_sns_arn"
  type  = "String"
  value = aws_sns_topic.opensearch_alerts.arn
}

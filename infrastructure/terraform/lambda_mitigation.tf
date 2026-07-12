# ─── Global Defense Network — Threat Mitigation Lambda IaC ───────────────────
#
# Deploys the Python-based automated threat mitigation Lambda function.
# This Lambda consumes from the "security.detected.threats" Confluent Cloud topic
# and dynamically updates the globally scoped AWS WAFv2 IP Sets.

locals {
  threat_mitigation_function_name = "${var.project}-threat-mitigation"
}

# ── Dynamic Code Packaging ───────────────────────────────────────────────────

data "archive_file" "threat_mitigation" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/threat_mitigation"
  output_path = "${path.module}/../lambda/threat_mitigation.zip"
}

# ── IAM Role and Policies ─────────────────────────────────────────────────────

resource "aws_iam_role" "lambda_mitigation" {
  name = "${var.project}-${var.environment}-lambda-mitigation"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_mitigation_vpc" {
  role       = aws_iam_role.lambda_mitigation.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "lambda_mitigation_permissions" {
  name = "threat-mitigation-permissions"
  role = aws_iam_role.lambda_mitigation.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # AWS WAFv2 Permissions (Scoped to Global/CloudFront and Regional for flexibility)
      {
        Effect = "Allow"
        Action = [
          "wafv2:GetIPSet",
          "wafv2:UpdateIPSet"
        ]
        Resource = [
          aws_wafv2_ip_set.malicious_ips_ipv4.arn,
          aws_wafv2_ip_set.malicious_ips_ipv6.arn
        ]
      },
      # CloudWatch Logs Permission (Scoped following the principle of least privilege)
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.threat_mitigation_function_name}:*"
        ]
      },
      # Secrets Manager & SSM Permissions for Confluent Cloud Credentials
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.confluent_lambda.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter"
        ]
        Resource = [
          aws_ssm_parameter.confluent_bootstrap.arn
        ]
      }
    ]
  })
}

# ── Lambda Function ───────────────────────────────────────────────────────────

resource "aws_lambda_function" "threat_mitigation" {
  function_name = local.threat_mitigation_function_name
  description   = "Consumes detected-threats and updates WAF IP sets in real-time"
  role          = aws_iam_role.lambda_mitigation.arn
  runtime       = "python3.12"
  handler       = "handler.lambda_handler"
  timeout       = 30
  memory_size   = 256

  filename         = data.archive_file.threat_mitigation.output_path
  source_code_hash = data.archive_file.threat_mitigation.output_base64sha256

  depends_on = [aws_cloudwatch_log_group.threat_mitigation]

  environment {
    variables = {
      WAF_IPV4_SET_ID               = aws_wafv2_ip_set.malicious_ips_ipv4.id
      WAF_IPV4_SET_NAME             = aws_wafv2_ip_set.malicious_ips_ipv4.name
      WAF_IPV6_SET_ID               = aws_wafv2_ip_set.malicious_ips_ipv6.id
      WAF_IPV6_SET_NAME             = aws_wafv2_ip_set.malicious_ips_ipv6.name
      WAF_SCOPE                     = "CLOUDFRONT"
      MAX_UPDATE_RETRIES            = var.threat_mitigation_max_retries
      INITIAL_BACKOFF_DELAY_SECONDS = var.threat_mitigation_initial_backoff_delay_seconds
    }
  }

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.kafka.id]
  }
}

# ── CloudWatch Log Group with custom retention ───────────────────────────────

resource "aws_cloudwatch_log_group" "threat_mitigation" {
  name              = "/aws/lambda/${local.threat_mitigation_function_name}"
  retention_in_days = 30
}

# ── Confluent Kafka Trigger Mapping ──────────────────────────────────────────

resource "aws_lambda_event_source_mapping" "threat_mitigation_kafka" {
  function_name     = aws_lambda_function.threat_mitigation.arn
  topics            = ["security.detected.threats"]
  starting_position = "LATEST"
  batch_size        = var.threat_mitigation_batch_size

  self_managed_event_source {
    endpoints = {
      KAFKA_BOOTSTRAP_SERVERS = aws_ssm_parameter.confluent_bootstrap.value
    }
  }

  source_access_configuration {
    type = "BASIC_AUTH"
    uri  = aws_secretsmanager_secret.confluent_lambda.arn
  }
}

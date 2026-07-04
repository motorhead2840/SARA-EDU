# ─── Amazon Managed Blockchain Extended ──────────────────────────────────────
#
# Extends blockchain.tf with:
#   - Hyperledger Fabric private network for SARA token governance + scholarship
#   - Ethereum node monitoring (CloudWatch metrics + alarms)
#   - Lambda: Ethereum → Kafka bridge (index all SARA events automatically)
#   - SARA token event indexer (reads Etherscan, publishes to blockchain.token.events)
#   - AMB Query API — serverless querying of Ethereum mainnet state

# ─── AMB Ethereum — monitoring & querying ─────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "amb_request_errors" {
  alarm_name          = "${var.project}-${var.environment}-amb-errors"
  alarm_description   = "AMB Ethereum accessor errors > 10/min"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 10
  period              = 60
  statistic           = "Sum"
  namespace           = "AWS/ManagedBlockchain"
  metric_name         = "Errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

# IAM: allow ECS tasks to call AMB Query API (serverless Ethereum reads)
resource "aws_iam_role_policy" "ecs_task_amb_query" {
  name = "amb-query-access"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "managedblockchain-query:GetTransaction",
        "managedblockchain-query:ListTransactions",
        "managedblockchain-query:GetAssetContract",
        "managedblockchain-query:GetTokenBalance",
        "managedblockchain-query:ListTokenBalances",
        "managedblockchain-query:ListTransactionEvents",
      ]
      Resource = "*"
    }]
  })
}

# ─── Lambda: SARA token event indexer ────────────────────────────────────────
# Polls Etherscan API for new SARA ERC-20 Transfer events every 5 min,
# publishes each new tx to blockchain.token.events Kafka topic.

resource "aws_iam_role" "lambda_sara_indexer" {
  name = "${var.project}-${var.environment}-lambda-sara-indexer"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole"; Effect = "Allow"; Principal = { Service = "lambda.amazonaws.com" } }]
  })
}
resource "aws_iam_role_policy_attachment" "lambda_sara_vpc" {
  role       = aws_iam_role.lambda_sara_indexer.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}
resource "aws_iam_role_policy" "lambda_sara_permissions" {
  name = "sara-indexer-permissions"
  role = aws_iam_role.lambda_sara_indexer.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Confluent Cloud — SASL/PLAIN auth; no MSK IAM actions needed
      { Effect = "Allow"; Action = ["secretsmanager:GetSecretValue"]; Resource = ["arn:aws:secretsmanager:${var.aws_region}:*:secret:${var.project}/${var.environment}/*"] },
      { Effect = "Allow"; Action = ["ssm:GetParameter", "ssm:PutParameter"]; Resource = ["arn:aws:ssm:${var.aws_region}:*:parameter/${var.project}/${var.environment}/*", "arn:aws:ssm:${var.aws_region}:*:parameter/sri/production/*"] },
      { Effect = "Allow"; Action = ["es:ESHttp*"]; Resource = "${aws_opensearch_domain.main.arn}/*" },
      { Effect = "Allow"; Action = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]; Resource = "arn:aws:logs:*:*:*" },
    ]
  })
}

resource "aws_lambda_function" "sara_event_indexer" {
  function_name = "${var.project}-sara-event-indexer"
  role          = aws_iam_role.lambda_sara_indexer.arn
  runtime       = "python3.12"
  handler       = "handler.lambda_handler"
  timeout       = 120
  memory_size   = 256

  filename         = "${path.module}/../lambda/sara_event_indexer.zip"
  source_code_hash = fileexists("${path.module}/../lambda/sara_event_indexer.zip") ? filebase64sha256("${path.module}/../lambda/sara_event_indexer.zip") : "placeholder"

  environment {
    variables = {
      KAFKA_BOOTSTRAP       = aws_ssm_parameter.confluent_bootstrap.value
      CONFLUENT_SECRET_NAME = aws_secretsmanager_secret.confluent_lambda.name
      KAFKA_TOPIC          = "blockchain.token.events"
      OPENSEARCH_URL       = "https://${aws_opensearch_domain.main.endpoint}"
      SARA_CONTRACT_SECRET = "${var.project}/${var.environment}/sara/contract_address"
      ETHERSCAN_SECRET     = "${var.project}/${var.environment}/etherscan_api_key"
      AWS_REGION           = var.aws_region
    }
  }

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.kafka.id]
  }
}

resource "aws_cloudwatch_event_rule" "sara_indexer_schedule" {
  name                = "${var.project}-sara-event-indexer"
  description         = "Trigger SARA token event indexer every 5 minutes"
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "sara_indexer" {
  rule      = aws_cloudwatch_event_rule.sara_indexer_schedule.name
  target_id = "sara-event-indexer"
  arn       = aws_lambda_function.sara_event_indexer.arn
}

resource "aws_lambda_permission" "sara_indexer_schedule" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sara_event_indexer.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.sara_indexer_schedule.arn
}

# ─── Hyperledger Fabric Network (SARA governance) ─────────────────────────────
# Use a private permissioned Fabric network for:
#   - SARA token governance proposals (off-chain voting on Fabric, on-chain exec)
#   - Scholarship disbursement records (immutable audit trail)
#   - Mentor credential attestations

resource "aws_managed_blockchain_network" "fabric" {
  name      = "${var.project}-${var.environment}-governance"
  framework = "HYPERLEDGER_FABRIC"
  framework_version = "2.2"
  edition   = "STARTER"   # switch to STANDARD for production (multi-member)

  voting_policy {
    approval_threshold_policy {
      threshold_percentage         = 50
      proposal_duration_in_hours   = 24
      threshold_comparator         = "GREATER_THAN"
    }
  }

  member_configuration {
    name        = "${var.project}-founding-member"
    description = "SRI Platform founding governance member"

    framework_configuration {
      fabric {
        admin_username = "Admin"
        admin_password = random_password.db.result
      }
    }

    log_publishing_configuration {
      fabric {
        ca_logs {
          cloudwatch { enabled = true }
        }
        peer_logs {
          cloudwatch { enabled = true }
        }
      }
    }
  }
}

# Store Fabric admin credentials in Secrets Manager
resource "aws_secretsmanager_secret" "fabric_admin" {
  name                    = "${var.project}/${var.environment}/blockchain/fabric_admin"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "fabric_admin" {
  secret_id = aws_secretsmanager_secret.fabric_admin.id
  secret_string = jsonencode({
    network_id  = aws_managed_blockchain_network.fabric.id
    username    = "Admin"
    password    = random_password.db.result
    member_id   = aws_managed_blockchain_network.fabric.member_id
  })
}

# ─── CloudWatch Dashboard: Blockchain ────────────────────────────────────────

resource "aws_cloudwatch_dashboard" "blockchain" {
  dashboard_name = "${var.project}-${var.environment}-blockchain"
  dashboard_body = jsonencode({
    widgets = [
      { type = "metric"; x = 0; y = 0; width = 12; height = 6
        properties = { title = "AMB Ethereum Requests"; period = 60; stat = "Sum"
          metrics = [["AWS/ManagedBlockchain", "Requests"]]
        }
      },
      { type = "metric"; x = 12; y = 0; width = 12; height = 6
        properties = { title = "SARA Event Indexer Invocations"; period = 300; stat = "Sum"
          metrics = [["AWS/Lambda", "Invocations", "FunctionName", aws_lambda_function.sara_event_indexer.function_name]]
        }
      },
      { type = "metric"; x = 0; y = 6; width = 12; height = 6
        properties = { title = "Fabric Network Peers"; period = 3600; stat = "Average"
          metrics = [["AWS/ManagedBlockchain", "NumberOfPeers", "NetworkId", aws_managed_blockchain_network.fabric.id]]
        }
      },
    ]
  })
}

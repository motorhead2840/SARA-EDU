# ─── AWS Developer Tools ──────────────────────────────────────────────────────
#
# Provisions:
#   - CodeArtifact domain + npm and pip repositories
#   - AWS X-Ray tracing (group + sampling rules for ECS services)
#   - CloudWatch dashboards (operational overview, ML metrics, Kafka lag)
#   - CloudWatch Alarms (error rates, latency, resource thresholds)
#   - AWS CodeGuru Reviewer — code quality on pull requests
#   - AWS Cloud9 development environment (IDE in browser)
#   - AWS Systems Manager Session Manager (bastion-free shell access)

# ─── CodeArtifact ─────────────────────────────────────────────────────────────

resource "aws_codeartifact_domain" "main" {
  domain         = "${var.project}-${var.environment}"
  encryption_key = aws_kms_key.kafka.arn
}

resource "aws_codeartifact_repository" "npm" {
  repository = "npm"
  domain     = aws_codeartifact_domain.main.domain
  description = "Private npm registry — proxies npmjs.com upstream"

  external_connections { external_connection_name = "public:npmjs" }
}

resource "aws_codeartifact_repository" "pypi" {
  repository = "pypi"
  domain     = aws_codeartifact_domain.main.domain
  description = "Private PyPI registry — proxies pypi.org upstream"

  external_connections { external_connection_name = "public:pypi" }
}

resource "aws_codeartifact_repository" "internal" {
  repository = "internal"
  domain     = aws_codeartifact_domain.main.domain
  description = "Internal packages published by CI builds"

  upstream {
    repository_name = aws_codeartifact_repository.npm.repository
  }
  upstream {
    repository_name = aws_codeartifact_repository.pypi.repository
  }
}

# Allow ECS tasks and CodeBuild to read from CodeArtifact
resource "aws_iam_role_policy" "ecs_task_codeartifact" {
  name = "codeartifact-access"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow"; Action = ["codeartifact:GetAuthorizationToken", "codeartifact:GetRepositoryEndpoint", "codeartifact:ReadFromRepository"]; Resource = "*" },
      { Effect = "Allow"; Action = "sts:GetServiceBearerToken"; Resource = "*"; Condition = { StringEquals = { "sts:AWSServiceName" = "codeartifact.amazonaws.com" } } },
    ]
  })
}

resource "aws_ssm_parameter" "codeartifact_npm_endpoint" {
  name  = "/${var.project}/${var.environment}/codeartifact/npm_endpoint"
  type  = "String"
  value = aws_codeartifact_repository.internal.repository_endpoint
  depends_on = [aws_codeartifact_repository.internal]
}

# ─── AWS X-Ray ────────────────────────────────────────────────────────────────

resource "aws_xray_group" "main" {
  group_name        = "${var.project}-${var.environment}"
  filter_expression = "service(\"${var.project}-${var.environment}\")"

  insights_configuration {
    insights_enabled      = true
    notifications_enabled = true
  }
}

resource "aws_xray_sampling_rule" "api_server" {
  rule_name      = "${var.project}-api-server"
  priority       = 1000
  reservoir_size = 5
  fixed_rate     = 0.05
  url_path       = "/api/*"
  host           = "*"
  http_method    = "*"
  service_name   = "api-server"
  service_type   = "*"
  resource_arn   = "*"
  version        = 1
}

resource "aws_xray_sampling_rule" "shri_api" {
  rule_name      = "${var.project}-shri-api"
  priority       = 1001
  reservoir_size = 10
  fixed_rate     = 0.20    # higher rate for AI endpoint — richer traces
  url_path       = "/shri-api/*"
  host           = "*"
  http_method    = "POST"
  service_name   = "shri-api"
  service_type   = "*"
  resource_arn   = "*"
  version        = 1
}

resource "aws_iam_role_policy" "ecs_task_xray" {
  name = "xray-access"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow"; Action = ["xray:PutTraceSegments", "xray:PutTelemetryRecords", "xray:GetSamplingRules", "xray:GetSamplingTargets"]; Resource = "*" }]
  })
}

# ─── CloudWatch Dashboards ────────────────────────────────────────────────────

resource "aws_cloudwatch_dashboard" "operations" {
  dashboard_name = "${var.project}-${var.environment}-operations"
  dashboard_body = jsonencode({
    widgets = [
      # ALB Request Count
      { type = "metric"; x = 0; y = 0; width = 8; height = 6
        properties = { title = "ALB Requests / min"; period = 60; stat = "Sum"
          metrics = [["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix]]
        }
      },
      # ALB 5xx Errors
      { type = "metric"; x = 8; y = 0; width = 8; height = 6
        properties = { title = "ALB 5xx Errors"; period = 60; stat = "Sum"
          metrics = [["AWS/ApplicationELB", "HTTPCode_ELB_5XX_Count", "LoadBalancer", aws_lb.main.arn_suffix]]
        }
      },
      # ALB Latency p99
      { type = "metric"; x = 16; y = 0; width = 8; height = 6
        properties = { title = "Latency p99 (ms)"; period = 60; stat = "p99"
          metrics = [["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.main.arn_suffix]]
        }
      },
      # ECS CPU
      { type = "metric"; x = 0; y = 6; width = 12; height = 6
        properties = { title = "ECS CPU Utilization"; period = 60; stat = "Average"
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", "api-server", { label = "api-server" }],
            ["AWS/ECS", "CPUUtilization", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", "shri-api",  { label = "shri-api" }],
          ]
        }
      },
      # RDS Connections
      { type = "metric"; x = 12; y = 6; width = 12; height = 6
        properties = { title = "RDS Database Connections"; period = 60; stat = "Average"
          metrics = [["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", aws_db_instance.main.identifier]]
        }
      },
      # Redis Cache Hits
      { type = "metric"; x = 0; y = 12; width = 12; height = 6
        properties = { title = "Redis Cache Hit Rate"; period = 60; stat = "Average"
          metrics = [
            ["AWS/ElastiCache", "CacheHits",   "ReplicationGroupId", aws_elasticache_replication_group.main.id],
            ["AWS/ElastiCache", "CacheMisses", "ReplicationGroupId", aws_elasticache_replication_group.main.id],
          ]
        }
      },
      # MSK Kafka Bytes In/Out
      { type = "metric"; x = 12; y = 12; width = 12; height = 6
        properties = { title = "Kafka Bytes In+Out"; period = 60; stat = "Sum"
          metrics = [
            ["AWS/Kafka", "BytesInPerSec",  "Cluster Name", "${var.project}-${var.environment}-kafka"],
            ["AWS/Kafka", "BytesOutPerSec", "Cluster Name", "${var.project}-${var.environment}-kafka"],
          ]
        }
      },
    ]
  })
}

resource "aws_cloudwatch_dashboard" "ml" {
  dashboard_name = "${var.project}-${var.environment}-ml"
  dashboard_body = jsonencode({
    widgets = [
      # SageMaker Training Job Status
      { type = "metric"; x = 0; y = 0; width = 12; height = 6
        properties = { title = "SageMaker Training Jobs"; period = 3600; stat = "Sum"
          metrics = [
            ["AWS/SageMaker", "TrainingJobsStarted"],
            ["AWS/SageMaker", "TrainingJobsFailed"],
            ["AWS/SageMaker", "TrainingJobsCompleted"],
          ]
        }
      },
      # Batch GPU Queue
      { type = "metric"; x = 12; y = 0; width = 12; height = 6
        properties = { title = "Batch GPU Job Queue"; period = 60; stat = "Average"
          metrics = [
            ["AWS/Batch", "PendingJobCount", "JobQueueName", aws_batch_job_queue.gpu_training.name],
            ["AWS/Batch", "RunnableJobCount","JobQueueName", aws_batch_job_queue.gpu_training.name],
            ["AWS/Batch", "RunningJobCount", "JobQueueName", aws_batch_job_queue.gpu_training.name],
          ]
        }
      },
      # Comprehend API calls
      { type = "metric"; x = 0; y = 6; width = 12; height = 6
        properties = { title = "ML API Calls (Comprehend + Polly)"; period = 300; stat = "Sum"
          metrics = [
            ["AWS/Comprehend", "RequestCount"],
            ["AWS/Polly", "RequestCharacters"],
          ]
        }
      },
    ]
  })
}

# ─── CloudWatch Alarms ────────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "api_error_rate" {
  alarm_name          = "${var.project}-${var.environment}-api-5xx-high"
  alarm_description   = "API 5xx error rate > 1% over 5 min"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 10
  period              = 300
  statistic           = "Sum"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_ELB_5XX_Count"
  dimensions          = { LoadBalancer = aws_lb.main.arn_suffix }
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${var.project}-${var.environment}-rds-cpu-high"
  alarm_description   = "RDS CPU > 80%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  threshold           = 80
  period              = 300
  statistic           = "Average"
  namespace           = "AWS/RDS"
  metric_name         = "CPUUtilization"
  dimensions          = { DBInstanceIdentifier = aws_db_instance.main.identifier }
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "kafka_consumer_lag" {
  alarm_name          = "${var.project}-${var.environment}-kafka-consumer-lag"
  alarm_description   = "Kafka consumer lag > 10k messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 10000
  period              = 300
  statistic           = "Maximum"
  namespace           = "AWS/Kafka"
  metric_name         = "EstimatedTimeLag"
  dimensions          = { "Cluster Name" = "${var.project}-${var.environment}-kafka" }
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

resource "aws_sns_topic" "alerts" {
  name              = "${var.project}-${var.environment}-alerts"
  kms_master_key_id = "alias/aws/sns"
}

# ─── AWS Cloud9 Development Environment ───────────────────────────────────────

resource "aws_cloud9_environment_ec2" "dev" {
  name          = "${var.project}-${var.environment}-dev"
  description   = "SRI Platform development environment"
  instance_type = "t3.small"
  image_id      = "amazonlinux-2023-x86_64"

  automatic_stop_time_minutes = 30
  subnet_id                   = aws_subnet.private[0].id
  connection_type             = "CONNECT_SSM"   # no SSH key needed — uses SSM
}

# ─── AWS CodeGuru Reviewer ────────────────────────────────────────────────────

resource "aws_codegurureviewer_repository_association" "cyberdemon" {
  repository {
    github_enterprise_server {
      connection_arn = aws_codestarconnections_connection.github.arn
      name           = "Cyberdemon"
      owner          = var.github_org
    }
  }
}

resource "aws_codegurureviewer_repository_association" "opentag" {
  repository {
    github_enterprise_server {
      connection_arn = aws_codestarconnections_connection.github.arn
      name           = "OpenTag"
      owner          = var.github_org
    }
  }
}

# ─── Systems Manager Parameter Store — centralised config ─────────────────────

resource "aws_ssm_parameter" "app_config" {
  for_each = {
    "kafka_bootstrap"   = aws_ssm_parameter.confluent_bootstrap.value
    "redis_endpoint"    = aws_elasticache_replication_group.main.primary_endpoint_address
    "rds_endpoint"      = aws_db_instance.main.endpoint
    "opensearch_domain" = aws_opensearch_domain.main.endpoint
    "ecs_cluster"       = aws_ecs_cluster.main.name
    "aws_region"        = var.aws_region
  }
  name  = "/${var.project}/${var.environment}/config/${each.key}"
  type  = "String"
  value = each.value
}

# ─── OpenSearch ───────────────────────────────────────────────────────────────

resource "aws_opensearch_domain" "main" {
  domain_name    = "${var.project}-${var.environment}"
  engine_version = var.opensearch_version

  cluster_config {
    instance_count           = 3
    instance_type            = var.opensearch_instance_type
    zone_awareness_enabled   = true
    dedicated_master_enabled = true
    dedicated_master_count   = 3
    dedicated_master_type    = "m6g.large.search"

    zone_awareness_config {
      availability_zone_count = 3
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = 100
    throughput  = 250
  }

  vpc_options {
    subnet_ids         = slice(aws_subnet.private[*].id, 0, 3)
    security_group_ids = [aws_security_group.opensearch.id]
  }

  encrypt_at_rest { enabled = true }

  node_to_node_encryption { enabled = true }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  advanced_security_options {
    enabled                        = true
    anonymous_auth_enabled         = false
    internal_user_database_enabled = true

    master_user_options {
      master_user_arn = aws_iam_role.ecs_task.arn
    }
  }

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch_index.arn
    log_type                 = "INDEX_SLOW_LOGS"
  }
  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch_search.arn
    log_type                 = "SEARCH_SLOW_LOGS"
  }
  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch_error.arn
    log_type                 = "ES_APPLICATION_LOGS"
  }
}

resource "aws_cloudwatch_log_group" "opensearch_index"  { name = "/opensearch/${var.project}/index-slow";  retention_in_days = 14 }
resource "aws_cloudwatch_log_group" "opensearch_search" { name = "/opensearch/${var.project}/search-slow"; retention_in_days = 14 }
resource "aws_cloudwatch_log_group" "opensearch_error"  { name = "/opensearch/${var.project}/errors";      retention_in_days = 30 }

# OpenSearch index policy — stored as a JSON resource for Airflow to apply
resource "aws_ssm_parameter" "opensearch_endpoint" {
  name  = "/${var.project}/${var.environment}/opensearch/endpoint"
  type  = "String"
  value = "https://${aws_opensearch_domain.main.endpoint}"
}

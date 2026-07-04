# ─── ElastiCache Redis ────────────────────────────────────────────────────────

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project}-${var.environment}-redis-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_parameter_group" "redis7" {
  name   = "${var.project}-${var.environment}-redis7"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
  parameter {
    name  = "notify-keyspace-events"
    value = "KEA"
  }
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.project}-${var.environment}-redis"
  description          = "SRI Platform session cache and rate limiting"

  node_type            = var.redis_node_type
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.redis7.name
  engine_version       = "7.1"

  num_cache_clusters         = 3
  automatic_failover_enabled = true
  multi_az_enabled           = true

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  snapshot_retention_limit = 5
  snapshot_window          = "03:00-05:00"

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }
}

resource "aws_cloudwatch_log_group" "redis_slow" {
  name              = "/elasticache/${var.project}-${var.environment}/slow-log"
  retention_in_days = 14
}

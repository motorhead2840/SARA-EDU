# ─── RDS PostgreSQL ───────────────────────────────────────────────────────────

resource "random_password" "db" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.project}/${var.environment}/db/password"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db.result
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-${var.environment}-db-subnet"
  subnet_ids = aws_subnet.database[*].id
}

resource "aws_db_parameter_group" "postgres" {
  name   = "${var.project}-${var.environment}-postgres15"
  family = "postgres15"

  parameter {
    name  = "log_connections"
    value = "1"
  }
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }
}

resource "aws_db_instance" "main" {
  identifier        = "${var.project}-${var.environment}-postgres"
  engine            = "postgres"
  engine_version    = "15.6"
  instance_class    = var.db_instance_class
  allocated_storage = 100
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.postgres.name

  multi_az               = true
  publicly_accessible    = false
  deletion_protection    = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "${var.project}-${var.environment}-final"

  backup_retention_period = 14
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  monitoring_interval                   = 60
  monitoring_role_arn                   = aws_iam_role.rds_monitoring.arn

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = { Name = "${var.project}-${var.environment}-postgres" }
}

# Read replica for analytics / SageMaker feature engineering
resource "aws_db_instance" "replica" {
  identifier          = "${var.project}-${var.environment}-postgres-replica"
  replicate_source_db = aws_db_instance.main.identifier
  instance_class      = var.db_instance_class
  storage_encrypted   = true
  publicly_accessible = false

  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.postgres.name

  performance_insights_enabled = true
  tags = { Name = "${var.project}-${var.environment}-postgres-replica" }
}

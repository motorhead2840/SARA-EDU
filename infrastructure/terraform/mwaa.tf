# ─── MWAA (Apache Airflow) ────────────────────────────────────────────────────

resource "aws_mwaa_environment" "main" {
  name              = "${var.project}-${var.environment}-airflow"
  airflow_version   = var.airflow_version
  environment_class = var.airflow_environment_class

  source_bucket_arn    = aws_s3_bucket.airflow.arn
  dag_s3_path          = "dags/"
  requirements_s3_path = "requirements.txt"
  plugins_s3_path      = "plugins.zip"

  execution_role_arn = aws_iam_role.mwaa.arn

  network_configuration {
    security_group_ids = [aws_security_group.mwaa.id]
    subnet_ids         = slice(aws_subnet.private[*].id, 0, 2)
  }

  logging_configuration {
    dag_processing_logs { enabled = true; log_level = "INFO" }
    scheduler_logs      { enabled = true; log_level = "WARNING" }
    task_logs           { enabled = true; log_level = "INFO" }
    webserver_logs      { enabled = true; log_level = "WARNING" }
    worker_logs         { enabled = true; log_level = "INFO" }
  }

  airflow_configuration_options = {
    "core.default_timezone"               = "utc"
    "core.parallelism"                    = "32"
    "core.max_active_runs_per_dag"        = "4"
    "core.load_examples"                  = "false"
    "scheduler.dag_dir_list_interval"     = "30"
    "webserver.expose_config"             = "false"
    "celery.worker_concurrency"           = "16"
    "secrets.backend"                     = "airflow.providers.amazon.aws.secrets.secrets_manager.SecretsManagerBackend"
    "secrets.backend_kwargs"              = jsonencode({ connections_prefix = "airflow/connections", variables_prefix = "airflow/variables", sep = "/" })
    # Confluent Cloud — credentials fetched at task-time from Secrets Manager via kafka_utils.py
    "kafka.bootstrap_servers"             = aws_ssm_parameter.confluent_bootstrap.value
    "kafka.security_protocol"             = "SASL_SSL"
    "kafka.sasl_mechanism"                = "PLAIN"
    "kafka.confluent_secret_name"         = aws_secretsmanager_secret.confluent_airflow.name
    "opensearch.host"                     = aws_opensearch_domain.main.endpoint
    "sagemaker.region"                    = var.aws_region
    "s3.data_lake_bucket"                 = aws_s3_bucket.data_lake.id
  }

  min_workers = 1
  max_workers = 10
  schedulers  = 2

  depends_on = [
    aws_s3_object.airflow_dags_placeholder,
    aws_s3_bucket_versioning.airflow,
  ]
}

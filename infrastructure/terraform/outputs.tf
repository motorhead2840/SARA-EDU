output "vpc_id"          { value = aws_vpc.main.id }
output "alb_dns_name"   { value = aws_lb.main.dns_name }

output "rds_endpoint"         { value = aws_db_instance.main.endpoint }
output "rds_replica_endpoint" { value = aws_db_instance.replica.endpoint }

output "redis_primary_endpoint" { value = aws_elasticache_replication_group.main.primary_endpoint_address }

# ─── Confluent Cloud (replaces MSK) ──────────────────────────────────────────

output "confluent_environment_id" {
  value       = confluent_environment.main.id
  description = "Confluent Cloud environment ID"
}

output "confluent_cluster_id" {
  value       = confluent_kafka_cluster.main.id
  description = "Confluent Kafka cluster ID"
}

output "confluent_bootstrap_endpoint" {
  value       = confluent_kafka_cluster.main.bootstrap_endpoint
  sensitive   = true
  description = "Confluent Kafka bootstrap endpoint (SASL_SSL)"
}

output "confluent_rest_endpoint" {
  value       = confluent_kafka_cluster.main.rest_endpoint
  description = "Confluent Kafka REST proxy endpoint"
}

output "confluent_app_secret_arn" {
  value       = aws_secretsmanager_secret.confluent_app.arn
  description = "Secrets Manager ARN for app-tier Confluent credentials"
}

output "confluent_airflow_secret_arn" {
  value       = aws_secretsmanager_secret.confluent_airflow.arn
  description = "Secrets Manager ARN for Airflow Confluent credentials"
}

# ─── OpenSearch ───────────────────────────────────────────────────────────────

output "opensearch_endpoint" { value = aws_opensearch_domain.main.endpoint }

# ─── Academic Research Navigator ─────────────────────────────────────────────

output "s3_academic_bucket"  { value = aws_s3_bucket.academic.id }
output "bedrock_mentor_model_ssm" { value = aws_ssm_parameter.bedrock_mentor_model.name }

# ─── ECS / ECR ───────────────────────────────────────────────────────────────

output "ecr_api_server_url" { value = aws_ecr_repository.api_server.repository_url }
output "ecr_shri_api_url"   { value = aws_ecr_repository.shri_api.repository_url }
output "ecs_cluster_name"   { value = aws_ecs_cluster.main.name }

# ─── Airflow ─────────────────────────────────────────────────────────────────

output "airflow_webserver_url" { value = aws_mwaa_environment.main.webserver_url }

# ─── SageMaker ───────────────────────────────────────────────────────────────

output "sagemaker_domain_id" { value = aws_sagemaker_domain.main.id }

# ─── Blockchain ──────────────────────────────────────────────────────────────

output "eth_accessor_arn"   { value = aws_managed_blockchain_accessor.ethereum.arn }
output "amb_eth_endpoint"   { value = local.amb_ethereum_endpoint }

# ─── Route 53 ────────────────────────────────────────────────────────────────

output "route53_nameservers" { value = aws_route53_zone.main.name_servers }

# ─── GitHub CI/CD ────────────────────────────────────────────────────────────

output "github_connection_arn"    { value = aws_codestarconnections_connection.github.arn }
output "github_connection_status" { value = aws_codestarconnections_connection.github.connection_status }

# ─── S3 Buckets ──────────────────────────────────────────────────────────────

output "s3_assets_bucket"    { value = aws_s3_bucket.assets.id }
output "s3_chromadb_bucket"  { value = aws_s3_bucket.chromadb.id }
output "s3_data_lake_bucket" { value = aws_s3_bucket.data_lake.id }
output "s3_airflow_bucket"   { value = aws_s3_bucket.airflow.id }
output "s3_sagemaker_bucket" { value = aws_s3_bucket.sagemaker.id }

# ─── Deep Learning / Compute ─────────────────────────────────────────────────

output "ecr_tensorflow_training_url"  { value = aws_ecr_repository.tensorflow_training.repository_url }
output "batch_gpu_job_queue"          { value = aws_batch_job_queue.gpu_training.name }
output "batch_tensorflow_job_def"     { value = aws_batch_job_definition.tensorflow_train.name }
output "gpu_training_asg_name"        { value = aws_autoscaling_group.gpu_training.name }
output "efs_training_data_id"         { value = aws_efs_file_system.training_data.id }
output "global_accelerator_ips"       { value = aws_globalaccelerator_accelerator.main.ip_sets[*].ip_addresses }
output "transit_gateway_id"           { value = aws_ec2_transit_gateway.main.id }
output "image_builder_pipeline_arn"   { value = aws_imagebuilder_image_pipeline.platform.arn }

# ─── ML Services ─────────────────────────────────────────────────────────────

output "bedrock_model_ids_ssm"     { value = aws_ssm_parameter.bedrock_model_ids.name }
output "polly_config_ssm"          { value = aws_ssm_parameter.polly_config.name }
output "kendra_index_id"           { value = aws_kendra_index.course_materials.id }
output "lex_bot_id"                { value = aws_lexv2models_bot.shri_intake.id }

# ─── Developer Tools ─────────────────────────────────────────────────────────

output "codeartifact_domain"          { value = aws_codeartifact_domain.main.domain }
output "codeartifact_npm_endpoint"    { value = aws_codeartifact_repository.npm.repository_endpoint }
output "codeartifact_pypi_endpoint"   { value = aws_codeartifact_repository.pypi.repository_endpoint }
output "xray_group_arn"               { value = aws_xray_group.main.arn }
output "cloudwatch_ops_dashboard"     { value = aws_cloudwatch_dashboard.operations.dashboard_name }
output "cloudwatch_ml_dashboard"      { value = aws_cloudwatch_dashboard.ml.dashboard_name }
output "cloudwatch_blockchain_dashboard" { value = aws_cloudwatch_dashboard.blockchain.dashboard_name }
output "alerts_sns_topic_arn"         { value = aws_sns_topic.alerts.arn }
output "cloud9_environment_id"        { value = aws_cloud9_environment_ec2.dev.id }

# ─── SageMaker Extended ───────────────────────────────────────────────────────

output "sagemaker_pipeline_arn"             { value = aws_sagemaker_pipeline.shri_tutor_tf.arn }
output "sagemaker_feature_group_mentor"     { value = aws_sagemaker_feature_group.mentor_activity.feature_group_name }
output "sagemaker_feature_group_blockchain" { value = aws_sagemaker_feature_group.blockchain_events.feature_group_name }
output "sagemaker_edge_fleet_name"          { value = aws_sagemaker_device_fleet.edge_tutors.device_fleet_name }

# ─── Blockchain Extended ──────────────────────────────────────────────────────

output "fabric_network_id"       { value = aws_managed_blockchain_network.fabric.id }

# ─── GitHub Actions OIDC ──────────────────────────────────────────────────────
output "github_actions_deploy_role_arn" {
  description = "Copy this value → GitHub repo → Settings → Environments → production → Secrets → AWS_DEPLOY_ROLE_ARN"
  value       = aws_iam_role.github_actions_deploy.arn
}
output "fabric_member_id"        { value = aws_managed_blockchain_network.fabric.member_id }
output "sara_event_indexer_arn"  { value = aws_lambda_function.sara_event_indexer.arn }
output "fabric_admin_secret_arn" { value = aws_secretsmanager_secret.fabric_admin.arn }

# ─── Ground Station ───────────────────────────────────────────────────────────

output "satellite_kinesis_stream_arn" { value = aws_kinesis_stream.satellite_data.arn }
output "ground_station_mission_arn"   { value = aws_groundstation_mission_profile.main.arn }
output "satellite_bridge_lambda_arn"  { value = aws_lambda_function.satellite_kinesis_bridge.arn }

# ─── Outposts (populated after Outpost delivery) ─────────────────────────────

output "outpost_subnet_id"    { value = length(aws_subnet.outpost) > 0 ? aws_subnet.outpost[0].id : "not-provisioned" }
output "outpost_rds_endpoint" { value = length(aws_db_instance.outpost) > 0 ? aws_db_instance.outpost[0].endpoint : "not-provisioned" }

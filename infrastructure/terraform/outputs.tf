output "vpc_id"          { value = aws_vpc.main.id }
output "alb_dns_name"   { value = aws_lb.main.dns_name }

output "rds_endpoint"   { value = aws_db_instance.main.endpoint }
output "rds_replica_endpoint" { value = aws_db_instance.replica.endpoint }

output "redis_primary_endpoint" { value = aws_elasticache_replication_group.main.primary_endpoint_address }

output "kafka_bootstrap_brokers_iam" { value = aws_msk_cluster.main.bootstrap_brokers_sasl_iam; sensitive = true }
output "kafka_zookeeper_connect"     { value = aws_msk_cluster.main.zookeeper_connect_string;   sensitive = true }

output "opensearch_endpoint" { value = aws_opensearch_domain.main.endpoint }

output "ecr_api_server_url" { value = aws_ecr_repository.api_server.repository_url }
output "ecr_shri_api_url"   { value = aws_ecr_repository.shri_api.repository_url }
output "ecs_cluster_name"   { value = aws_ecs_cluster.main.name }

output "airflow_webserver_url" { value = aws_mwaa_environment.main.webserver_url }

output "sagemaker_domain_id" { value = aws_sagemaker_domain.main.id }

output "eth_accessor_arn"   { value = aws_managed_blockchain_accessor.ethereum.arn }
output "amb_eth_endpoint"   { value = local.amb_ethereum_endpoint }

output "route53_nameservers" { value = aws_route53_zone.main.name_servers }

output "github_connection_arn"    { value = aws_codestarconnections_connection.github.arn }
output "github_connection_status" { value = aws_codestarconnections_connection.github.connection_status }

output "s3_assets_bucket"    { value = aws_s3_bucket.assets.id }
output "s3_chromadb_bucket"  { value = aws_s3_bucket.chromadb.id }
output "s3_data_lake_bucket" { value = aws_s3_bucket.data_lake.id }
output "s3_airflow_bucket"   { value = aws_s3_bucket.airflow.id }
output "s3_sagemaker_bucket" { value = aws_s3_bucket.sagemaker.id }

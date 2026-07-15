variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (production, staging)"
  type        = string
  default     = "production"
}

variable "project" {
  description = "Project name prefix"
  type        = string
  default     = "sri"
}

# ─── Networking ───────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "AZs to use within the region"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# ─── RDS ──────────────────────────────────────────────────────────────────────

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "sriplatform"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "sriplatform"
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.medium"
}

# ─── ElastiCache ──────────────────────────────────────────────────────────────

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t4g.small"
}

# ─── Confluent Cloud (replaces MSK) ──────────────────────────────────────────

variable "confluent_cloud_api_key" {
  description = "Confluent Cloud API key (control plane)"
  type        = string
  sensitive   = true
}

variable "confluent_cloud_api_secret" {
  description = "Confluent Cloud API secret (control plane)"
  type        = string
  sensitive   = true
}

variable "confluent_cluster_ckus" {
  description = "Number of Confluent Kafka Units for the dedicated cluster (min 2)"
  type        = number
  default     = 2
}

# ─── OpenSearch ───────────────────────────────────────────────────────────────

variable "opensearch_version" {
  description = "OpenSearch engine version"
  type        = string
  default     = "OpenSearch_2.11"
}

variable "opensearch_instance_type" {
  description = "OpenSearch instance type"
  type        = string
  default     = "t3.small.search"
}

# ─── ECS ──────────────────────────────────────────────────────────────────────

variable "api_server_image" {
  description = "ECR image URI for the api-server container"
  type        = string
  default     = ""
}

variable "shri_api_image" {
  description = "ECR image URI for the Python Shri Academy API"
  type        = string
  default     = ""
}

# ─── MWAA (Airflow) ───────────────────────────────────────────────────────────

variable "airflow_version" {
  description = "MWAA Airflow version"
  type        = string
  default     = "2.8.1"
}

variable "airflow_environment_class" {
  description = "MWAA environment class"
  type        = string
  default     = "mw1.small"
}

# ─── Route 53 ─────────────────────────────────────────────────────────────────

variable "domain_name" {
  description = "Root domain name (e.g. sri-learn.ai)"
  type        = string
  default     = "sri-learn.ai"
}

# ─── GitHub CI/CD ─────────────────────────────────────────────────────────────

variable "github_org" {
  description = "GitHub organisation / username"
  type        = string
  default     = "motorhead2840"
}

variable "github_monorepo" {
  description = "GitHub repository name for the Shri Academy monorepo (used for OIDC trust policy)"
  type        = string
  default     = "SHRI-ACADEMY"
}

# ─── NVIDIA NIM ───────────────────────────────────────────────────────────────

variable "nvidia_api_key" {
  description = "NVIDIA NIM API key — used by Nemotron games + mythology routes in api-server"
  type        = string
  sensitive   = true
  default     = ""
}

# ─── Threat Mitigation ────────────────────────────────────────────────────────

variable "threat_mitigation_max_retries" {
  description = "Maximum number of retries for WAF IP set updates"
  type        = number
  default     = 5
}

variable "threat_mitigation_initial_backoff_delay_seconds" {
  description = "Initial backoff delay in seconds for WAF IP set update retries"
  type        = number
  default     = 0.5
}

variable "threat_mitigation_batch_size" {
  description = "Batch size for the Confluent Kafka Event Source Mapping"
  type        = number
  default     = 5
}

variable "threat_mitigation_log_retention_days" {
  description = "Retention in days for the CloudWatch log group of the threat mitigation Lambda"
  type        = number
  default     = 7
}

variable "confluent_privatelink_service_name" {
  description = "The VPC endpoint service name for Confluent Cloud PrivateLink connection"
  type        = string
}

variable "eks_cluster_arn" {
  description = "The ARN of the EKS cluster for orchestrating SageMaker HyperPod"
  type        = string
}

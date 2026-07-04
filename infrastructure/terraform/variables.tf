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
  default     = "db.t3.medium"
}

# ─── ElastiCache ──────────────────────────────────────────────────────────────

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.medium"
}

# ─── MSK (Kafka) ──────────────────────────────────────────────────────────────

variable "kafka_version" {
  description = "Apache Kafka version for MSK"
  type        = string
  default     = "3.5.1"
}

variable "kafka_broker_instance_type" {
  description = "MSK broker instance type"
  type        = string
  default     = "kafka.m5.large"
}

variable "kafka_broker_count" {
  description = "Number of Kafka brokers (must be multiple of AZ count)"
  type        = number
  default     = 3
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
  default     = "r6g.large.search"
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
  description = "Root domain name (e.g. sriplatform.com)"
  type        = string
  default     = "sriplatform.com"
}

# ─── GitHub CI/CD ─────────────────────────────────────────────────────────────

variable "github_org" {
  description = "GitHub organisation / username"
  type        = string
  default     = "motorhead2840"
}

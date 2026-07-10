# ─── S3 Buckets ───────────────────────────────────────────────────────────────

locals {
  buckets = {
    assets       = "${var.project}-${var.environment}-assets"
    chromadb     = "${var.project}-${var.environment}-chromadb-vectors"
    airflow      = "${var.project}-${var.environment}-airflow"
    kafka_logs   = "${var.project}-${var.environment}-kafka-logs"
    sagemaker    = "${var.project}-${var.environment}-sagemaker"
    data_lake    = "${var.project}-${var.environment}-data-lake"
  }
}

# Assets (public CDN content)
resource "aws_s3_bucket" "assets" {
  bucket = local.buckets.assets
}
resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}
resource "aws_s3_bucket_cors_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 3600
  }
}

# ChromaDB vector store persistence
resource "aws_s3_bucket" "chromadb" {
  bucket = local.buckets.chromadb
}
resource "aws_s3_bucket_versioning" "chromadb" {
  bucket = aws_s3_bucket.chromadb.id
  versioning_configuration { status = "Enabled" }
}

# MWAA Airflow DAGs and logs
resource "aws_s3_bucket" "airflow" {
  bucket = local.buckets.airflow
}
resource "aws_s3_bucket_versioning" "airflow" {
  bucket = aws_s3_bucket.airflow.id
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_object" "airflow_dags_placeholder" {
  bucket  = aws_s3_bucket.airflow.id
  key     = "dags/.keep"
  content = ""
}

# Kafka log archive
resource "aws_s3_bucket" "kafka_logs" {
  bucket = local.buckets.kafka_logs
}
resource "aws_s3_bucket_lifecycle_configuration" "kafka_logs" {
  bucket = aws_s3_bucket.kafka_logs.id
  rule {
    id     = "expire-old-logs"
    status = "Enabled"
    filter { prefix = "kafka-logs/" }
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    expiration { days = 90 }
  }
}

# SageMaker training data and model artifacts
resource "aws_s3_bucket" "sagemaker" {
  bucket = local.buckets.sagemaker
}
resource "aws_s3_bucket_versioning" "sagemaker" {
  bucket = aws_s3_bucket.sagemaker.id
  versioning_configuration { status = "Enabled" }
}

# Data lake — cleaned event data from Airflow
resource "aws_s3_bucket" "data_lake" {
  bucket = local.buckets.data_lake
}
resource "aws_s3_bucket_versioning" "data_lake" {
  bucket = aws_s3_bucket.data_lake.id
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_lifecycle_configuration" "data_lake" {
  bucket = aws_s3_bucket.data_lake.id
  rule {
    id     = "intelligent-tiering"
    status = "Enabled"
    filter {}
    transition {
      days          = 30
      storage_class = "INTELLIGENT_TIERING"
    }
  }
}

# Encryption for all private buckets
resource "aws_s3_bucket_server_side_encryption_configuration" "chromadb"   { bucket = aws_s3_bucket.chromadb.id;  rule { apply_server_side_encryption_by_default { sse_algorithm = "aws:kms" } } }
resource "aws_s3_bucket_server_side_encryption_configuration" "airflow"    { bucket = aws_s3_bucket.airflow.id;   rule { apply_server_side_encryption_by_default { sse_algorithm = "aws:kms" } } }
resource "aws_s3_bucket_server_side_encryption_configuration" "sagemaker"  { bucket = aws_s3_bucket.sagemaker.id; rule { apply_server_side_encryption_by_default { sse_algorithm = "aws:kms" } } }
resource "aws_s3_bucket_server_side_encryption_configuration" "data_lake"  { bucket = aws_s3_bucket.data_lake.id; rule { apply_server_side_encryption_by_default { sse_algorithm = "aws:kms" } } }

# Block public access for all private buckets
resource "aws_s3_bucket_public_access_block" "chromadb"  { bucket = aws_s3_bucket.chromadb.id;  block_public_acls = true; block_public_policy = true; ignore_public_acls = true; restrict_public_buckets = true }
resource "aws_s3_bucket_public_access_block" "airflow"   { bucket = aws_s3_bucket.airflow.id;   block_public_acls = true; block_public_policy = true; ignore_public_acls = true; restrict_public_buckets = true }
resource "aws_s3_bucket_public_access_block" "kafka_logs"{ bucket = aws_s3_bucket.kafka_logs.id; block_public_acls = true; block_public_policy = true; ignore_public_acls = true; restrict_public_buckets = true }
resource "aws_s3_bucket_public_access_block" "sagemaker" { bucket = aws_s3_bucket.sagemaker.id; block_public_acls = true; block_public_policy = true; ignore_public_acls = true; restrict_public_buckets = true }
resource "aws_s3_bucket_public_access_block" "data_lake" { bucket = aws_s3_bucket.data_lake.id; block_public_acls = true; block_public_policy = true; ignore_public_acls = true; restrict_public_buckets = true }

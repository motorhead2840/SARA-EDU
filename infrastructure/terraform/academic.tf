# ─── Research Navigator — AWS Infrastructure ──────────────────────────────────
#
# Covers the additional AWS resources needed for the OCW academic platform:
#   • S3 bucket for course materials / syllabi
#   • OpenSearch index configuration (SSM params consumed by Airflow DAG)
#   • AWS Bedrock IAM permissions for the AI mentor
#   • CloudWatch alarms for academic API health

# ── S3: Course Materials ──────────────────────────────────────────────────────

resource "aws_s3_bucket" "academic" {
  bucket = "${var.project}-${var.environment}-academic-materials"
}

resource "aws_s3_bucket_versioning" "academic" {
  bucket = aws_s3_bucket.academic.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "academic" {
  bucket = aws_s3_bucket.academic.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "academic" {
  bucket                  = aws_s3_bucket.academic.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "academic" {
  bucket = aws_s3_bucket.academic.id

  rule {
    id     = "syllabus-tiering"
    status = "Enabled"
    filter {}
    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }
    transition {
      days          = 365
      storage_class = "GLACIER_IR"
    }
  }
}

# CORS for presigned URL uploads from the frontend
resource "aws_s3_bucket_cors_configuration" "academic" {
  bucket = aws_s3_bucket.academic.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["https://${var.domain_name}", "https://shri.${var.domain_name}"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

resource "aws_ssm_parameter" "s3_academic_bucket" {
  name  = "/${var.project}/${var.environment}/s3/academic-bucket"
  type  = "String"
  value = aws_s3_bucket.academic.id
}

# ── OpenSearch: Academic Index Configuration ──────────────────────────────────
# The Airflow DAG `academic_opensearch_indexer` reads these SSM params
# to know which indices to create and maintain.

resource "aws_ssm_parameter" "os_academic_courses_index" {
  name  = "/${var.project}/${var.environment}/opensearch/indices/academic-courses"
  type  = "String"
  value = "academic-courses-v1"
}

resource "aws_ssm_parameter" "os_academic_topics_index" {
  name  = "/${var.project}/${var.environment}/opensearch/indices/academic-topics"
  type  = "String"
  value = "academic-research-topics-v1"
}

resource "aws_ssm_parameter" "os_academic_courses_mapping" {
  name  = "/${var.project}/${var.environment}/opensearch/mappings/academic-courses"
  type  = "String"
  value = jsonencode({
    settings = {
      number_of_shards   = 3
      number_of_replicas = 1
      analysis = {
        analyzer = {
          academic_text = {
            type      = "custom"
            tokenizer = "standard"
            filter    = ["lowercase", "stop", "snowball"]
          }
        }
      }
    }
    mappings = {
      properties = {
        id             = { type = "keyword" }
        mit_course_num = { type = "keyword" }
        title          = { type = "text", analyzer = "academic_text", fields = { keyword = { type = "keyword" } } }
        description    = { type = "text", analyzer = "academic_text" }
        level          = { type = "keyword" }
        discipline_id  = { type = "keyword" }
        discipline_name = { type = "keyword" }
        specialization_id   = { type = "keyword" }
        specialization_name = { type = "keyword" }
        instructors    = { type = "keyword" }
        topics         = { type = "keyword" }
        resource_types = { type = "keyword" }
        difficulty     = { type = "integer" }
        hours_per_week = { type = "integer" }
        semester       = { type = "keyword" }
        year           = { type = "integer" }
        url            = { type = "keyword", index = false }
        indexed_at     = { type = "date" }
      }
    }
  })
}

resource "aws_ssm_parameter" "os_academic_topics_mapping" {
  name  = "/${var.project}/${var.environment}/opensearch/mappings/academic-topics"
  type  = "String"
  value = jsonencode({
    settings = {
      number_of_shards   = 2
      number_of_replicas = 1
    }
    mappings = {
      properties = {
        id              = { type = "keyword" }
        title           = { type = "text", fields = { keyword = { type = "keyword" } } }
        description     = { type = "text" }
        why_it_matters  = { type = "text" }
        discipline_id   = { type = "keyword" }
        discipline_name = { type = "keyword" }
        key_skills      = { type = "keyword" }
        open_questions  = { type = "text" }
        career_paths    = { type = "keyword" }
        difficulty      = { type = "integer" }
        course_ids      = { type = "keyword" }
        indexed_at      = { type = "date" }
      }
    }
  })
}

# ── Bedrock: AI Mentor Permissions ────────────────────────────────────────────
# Grants the ECS task role permission to invoke Bedrock models.
# The Python shri-api calls Bedrock as a fallback when BEDROCK_ENABLED=true.

resource "aws_iam_role_policy" "ecs_task_bedrock" {
  name = "bedrock-academic-mentor"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "BedrockInvoke"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
        ]
        Resource = [
          # Claude Sonnet 3.5 — primary model for research mentor
          "arn:aws:bedrock:${var.aws_region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
          # Claude Haiku — fast responses for search/autocomplete
          "arn:aws:bedrock:${var.aws_region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
          # Titan Text — embeddings for semantic search
          "arn:aws:bedrock:${var.aws_region}::foundation-model/amazon.titan-embed-text-v2:0",
        ]
      },
      {
        Sid    = "BedrockListModels"
        Effect = "Allow"
        Action = ["bedrock:ListFoundationModels", "bedrock:GetFoundationModel"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "ecs_task_academic_s3" {
  name = "academic-s3-access"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AcademicMaterialsAccess"
      Effect = "Allow"
      Action = [
        "s3:GetObject", "s3:PutObject", "s3:DeleteObject",
        "s3:ListBucket", "s3:GetBucketLocation"
      ]
      Resource = [
        aws_s3_bucket.academic.arn,
        "${aws_s3_bucket.academic.arn}/*",
      ]
    }]
  })
}

# ── Bedrock SSM params (read by Python shri-api at boot) ─────────────────────

resource "aws_ssm_parameter" "bedrock_mentor_model" {
  name  = "/${var.project}/${var.environment}/bedrock/research-mentor-model"
  type  = "String"
  value = "anthropic.claude-3-5-sonnet-20241022-v2:0"
}

resource "aws_ssm_parameter" "bedrock_fast_model" {
  name  = "/${var.project}/${var.environment}/bedrock/fast-model"
  type  = "String"
  value = "anthropic.claude-3-haiku-20240307-v1:0"
}

resource "aws_ssm_parameter" "bedrock_embedding_model" {
  name  = "/${var.project}/${var.environment}/bedrock/embedding-model"
  type  = "String"
  value = "amazon.titan-embed-text-v2:0"
}

# ── CloudWatch Alarms — Academic API ─────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "academic_search_errors" {
  alarm_name          = "${var.project}-${var.environment}-academic-search-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5XXError"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Academic search endpoint returning 5xx errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "bedrock_throttle" {
  alarm_name          = "${var.project}-${var.environment}-bedrock-throttle"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ThrottledRequests"
  namespace           = "AWS/Bedrock"
  period              = 300
  statistic           = "Sum"
  threshold           = 20
  alarm_description   = "Bedrock being throttled — check provisioned throughput"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

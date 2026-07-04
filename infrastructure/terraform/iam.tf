# ─── IAM Roles ────────────────────────────────────────────────────────────────

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals { type = "Service"; identifiers = ["ecs-tasks.amazonaws.com"] }
  }
}

# ECS Execution Role — pulls images, reads secrets
resource "aws_iam_role" "ecs_execution" {
  name               = "${var.project}-${var.environment}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "ecs_execution_base" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "secrets-access"
  role = aws_iam_role.ecs_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue", "kms:Decrypt"]
      Resource = "*"
    }]
  })
}

# ECS Task Role — runtime permissions (Kafka IAM auth, S3, OpenSearch, SageMaker)
resource "aws_iam_role" "ecs_task" {
  name               = "${var.project}-${var.environment}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy" "ecs_task_permissions" {
  name = "task-permissions"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Kafka auth is now SASL/PLAIN via Confluent Cloud API keys stored in
      # Secrets Manager — no MSK IAM permissions required.
      {
        Sid    = "S3Access"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.assets.arn,   "${aws_s3_bucket.assets.arn}/*",
          aws_s3_bucket.chromadb.arn, "${aws_s3_bucket.chromadb.arn}/*",
          aws_s3_bucket.data_lake.arn,"${aws_s3_bucket.data_lake.arn}/*",
        ]
      },
      {
        Sid      = "OpenSearchAccess"
        Effect   = "Allow"
        Action   = ["es:ESHttpGet", "es:ESHttpPost", "es:ESHttpPut", "es:ESHttpDelete"]
        Resource = "${aws_opensearch_domain.main.arn}/*"
      },
      {
        Sid      = "SageMakerFeatureStore"
        Effect   = "Allow"
        Action   = ["sagemaker:PutRecord", "sagemaker:GetRecord", "sagemaker:DeleteRecord"]
        Resource = aws_sagemaker_feature_group.student_engagement.arn
      },
      {
        Sid      = "SSMRead"
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters"]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project}/*"
      },
      {
        Sid      = "SecretsRead"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.project}/*"
      },
      {
        Sid      = "AMBBlockchain"
        Effect   = "Allow"
        Action   = ["managedblockchain:GET", "managedblockchain:POST"]
        Resource = aws_managed_blockchain_accessor.ethereum.arn
      }
    ]
  })
}

# RDS Enhanced Monitoring Role
resource "aws_iam_role" "rds_monitoring" {
  name               = "${var.project}-${var.environment}-rds-monitoring"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
    }]
  })
}
resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# MWAA Execution Role
resource "aws_iam_role" "mwaa" {
  name               = "${var.project}-${var.environment}-mwaa"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "airflow-env.amazonaws.com" }
    }, {
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "airflow.amazonaws.com" }
    }]
  })
}
resource "aws_iam_role_policy" "mwaa_permissions" {
  name = "mwaa-permissions"
  role = aws_iam_role.mwaa.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow"; Action = "airflow:PublishMetrics"; Resource = "arn:aws:airflow:${var.aws_region}:${data.aws_caller_identity.current.account_id}:environment/${var.project}-*" },
      { Effect = "Allow"; Action = ["s3:GetObject*", "s3:GetBucket*", "s3:List*"]; Resource = [aws_s3_bucket.airflow.arn, "${aws_s3_bucket.airflow.arn}/*"] },
      { Effect = "Allow"; Action = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"]; Resource = [aws_s3_bucket.data_lake.arn, "${aws_s3_bucket.data_lake.arn}/*"] },
      { Effect = "Allow"; Action = ["logs:CreateLogStream", "logs:CreateLogGroup", "logs:PutLogEvents", "logs:GetLogEvents", "logs:GetLogRecord", "logs:GetLogGroupFields", "logs:GetQueryResults", "logs:DescribeLogGroups"]; Resource = "*" },
      { Effect = "Allow"; Action = ["cloudwatch:PutMetricData"]; Resource = "*" },
      { Effect = "Allow"; Action = ["sqs:ChangeMessageVisibility", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:GetQueueUrl", "sqs:ReceiveMessage", "sqs:SendMessage"]; Resource = "arn:aws:sqs:${var.aws_region}:*:airflow-celery-*" },
      { Effect = "Allow"; Action = ["kms:Decrypt", "kms:DescribeKey", "kms:GenerateDataKey*", "kms:Encrypt"]; Resource = "*" },
      # Confluent Cloud uses SASL/PLAIN — credentials come from Secrets Manager, no IAM needed.
      { Effect = "Allow"; Action = ["es:ESHttpGet", "es:ESHttpPost", "es:ESHttpPut", "es:ESHttpDelete"]; Resource = "${aws_opensearch_domain.main.arn}/*" },
      { Effect = "Allow"; Action = ["secretsmanager:GetSecretValue"]; Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.project}/*" },
      { Effect = "Allow"; Action = ["ssm:GetParameter", "ssm:GetParameters"]; Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/*" },
      { Effect = "Allow"; Action = ["sagemaker:CreateTrainingJob", "sagemaker:DescribeTrainingJob", "sagemaker:PutRecord", "sagemaker:GetRecord"]; Resource = "*" },
      { Effect = "Allow"; Action = ["rds:DescribeDBInstances"]; Resource = "*" },
    ]
  })
}

# SageMaker Execution Role
resource "aws_iam_role" "sagemaker" {
  name               = "${var.project}-${var.environment}-sagemaker"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole"; Effect = "Allow"; Principal = { Service = "sagemaker.amazonaws.com" } }]
  })
}
resource "aws_iam_role_policy_attachment" "sagemaker" {
  role       = aws_iam_role.sagemaker.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess"
}
resource "aws_iam_role_policy" "sagemaker_s3" {
  name = "s3-access"
  role = aws_iam_role.sagemaker.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow"; Action = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]; Resource = [aws_s3_bucket.sagemaker.arn, "${aws_s3_bucket.sagemaker.arn}/*"] }]
  })
}

# Lambda Execution Role (Kafka topic provisioner)
resource "aws_iam_role" "lambda_kafka" {
  name               = "${var.project}-${var.environment}-lambda-kafka"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole"; Effect = "Allow"; Principal = { Service = "lambda.amazonaws.com" } }]
  })
}
resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda_kafka.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}
resource "aws_iam_role_policy" "lambda_kafka_permissions" {
  # This role was for the MSK topic provisioner Lambda, which is now deprecated.
  # Topics are managed by Terraform via confluent_kafka_topic in confluent.tf.
  # Keeping the role to avoid destroying/recreating attached resources;
  # permissions are now a no-op placeholder.
  name = "kafka-permissions"
  role = aws_iam_role.lambda_kafka.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Confluent Cloud — SASL/PLAIN; topic provisioner Lambda is deprecated.
      # Grant read access to Confluent secret so the Lambda can report its status.
      { Effect = "Allow"; Action = ["secretsmanager:GetSecretValue"]; Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.project}/${var.environment}/confluent/*" }
    ]
  })
}

# CodePipeline Role
resource "aws_iam_role" "codepipeline" {
  name               = "${var.project}-${var.environment}-codepipeline"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole"; Effect = "Allow"; Principal = { Service = "codepipeline.amazonaws.com" } }]
  })
}
resource "aws_iam_role_policy" "codepipeline_permissions" {
  name = "codepipeline-permissions"
  role = aws_iam_role.codepipeline.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow"; Action = ["s3:*"]; Resource = "*" },
      { Effect = "Allow"; Action = ["codebuild:BatchGetBuilds", "codebuild:StartBuild"]; Resource = "*" },
      { Effect = "Allow"; Action = ["ecs:*"]; Resource = "*" },
      { Effect = "Allow"; Action = ["iam:PassRole"]; Resource = "*" },
      { Effect = "Allow"; Action = ["codestar-connections:UseConnection"]; Resource = "*" },
      { Effect = "Allow"; Action = ["ecr:*"]; Resource = "*" },
    ]
  })
}

# CodeBuild Role
resource "aws_iam_role" "codebuild" {
  name               = "${var.project}-${var.environment}-codebuild"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole"; Effect = "Allow"; Principal = { Service = "codebuild.amazonaws.com" } }]
  })
}
resource "aws_iam_role_policy" "codebuild_permissions" {
  name = "codebuild-permissions"
  role = aws_iam_role.codebuild.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow"; Action = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]; Resource = "*" },
      { Effect = "Allow"; Action = ["ecr:GetAuthorizationToken", "ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage"]; Resource = "*" },
      { Effect = "Allow"; Action = ["s3:GetObject", "s3:PutObject", "s3:GetBucketLocation"]; Resource = "*" },
      { Effect = "Allow"; Action = ["ecs:DescribeTaskDefinition"]; Resource = "*" },
    ]
  })
}

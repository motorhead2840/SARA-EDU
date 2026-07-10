###############################################################################
# RageSage — SecOps Content Moderation ML Stack
#
# SageMaker pipeline that trains a multi-label toxicity classifier against the
# Profanity / Vulgarity / Perverted Mentation Index (PMI) scoring system.
# Output model supports Cyberdemon's SecOps threat detection workflow.
#
# Resources:
#   - S3 bucket for labelled training data and model artefacts
#   - SSM parameters for cross-service configuration
#   - ECR repo for the custom HuggingFace DistilBERT training container
#   - SageMaker Feature Group: secops-content-index
#   - SageMaker Pipeline:      ragethesage (5-step multi-label classifier)
#   - SageMaker Model:         ragethesage-classifier
#   - SageMaker Endpoint:      ragethesage-inference
#   - IAM role for pipeline execution with S3/ECR/MSK/OpenSearch access
#   - EventBridge rule for weekly scheduled retraining
#   - CloudWatch alarm on inference endpoint 5xx rate
###############################################################################

# ---------------------------------------------------------------------------
# S3 bucket — labelled training data + model artefacts
# ---------------------------------------------------------------------------

resource "aws_s3_bucket" "secops" {
  bucket        = "${var.project}-${var.environment}-secops"
  force_destroy = var.environment != "production"

  tags = {
    Project     = var.project
    Environment = var.environment
    Purpose     = "ragethesage-training-data"
  }
}

resource "aws_s3_bucket_versioning" "secops" {
  bucket = aws_s3_bucket.secops.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "secops" {
  bucket = aws_s3_bucket.secops.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "secops" {
  bucket = aws_s3_bucket.secops.id

  rule {
    id     = "expire-raw-ndjson"
    status = "Enabled"
    filter { prefix = "secops/training/" }
    expiration { days = 180 }
  }

  rule {
    id     = "expire-old-models"
    status = "Enabled"
    filter { prefix = "secops/models/" }
    noncurrent_version_expiration { noncurrent_days = 90 }
  }
}

# ---------------------------------------------------------------------------
# ECR — custom RageSage training container
# (HuggingFace DistilBERT fine-tuned for multi-label classification)
# ---------------------------------------------------------------------------

resource "aws_ecr_repository" "ragethesage" {
  name                 = "${var.project}/ragethesage-trainer"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration { scan_on_push = true }

  tags = {
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_ecr_lifecycle_policy" "ragethesage" {
  repository = aws_ecr_repository.ragethesage.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 5 trainer images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}

# ---------------------------------------------------------------------------
# IAM role — SageMaker pipeline execution
# ---------------------------------------------------------------------------

resource "aws_iam_role" "ragethesage_pipeline" {
  name = "${var.project}-ragethesage-pipeline-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sagemaker.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "ragethesage_sagemaker" {
  role       = aws_iam_role.ragethesage_pipeline.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess"
}

resource "aws_iam_role_policy" "ragethesage_inline" {
  name = "ragethesage-inline"
  role = aws_iam_role.ragethesage_pipeline.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject", "s3:PutObject", "s3:ListBucket", "s3:DeleteObject"
        ]
        Resource = [
          aws_s3_bucket.secops.arn,
          "${aws_s3_bucket.secops.arn}/*",
        ]
      },
      {
        Effect = "Allow"
        Action = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
        ]
        Resource = aws_ecr_repository.ragethesage.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:log-group:/aws/sagemaker/*"
      },
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters"]
        Resource = "arn:aws:ssm:${var.aws_region}:*:parameter/${var.project}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "es:ESHttpPost", "es:ESHttpPut", "es:ESHttpGet"
        ]
        Resource = "${aws_opensearch_domain.main.arn}/*"
      },
    ]
  })
}

# ---------------------------------------------------------------------------
# SageMaker Feature Group — secops-content-index
# Stores scored + labelled content features for model training lineage
# ---------------------------------------------------------------------------

resource "aws_sagemaker_feature_group" "secops_content_index" {
  feature_group_name             = "secops-content-index"
  record_identifier_feature_name = "content_id"
  event_time_feature_name        = "event_time"
  role_arn                       = aws_iam_role.ragethesage_pipeline.arn

  feature_definition { feature_name = "content_id"        feature_type = "String" }
  feature_definition { feature_name = "event_time"        feature_type = "String" }
  feature_definition { feature_name = "source_type"       feature_type = "String" }
  feature_definition { feature_name = "char_count"        feature_type = "Integral" }
  feature_definition { feature_name = "profanity_score"   feature_type = "Fractional" }
  feature_definition { feature_name = "vulgarity_score"   feature_type = "Fractional" }
  feature_definition { feature_name = "pmi_score"         feature_type = "Fractional" }
  feature_definition { feature_name = "composite_risk"    feature_type = "Fractional" }
  feature_definition { feature_name = "risk_tier"         feature_type = "String" }
  feature_definition { feature_name = "flag_count"        feature_type = "Integral" }
  feature_definition { feature_name = "label_profanity"   feature_type = "Fractional" }
  feature_definition { feature_name = "label_vulgarity"   feature_type = "Fractional" }
  feature_definition { feature_name = "label_pmi"         feature_type = "Fractional" }
  feature_definition { feature_name = "labelled_by"       feature_type = "String" }
  feature_definition { feature_name = "cyberdemon_event"  feature_type = "String" }

  online_store_config {
    enable_online_store = true
  }

  offline_store_config {
    s3_storage_config {
      s3_uri = "s3://${aws_s3_bucket.secops.bucket}/feature-store/secops-content-index/"
    }
    disable_glue_table_creation = false
  }

  tags = {
    Project     = var.project
    Environment = var.environment
    Purpose     = "ragethesage-feature-lineage"
  }
}

# ---------------------------------------------------------------------------
# SageMaker Pipeline — ragethesage
#
# Steps:
#   1. DataPrep      — load NDJSON from S3, tokenise with DistilBERT tokenizer,
#                      split 80/10/10 train/val/test
#   2. Training      — fine-tune DistilBERT for multi-label regression (3 heads:
#                      profanity, vulgarity, PMI); GPU: ml.g4dn.xlarge (T4)
#   3. Evaluation    — compute F1 macro on test split; write metrics to S3
#   4. Condition     — register only if F1 macro ≥ 0.78
#   5. Register      — register approved model to Model Package Group "ragethesage"
# ---------------------------------------------------------------------------

resource "aws_sagemaker_pipeline" "ragethesage" {
  pipeline_name         = "ragethesage"
  pipeline_display_name = "RageSage — SecOps PMI Classifier"
  role_arn              = aws_iam_role.ragethesage_pipeline.arn

  pipeline_definition = jsonencode({
    Version = "2020-12-01"

    Parameters = [
      {
        Name         = "TrainingDataDate"
        Type         = "String"
        DefaultValue = "latest"
      },
      {
        Name         = "MinF1Threshold"
        Type         = "String"
        DefaultValue = "0.78"
      },
      {
        Name         = "TrainingInstanceType"
        Type         = "String"
        DefaultValue = "ml.g4dn.xlarge"
      },
    ]

    Steps = [
      # ---- Step 1: Data Preparation ----------------------------------------
      {
        Name = "DataPrep"
        Type = "Processing"
        Arguments = {
          ProcessingResources = {
            ClusterConfig = {
              InstanceType  = "ml.m5.xlarge"
              InstanceCount = 1
              VolumeSizeInGB = 50
            }
          }
          AppSpecification = {
            ImageUri        = "${aws_ecr_repository.ragethesage.repository_url}:latest"
            ContainerEntrypoint = ["python", "/opt/ml/code/dataprep.py"]
          }
          ProcessingInputs = [{
            InputName = "raw-data"
            S3Input = {
              S3Uri         = "s3://${aws_s3_bucket.secops.bucket}/secops/training/"
              LocalPath     = "/opt/ml/processing/input"
              S3DataType    = "S3Prefix"
              S3InputMode   = "File"
            }
          }]
          ProcessingOutputs = [{
            OutputName = "processed-data"
            S3Output = {
              S3Uri       = "s3://${aws_s3_bucket.secops.bucket}/secops/processed/"
              LocalPath   = "/opt/ml/processing/output"
              S3UploadMode = "EndOfJob"
            }
          }]
          Environment = {
            TOKENIZER_MODEL = "distilbert-base-uncased"
            LABEL_COLUMNS   = "label_profanity,label_vulgarity,label_pmi"
            TRAIN_SPLIT     = "0.8"
            VAL_SPLIT       = "0.1"
          }
        }
      },

      # ---- Step 2: Training -------------------------------------------------
      {
        Name      = "Training"
        Type      = "Training"
        DependsOn = ["DataPrep"]
        Arguments = {
          AlgorithmSpecification = {
            TrainingImage     = "${aws_ecr_repository.ragethesage.repository_url}:latest"
            TrainingInputMode = "File"
          }
          ResourceConfig = {
            InstanceType   = { "Get" = "Parameters.TrainingInstanceType" }
            InstanceCount  = 1
            VolumeSizeInGB = 100
          }
          StoppingCondition = { MaxRuntimeInSeconds = 7200 }
          InputDataConfig = [{
            ChannelName = "train"
            DataSource = {
              S3DataSource = {
                S3Uri     = "s3://${aws_s3_bucket.secops.bucket}/secops/processed/train/"
                S3DataType = "S3Prefix"
              }
            }
          }, {
            ChannelName = "validation"
            DataSource = {
              S3DataSource = {
                S3Uri      = "s3://${aws_s3_bucket.secops.bucket}/secops/processed/val/"
                S3DataType = "S3Prefix"
              }
            }
          }]
          OutputDataConfig = {
            S3OutputPath = "s3://${aws_s3_bucket.secops.bucket}/secops/models/"
          }
          HyperParameters = {
            model_name      = "distilbert-base-uncased"
            epochs          = "5"
            learning_rate   = "2e-5"
            batch_size      = "32"
            warmup_steps    = "100"
            label_heads     = "profanity,vulgarity,pmi"
            loss_fn         = "mse"
            dropout         = "0.1"
          }
          CheckpointConfig = {
            S3Uri = "s3://${aws_s3_bucket.secops.bucket}/secops/checkpoints/"
          }
        }
      },

      # ---- Step 3: Evaluation -----------------------------------------------
      # evaluate.py writes /opt/ml/processing/evaluation/metrics.json:
      #   { "f1_macro": 0.83, "f1_profanity": 0.91, "f1_vulgarity": 0.87, "f1_pmi": 0.72 }
      {
        Name      = "Evaluation"
        Type      = "Processing"
        DependsOn = ["Training"]
        Arguments = {
          ProcessingResources = {
            ClusterConfig = {
              InstanceType   = "ml.m5.large"
              InstanceCount  = 1
              VolumeSizeInGB = 30
            }
          }
          AppSpecification = {
            ImageUri            = "${aws_ecr_repository.ragethesage.repository_url}:latest"
            ContainerEntrypoint = ["python", "/opt/ml/code/evaluate.py"]
          }
          ProcessingInputs = [
            {
              InputName = "model"
              S3Input = {
                S3Uri       = { "Get" = "Steps.Training.ModelArtifacts.S3ModelArtifacts" }
                LocalPath   = "/opt/ml/processing/model"
                S3DataType  = "S3Prefix"
                S3InputMode = "File"
              }
            },
            {
              InputName = "test-data"
              S3Input = {
                S3Uri       = "s3://${aws_s3_bucket.secops.bucket}/secops/processed/test/"
                LocalPath   = "/opt/ml/processing/test"
                S3DataType  = "S3Prefix"
                S3InputMode = "File"
              }
            }
          ]
          ProcessingOutputs = [{
            OutputName = "evaluation"
            AppManaged = false
            S3Output = {
              S3Uri        = "s3://${aws_s3_bucket.secops.bucket}/secops/evaluation/"
              LocalPath    = "/opt/ml/processing/evaluation"
              S3UploadMode = "EndOfJob"
            }
          }]
          # PropertyFile tells the pipeline SDK to load metrics.json for JsonGet
          ProcessingJobName = { "Get" = "Execution.PipelineName" }
        }
        # Property file registration — JsonGet reads f1_macro from metrics.json
        PropertyFiles = [{
          PropertyFileName = "EvaluationReport"
          OutputName       = "evaluation"
          FilePath         = "metrics.json"
        }]
      },

      # ---- Step 4: Condition — gate on F1 macro (JsonGet from property file) ----
      {
        Name      = "QualityGate"
        Type      = "Condition"
        DependsOn = ["Evaluation"]
        Arguments = {
          Conditions = [{
            Type       = "GreaterThanOrEqualTo"
            LeftValue  = {
              "Std:JsonGet" = {
                PropertyFile = { "Get" = "Steps.Evaluation.PropertyFiles.EvaluationReport" }
                Path         = "f1_macro"
              }
            }
            RightValue = { "Get" = "Parameters.MinF1Threshold" }
          }]
          IfSteps   = ["ModelRegistration"]
          ElseSteps = []
        }
      },

      # ---- Step 5: Model Registration ---------------------------------------
      {
        Name      = "ModelRegistration"
        Type      = "RegisterModel"
        DependsOn = ["QualityGate"]
        Arguments = {
          ModelPackageGroupName = "ragethesage"
          InferenceSpecification = {
            Containers = [{
              Image        = "${aws_ecr_repository.ragethesage.repository_url}:latest"
              ModelDataUrl = { "Get" = "Steps.Training.ModelArtifacts.S3ModelArtifacts" }
              Environment = {
                MODEL_TYPE  = "distilbert-pmi-classifier"
                LABEL_HEADS = "profanity,vulgarity,pmi"
              }
            }]
            SupportedContentTypes     = ["application/json"]
            SupportedResponseMIMETypes = ["application/json"]
            SupportedRealtimeInferenceInstanceTypes = [
              "ml.g4dn.xlarge", "ml.m5.xlarge", "ml.m5.large"
            ]
            SupportedTransformInstanceTypes = [
              "ml.g4dn.xlarge", "ml.m5.xlarge"
            ]
          }
          ModelApprovalStatus = "PendingManualApproval"
          MetadataProperties = {
            CommitId       = "ragethesage"
            Repository     = "motorhead2840/Cyberdemon"
            GeneratedBy    = "ragethesage-pipeline"
            ProjectId      = var.project
          }
        }
      },
    ]
  })

  tags = {
    Project     = var.project
    Environment = var.environment
    Purpose     = "secops-pmi-classifier"
    CyberDemonSupport = "true"
  }
}

# ---------------------------------------------------------------------------
# SageMaker Model Package Group — ragethesage registry
# ---------------------------------------------------------------------------

resource "aws_sagemaker_model_package_group" "ragethesage" {
  model_package_group_name        = "ragethesage"
  model_package_group_description = "RageSage PMI classifier model versions — supports Cyberdemon SecOps"

  tags = {
    Project     = var.project
    Environment = var.environment
  }
}

# ---------------------------------------------------------------------------
# SageMaker Model — placeholder backed by ECR image; real model artefacts
# are updated post-pipeline by the approval + deployment Lambda.
# The model_data_url points to the latest artefacts prefix; the pipeline
# populates this path when it registers a new approved version.
# ---------------------------------------------------------------------------

resource "aws_sagemaker_model" "ragethesage" {
  name               = "${var.project}-ragethesage-${var.environment}"
  execution_role_arn = aws_iam_role.ragethesage_pipeline.arn

  primary_container {
    image          = "${aws_ecr_repository.ragethesage.repository_url}:latest"
    model_data_url = "s3://${aws_s3_bucket.secops.bucket}/secops/models/placeholder/model.tar.gz"
    environment = {
      MODEL_TYPE  = "distilbert-pmi-classifier"
      LABEL_HEADS = "profanity,vulgarity,pmi"
    }
  }

  tags = {
    Project     = var.project
    Environment = var.environment
    Note        = "Updated post-approval via deployment Lambda"
  }
}

# ---------------------------------------------------------------------------
# SageMaker Endpoint Config — ragethesage async inference
# ---------------------------------------------------------------------------

resource "aws_sagemaker_endpoint_configuration" "ragethesage" {
  name = "${var.project}-ragethesage-${var.environment}"

  production_variants {
    variant_name           = "primary"
    model_name             = aws_sagemaker_model.ragethesage.name
    initial_instance_count = 1
    instance_type          = "ml.g4dn.xlarge"
    initial_variant_weight = 1.0
  }

  async_inference_config {
    output_config {
      s3_output_path = "s3://${aws_s3_bucket.secops.bucket}/secops/async-inference/"
    }
    client_config {
      max_concurrent_invocations_per_instance = 10
    }
  }

  tags = {
    Project     = var.project
    Environment = var.environment
  }

  depends_on = [aws_sagemaker_model.ragethesage]
}

resource "aws_sagemaker_endpoint" "ragethesage" {
  name                 = "${var.project}-ragethesage-${var.environment}"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.ragethesage.name

  tags = {
    Project           = var.project
    Environment       = var.environment
    CyberDemonSupport = "true"
  }

  depends_on = [aws_sagemaker_endpoint_configuration.ragethesage]
}

# ---------------------------------------------------------------------------
# SSM Parameters — consumed by api-server at runtime
# ---------------------------------------------------------------------------

resource "aws_ssm_parameter" "ragethesage_pipeline_arn" {
  name  = "/${var.project}/${var.environment}/ragethesage/pipeline_arn"
  type  = "String"
  value = aws_sagemaker_pipeline.ragethesage.arn
}

resource "aws_ssm_parameter" "ragethesage_endpoint" {
  name  = "/${var.project}/${var.environment}/ragethesage/endpoint_name"
  type  = "String"
  value = aws_sagemaker_endpoint.ragethesage.name
}

resource "aws_ssm_parameter" "secops_s3_bucket" {
  name  = "/${var.project}/${var.environment}/secops/s3_bucket"
  type  = "String"
  value = aws_s3_bucket.secops.bucket
}

# ---------------------------------------------------------------------------
# EventBridge — weekly scheduled retraining (Sunday 02:00 UTC)
# ---------------------------------------------------------------------------

resource "aws_iam_role" "ragethesage_scheduler" {
  name = "${var.project}-ragethesage-scheduler-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "ragethesage_scheduler_inline" {
  name = "ragethesage-scheduler"
  role = aws_iam_role.ragethesage_scheduler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sagemaker:StartPipelineExecution"
      Resource = aws_sagemaker_pipeline.ragethesage.arn
    }]
  })
}

resource "aws_scheduler_schedule" "ragethesage_weekly" {
  name       = "${var.project}-ragethesage-weekly-${var.environment}"
  group_name = "default"

  flexible_time_window { mode = "OFF" }

  schedule_expression          = "cron(0 2 ? * SUN *)"
  schedule_expression_timezone = "UTC"

  target {
    arn      = aws_sagemaker_pipeline.ragethesage.arn
    role_arn = aws_iam_role.ragethesage_scheduler.arn

    sagemaker_pipeline_parameters {
      pipeline_parameter {
        name  = "TrainingDataDate"
        value = "latest"
      }
      pipeline_parameter {
        name  = "MinF1Threshold"
        value = "0.78"
      }
    }
  }
}

# ---------------------------------------------------------------------------
# CloudWatch Alarms — inference endpoint health
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "ragethesage_5xx" {
  alarm_name          = "${var.project}-ragethesage-5xx-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Invocation5XXErrors"
  namespace           = "AWS/SageMaker"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "RageSage inference endpoint returning 5xx — Cyberdemon SecOps scoring degraded"

  dimensions = {
    EndpointName = aws_sagemaker_endpoint.ragethesage.name
    VariantName  = "primary"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "ragethesage_latency" {
  alarm_name          = "${var.project}-ragethesage-latency-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ModelLatency"
  namespace           = "AWS/SageMaker"
  period              = 60
  extended_statistic  = "p95"
  threshold           = 3000          # 3 s p95
  alarm_description   = "RageSage p95 inference latency > 3s — check endpoint scaling"

  dimensions = {
    EndpointName = aws_sagemaker_endpoint.ragethesage.name
    VariantName  = "primary"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = {
    Project     = var.project
    Environment = var.environment
  }
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------

output "ragethesage_pipeline_arn" {
  description = "RageSage SageMaker pipeline ARN"
  value       = aws_sagemaker_pipeline.ragethesage.arn
}

output "ragethesage_endpoint_name" {
  description = "RageSage real-time inference endpoint name"
  value       = aws_sagemaker_endpoint.ragethesage.name
}

output "secops_s3_bucket" {
  description = "SecOps S3 bucket (training data + model artefacts)"
  value       = aws_s3_bucket.secops.bucket
}

output "ragethesage_ecr_repo" {
  description = "ECR repo URI for the RageSage training container"
  value       = aws_ecr_repository.ragethesage.repository_url
}

output "secops_feature_group" {
  description = "SageMaker Feature Group for SecOps content index"
  value       = aws_sagemaker_feature_group.secops_content_index.feature_group_name
}

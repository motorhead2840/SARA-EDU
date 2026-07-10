# ─── TensorFlow on AWS ────────────────────────────────────────────────────────
#
# Provisions SageMaker Pipelines for automated TensorFlow model training,
# evaluation, and registration. Covers:
#   - SageMaker Pipeline: data prep → TF training → evaluation → conditional register
#   - TensorFlow SageMaker estimator configuration
#   - Model monitoring for live endpoint drift detection
#   - TensorBoard log sink on S3
#   - SageMaker Experiments for experiment tracking
#   - SageMaker Clarify job for bias/explainability reports

# ─── ECR Repository for custom TensorFlow training container ─────────────────

resource "aws_ecr_repository" "tensorflow_training" {
  name                 = "${var.project}/tensorflow-training"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "KMS" }
}

resource "aws_ecr_lifecycle_policy" "tensorflow_training" {
  repository = aws_ecr_repository.tensorflow_training.name
  policy = jsonencode({ rules = [{ rulePriority = 1; description = "Keep 10 images"; selection = { tagStatus = "any"; countType = "imageCountMoreThan"; countNumber = 10 }; action = { type = "expire" } }] })
}

# ─── S3 structure for TF training artefacts ──────────────────────────────────

resource "aws_s3_object" "tf_training_prefix" {
  for_each = toset(["training-data/", "validation-data/", "model-artifacts/", "tensorboard-logs/", "evaluation-reports/", "clarify-output/"])
  bucket   = aws_s3_bucket.sagemaker.id
  key      = "tensorflow/${each.key}.keep"
  content  = ""
}

# ─── SageMaker Pipeline: Shri Tutor — TensorFlow training pipeline ────────────

resource "aws_sagemaker_pipeline" "shri_tutor_tf" {
  pipeline_name         = "${var.project}-${var.environment}-shri-tutor-tf"
  pipeline_display_name = "Shri Tutor TensorFlow Pipeline"
  pipeline_description  = "End-to-end: feature engineering → TF training → eval → register"
  role_arn              = aws_iam_role.sagemaker.arn

  pipeline_definition = jsonencode({
    Version = "2020-12-01"
    Parameters = [
      { Name = "TrainingInstanceType"; Type = "String"; DefaultValue = "ml.p3.2xlarge" },
      { Name = "TrainingEpochs";       Type = "Integer"; DefaultValue = 10 },
      { Name = "BatchSize";            Type = "Integer"; DefaultValue = 32 },
      { Name = "LearningRate";         Type = "Float";   DefaultValue = 0.001 },
      { Name = "ModelApprovalStatus";  Type = "String";  DefaultValue = "PendingManualApproval" },
    ]
    Steps = [
      # Step 1 — Processing: pull features from Feature Store, split train/val/test
      {
        Name = "FeatureEngineering"
        Type = "Processing"
        Arguments = {
          ProcessingResources = {
            ClusterConfig = { InstanceCount = 1; InstanceType = "ml.m5.xlarge"; VolumeSizeInGB = 50 }
          }
          AppSpecification = {
            ImageUri        = "763104351884.dkr.ecr.${var.aws_region}.amazonaws.com/pytorch-training:2.1.0-cpu-py310-ubuntu20.04-sagemaker"
            ContainerEntrypoint = ["python3", "/opt/ml/code/feature_engineering.py"]
          }
          ProcessingInputs = [{
            InputName     = "code"
            S3Input = { S3Uri = "s3://${aws_s3_bucket.sagemaker.id}/tensorflow/processing-scripts/"; LocalPath = "/opt/ml/code"; S3DataType = "S3Prefix"; S3InputMode = "File" }
          }]
          ProcessingOutputs = [
            { OutputName = "train";   S3Output = { S3Uri = "s3://${aws_s3_bucket.sagemaker.id}/tensorflow/training-data/";   LocalPath = "/opt/ml/processing/train";   S3UploadMode = "EndOfJob" } },
            { OutputName = "val";     S3Output = { S3Uri = "s3://${aws_s3_bucket.sagemaker.id}/tensorflow/validation-data/"; LocalPath = "/opt/ml/processing/val";     S3UploadMode = "EndOfJob" } },
          ]
          RoleArn = aws_iam_role.sagemaker.arn
        }
      },
      # Step 2 — Training: TF model on GPU
      {
        Name = "TensorFlowTraining"
        Type = "Training"
        DependsOn = ["FeatureEngineering"]
        Arguments = {
          AlgorithmSpecification = {
            TrainingImage     = "763104351884.dkr.ecr.${var.aws_region}.amazonaws.com/tensorflow-training:2.13.0-gpu-py310-cu118-ubuntu20.04-sagemaker"
            TrainingInputMode = "File"
          }
          HyperParameters = {
            epochs        = { Get = "Parameters.TrainingEpochs" }
            batch_size    = { Get = "Parameters.BatchSize" }
            learning_rate = { Get = "Parameters.LearningRate" }
            model_type    = "\"transformer\""
            output_dir    = "\"/opt/ml/model\""
          }
          InputDataConfig = [
            { ChannelName = "train"; DataSource = { S3DataSource = { S3DataType = "S3Prefix"; S3Uri = { Get = "Steps.FeatureEngineering.ProcessingOutputConfig.Outputs['train'].S3Output.S3Uri" }; S3DataDistributionType = "FullyReplicated" } } },
            { ChannelName = "validation"; DataSource = { S3DataSource = { S3DataType = "S3Prefix"; S3Uri = { Get = "Steps.FeatureEngineering.ProcessingOutputConfig.Outputs['val'].S3Output.S3Uri" }; S3DataDistributionType = "FullyReplicated" } } },
          ]
          OutputDataConfig = { S3OutputPath = "s3://${aws_s3_bucket.sagemaker.id}/tensorflow/model-artifacts/" }
          ResourceConfig = {
            InstanceType   = { Get = "Parameters.TrainingInstanceType" }
            InstanceCount  = 1
            VolumeSizeInGB = 100
          }
          StoppingCondition = { MaxRuntimeInSeconds = 86400 }
          RoleArn = aws_iam_role.sagemaker.arn
          CheckpointConfig = { S3Uri = "s3://${aws_s3_bucket.sagemaker.id}/tensorflow/checkpoints/" }
          DebugHookConfig = {
            S3OutputPath = "s3://${aws_s3_bucket.sagemaker.id}/tensorflow/debug-output/"
            CollectionConfigurations = [
              { CollectionName = "gradients"; CollectionParameters = { save_interval = "100" } },
              { CollectionName = "weights";   CollectionParameters = { save_interval = "500" } },
            ]
          }
          TensorBoardOutputConfig = { S3OutputPath = "s3://${aws_s3_bucket.sagemaker.id}/tensorflow/tensorboard-logs/" }
        }
      },
      # Step 3 — Evaluation
      {
        Name = "ModelEvaluation"
        Type = "Processing"
        DependsOn = ["TensorFlowTraining"]
        Arguments = {
          ProcessingResources = { ClusterConfig = { InstanceCount = 1; InstanceType = "ml.m5.large"; VolumeSizeInGB = 30 } }
          AppSpecification = {
            ImageUri = "763104351884.dkr.ecr.${var.aws_region}.amazonaws.com/tensorflow-inference:2.13.0-cpu-py310-ubuntu20.04-sagemaker"
            ContainerEntrypoint = ["python3", "/opt/ml/code/evaluate.py"]
          }
          ProcessingInputs = [
            { InputName = "model"; S3Input = { S3Uri = { Get = "Steps.TensorFlowTraining.ModelArtifacts.S3ModelArtifacts" }; LocalPath = "/opt/ml/model"; S3DataType = "S3Prefix"; S3InputMode = "File" } },
          ]
          ProcessingOutputs = [{ OutputName = "evaluation"; S3Output = { S3Uri = "s3://${aws_s3_bucket.sagemaker.id}/tensorflow/evaluation-reports/"; LocalPath = "/opt/ml/processing/evaluation"; S3UploadMode = "EndOfJob" } }]
          RoleArn = aws_iam_role.sagemaker.arn
        }
        PropertyFiles = [{ PropertyFileName = "EvaluationReport"; OutputName = "evaluation"; FilePath = "evaluation.json" }]
      },
      # Step 4 — Conditional registration: only if accuracy > 0.85
      {
        Name = "CheckAccuracy"
        Type = "Condition"
        DependsOn = ["ModelEvaluation"]
        Arguments = {
          Conditions = [{ Type = "GreaterThan"; LeftValue = { Std = { PropertyFile = { PropertyFileName = "EvaluationReport"; PropertyJsonPath = "accuracy" } } }; RightValue = 0.85 }]
          IfSteps = [{
            Name = "RegisterModel"
            Type = "RegisterModel"
            Arguments = {
              ModelPackageGroupName = aws_sagemaker_model_package_group.shri_tutor.name
              ModelApprovalStatus   = { Get = "Parameters.ModelApprovalStatus" }
              InferenceSpecification = {
                Containers = [{ Image = "763104351884.dkr.ecr.${var.aws_region}.amazonaws.com/tensorflow-inference:2.13.0-cpu-py310-ubuntu20.04-sagemaker"; ModelDataUrl = { Get = "Steps.TensorFlowTraining.ModelArtifacts.S3ModelArtifacts" } }]
                SupportedContentTypes = ["application/json"]
                SupportedResponseMIMETypes = ["application/json"]
              }
            }
          }]
        }
      },
    ]
  })
}

# ─── TensorBoard access via CloudWatch (alternative to running TB server) ─────

resource "aws_cloudwatch_log_group" "tensorboard" {
  name              = "/sagemaker/${var.project}/${var.environment}/tensorboard"
  retention_in_days = 30
}

# ─── SageMaker Model Monitor — drift detection on live endpoint ───────────────

resource "aws_sagemaker_data_quality_job_definition" "churn_monitor" {
  name     = "${var.project}-${var.environment}-churn-monitor"
  role_arn = aws_iam_role.sagemaker.arn

  data_quality_app_specification {
    image_uri = "156813124566.dkr.ecr.${var.aws_region}.amazonaws.com/sagemaker-model-monitor-analyzer"
  }

  data_quality_job_input {
    endpoint_input {
      endpoint_name     = "${var.project}-${var.environment}-churn-predictor"
      local_path        = "/opt/ml/processing/input/endpoint"
      s3_data_distribution_type = "FullyReplicated"
    }
  }

  data_quality_job_output_config {
    monitoring_outputs {
      s3_output {
        s3_uri        = "s3://${aws_s3_bucket.sagemaker.id}/monitoring/churn-monitor/"
        local_path    = "/opt/ml/processing/output"
        s3_upload_mode = "EndOfJob"
      }
    }
  }

  job_resources {
    cluster_config {
      instance_count    = 1
      instance_type     = "ml.m5.large"
      volume_size_in_gb = 20
    }
  }

  stopping_condition { max_runtime_in_seconds = 3600 }
}

# ─── SageMaker Clarify — bias & explainability ────────────────────────────────

resource "aws_sagemaker_model_explainability_job_definition" "shri_explainability" {
  name     = "${var.project}-${var.environment}-shri-explainability"
  role_arn = aws_iam_role.sagemaker.arn

  model_explainability_app_specification {
    image_uri = "205585389593.dkr.ecr.${var.aws_region}.amazonaws.com/sagemaker-clarify-processing"
    config_uri = "s3://${aws_s3_bucket.sagemaker.id}/clarify/shap_config.json"
  }

  model_explainability_job_input {
    endpoint_input {
      endpoint_name = "${var.project}-${var.environment}-churn-predictor"
      local_path    = "/opt/ml/processing/input/endpoint"
    }
  }

  model_explainability_job_output_config {
    monitoring_outputs {
      s3_output {
        s3_uri     = "s3://${aws_s3_bucket.sagemaker.id}/tensorflow/clarify-output/"
        local_path = "/opt/ml/processing/output"
      }
    }
  }

  job_resources {
    cluster_config { instance_count = 1; instance_type = "ml.m5.large"; volume_size_in_gb = 20 }
  }
}

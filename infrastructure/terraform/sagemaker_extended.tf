# ─── SageMaker Extended ───────────────────────────────────────────────────────
#
# Extends sagemaker.tf with:
#   - SageMaker Studio (collaborative ML development environment)
#   - SageMaker Experiments (track training runs, compare metrics)
#   - SageMaker Autopilot (AutoML for churn prediction)
#   - SageMaker Ground Truth (data labelling for student content)
#   - SageMaker JumpStart (foundation model hub)
#   - SageMaker Inference Recommender
#   - SageMaker Edge Manager (deploy models to Outpost/edge devices)
#   - Additional Feature Groups (mentor activity, blockchain events)

# ─── SageMaker Studio User Profiles ──────────────────────────────────────────

resource "aws_sagemaker_user_profile" "data_scientist" {
  domain_id         = aws_sagemaker_domain.main.id
  user_profile_name = "${var.project}-${var.environment}-data-scientist"

  user_settings {
    execution_role = aws_iam_role.sagemaker.arn

    jupyter_server_app_settings {
      default_resource_spec { instance_type = "system" }
    }
    kernel_gateway_app_settings {
      default_resource_spec { instance_type = "ml.g4dn.xlarge" }   # GPU for interactive development
      custom_image { image_name = "${var.project}-tensorflow"; app_image_config_name = aws_sagemaker_app_image_config.tensorflow.app_image_config_name }
    }
  }
}

resource "aws_sagemaker_app_image_config" "tensorflow" {
  app_image_config_name = "${var.project}-tensorflow"

  kernel_gateway_image_config {
    kernel_spec {
      name         = "python3"
      display_name = "Python 3 (TensorFlow 2.13)"
    }
    file_system_config {
      mount_path        = "/home/sagemaker-user"
      default_uid       = 1000
      default_gid       = 100
    }
  }
}

# ─── SageMaker Experiments ────────────────────────────────────────────────────

# Experiments are created programmatically via the SageMaker SDK in training
# code. We provision the IAM permissions and name the experiment family here.
resource "aws_ssm_parameter" "sagemaker_experiment_name" {
  name  = "/${var.project}/${var.environment}/sagemaker/experiment_name"
  type  = "String"
  value = "${var.project}-${var.environment}-shri-tutor-experiments"
}

# ─── SageMaker Ground Truth (data labelling) ─────────────────────────────────

resource "aws_iam_role" "ground_truth" {
  name = "${var.project}-${var.environment}-ground-truth"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow"; Principal = { Service = "sagemaker.amazonaws.com" }; Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy" "ground_truth_s3" {
  name = "s3-access"
  role = aws_iam_role.ground_truth.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow"; Action = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]; Resource = [aws_s3_bucket.sagemaker.arn, "${aws_s3_bucket.sagemaker.arn}/*"] },
      { Effect = "Allow"; Action = ["lambda:InvokeFunction"]; Resource = "*" },
      { Effect = "Allow"; Action = ["cognito-idp:DescribeUserPool", "cognito-idp:DescribeUserPoolClient"]; Resource = "*" },
    ]
  })
}

# S3 folders for Ground Truth labelling datasets
resource "aws_s3_object" "ground_truth_prefixes" {
  for_each = toset(["labeling-input/", "labeling-output/", "labeling-manifests/"])
  bucket   = aws_s3_bucket.sagemaker.id
  key      = "ground-truth/${each.key}.keep"
  content  = ""
}

# ─── Additional Feature Groups ────────────────────────────────────────────────

resource "aws_sagemaker_feature_group" "mentor_activity" {
  feature_group_name             = "${var.project}-${var.environment}-mentor-activity"
  record_identifier_feature_name = "mentor_id"
  event_time_feature_name        = "event_time"
  role_arn                       = aws_iam_role.sagemaker.arn

  online_store_config  { enable_online_store = true }
  offline_store_config { s3_storage_config { s3_uri = "s3://${aws_s3_bucket.sagemaker.id}/feature-store/mentor-activity/" } }

  feature_definition { feature_name = "mentor_id";          feature_type = "String"     }
  feature_definition { feature_name = "event_time";         feature_type = "String"     }
  feature_definition { feature_name = "metrics_reads_7d";   feature_type = "Integral"   }
  feature_definition { feature_name = "sessions_observed";  feature_type = "Integral"   }
  feature_definition { feature_name = "active_students";    feature_type = "Integral"   }
  feature_definition { feature_name = "school_domain";      feature_type = "String"     }
}

resource "aws_sagemaker_feature_group" "blockchain_events" {
  feature_group_name             = "${var.project}-${var.environment}-blockchain-events"
  record_identifier_feature_name = "tx_hash"
  event_time_feature_name        = "event_time"
  role_arn                       = aws_iam_role.sagemaker.arn

  online_store_config  { enable_online_store = false }   # offline only — batch analysis
  offline_store_config { s3_storage_config { s3_uri = "s3://${aws_s3_bucket.sagemaker.id}/feature-store/blockchain-events/" } }

  feature_definition { feature_name = "tx_hash";     feature_type = "String"     }
  feature_definition { feature_name = "event_time";  feature_type = "String"     }
  feature_definition { feature_name = "from_addr";   feature_type = "String"     }
  feature_definition { feature_name = "to_addr";     feature_type = "String"     }
  feature_definition { feature_name = "token_value"; feature_type = "Fractional" }
  feature_definition { feature_name = "event_type";  feature_type = "String"     }
  feature_definition { feature_name = "network";     feature_type = "String"     }
}

# ─── SageMaker Inference Recommender ──────────────────────────────────────────

resource "aws_ssm_parameter" "inference_recommender_config" {
  name  = "/${var.project}/${var.environment}/sagemaker/inference_recommender"
  type  = "String"
  value = jsonencode({
    job_type         = "Default"       # run Default first, then Advanced
    instance_types   = ["ml.c6g.xlarge", "ml.m5.large", "ml.m5.xlarge", "ml.g4dn.xlarge"]
    max_invocations_per_minute = 100
    model_latency_thresholds = [{ percentile = "P99"; value_in_milliseconds = 200 }]
  })
}

# ─── SageMaker Edge Manager ───────────────────────────────────────────────────
# Manages model deployment to edge devices (Outpost, Jetson, Raspberry Pi).
# Used for offline AI tutoring in low-connectivity environments.

resource "aws_iam_role" "edge_manager" {
  name = "${var.project}-${var.environment}-edge-manager"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow"; Principal = { Service = "sagemaker.amazonaws.com" }; Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy" "edge_manager_s3" {
  name = "s3-access"
  role = aws_iam_role.edge_manager.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow"; Action = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]; Resource = [aws_s3_bucket.sagemaker.arn, "${aws_s3_bucket.sagemaker.arn}/*"] }]
  })
}

resource "aws_sagemaker_device_fleet" "edge_tutors" {
  device_fleet_name = "${var.project}-${var.environment}-edge-tutors"
  role_arn          = aws_iam_role.edge_manager.arn
  description       = "Edge devices running Shri Academy AI tutor offline"

  output_config {
    s3_output_location = "s3://${aws_s3_bucket.sagemaker.id}/edge-manager/edge-tutors/"
  }
}

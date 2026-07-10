# ─── SageMaker ────────────────────────────────────────────────────────────────

resource "aws_sagemaker_domain" "main" {
  domain_name = "${var.project}-${var.environment}"
  auth_mode   = "IAM"
  vpc_id      = aws_vpc.main.id
  subnet_ids  = aws_subnet.private[*].id

  default_user_settings {
    execution_role = aws_iam_role.sagemaker.arn

    jupyter_server_app_settings {
      default_resource_spec {
        instance_type       = "system"
        sagemaker_image_arn = data.aws_sagemaker_prebuilt_ecr_image.datascience.registry_path
      }
    }

    kernel_gateway_app_settings {
      default_resource_spec {
        instance_type = "ml.t3.medium"
      }
    }

    security_groups = [aws_security_group.ecs.id]
  }

  domain_settings {
    security_group_ids = [aws_security_group.ecs.id]
  }
}

data "aws_sagemaker_prebuilt_ecr_image" "datascience" {
  repository_name = "sagemaker-data-science-310-v1"
}

# Feature Group — student engagement features for ML
resource "aws_sagemaker_feature_group" "student_engagement" {
  feature_group_name             = "${var.project}-${var.environment}-student-engagement"
  record_identifier_feature_name = "student_id"
  event_time_feature_name        = "event_time"
  role_arn                       = aws_iam_role.sagemaker.arn

  online_store_config  { enable_online_store = true }
  offline_store_config {
    s3_storage_config { s3_uri = "s3://${aws_s3_bucket.sagemaker.id}/feature-store/student-engagement/" }
    disable_glue_table_creation = false
  }

  feature_definition { feature_name = "student_id";          feature_type = "String"     }
  feature_definition { feature_name = "event_time";          feature_type = "String"     }
  feature_definition { feature_name = "session_count_7d";    feature_type = "Integral"   }
  feature_definition { feature_name = "avg_session_length";  feature_type = "Fractional" }
  feature_definition { feature_name = "frustration_avg";     feature_type = "Fractional" }
  feature_definition { feature_name = "circuit_a_ratio";     feature_type = "Fractional" }
  feature_definition { feature_name = "subscription_tier";   feature_type = "String"     }
  feature_definition { feature_name = "is_subscribed";       feature_type = "Integral"   }
  feature_definition { feature_name = "country_tier";        feature_type = "String"     }
  feature_definition { feature_name = "churn_risk_score";    feature_type = "Fractional" }
}

# Model package group for Shri tutoring model versioning
resource "aws_sagemaker_model_package_group" "shri_tutor" {
  model_package_group_name        = "${var.project}-${var.environment}-shri-tutor"
  model_package_group_description = "Shri Academy AI tutor model versions"
}

# Endpoint configuration for real-time inference
resource "aws_sagemaker_endpoint_config" "churn_predictor" {
  name = "${var.project}-${var.environment}-churn-predictor"

  production_variants {
    variant_name           = "primary"
    model_name             = "${var.project}-${var.environment}-churn-model"
    initial_instance_count = 1
    instance_type          = "ml.t2.medium"
    initial_variant_weight = 1.0
  }

  data_capture_config {
    enable_capture              = true
    initial_sampling_percentage = 20
    destination_s3_uri          = "s3://${aws_s3_bucket.sagemaker.id}/data-capture/"
    capture_options { capture_mode = "Input" }
    capture_options { capture_mode = "Output" }
  }
}

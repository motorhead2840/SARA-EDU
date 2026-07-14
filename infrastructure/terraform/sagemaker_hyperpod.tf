# ─── SageMaker HyperPod & Studio Infrastructure Configuration ────────────────
#
# Provisioning an always-on, resilient GPU cluster specifically optimized for 
# high-speed networking and large-scale distributed training of the Shri-Ma-Saraswathi model.
# Integrates with Slurm/EKS and connects securely to Confluent Cloud.

data "aws_caller_identity" "current" {}

resource "aws_sagemaker_cluster" "shri_saraswathi_hyperpod" {
  cluster_name = "${var.project}-${var.environment}-saraswathi-hyperpod"

  instance_groups {
    instance_count      = 2
    instance_group_name = "gpu-training-group"
    instance_type       = "ml.g5.24xlarge" # Or ml.p4d.24xlarge
    execution_role      = aws_iam_role.sagemaker.arn

    threads_per_core = 2

    orchestrator {
      eks {
        cluster_arn = var.eks_cluster_arn
      }
    }
  }

  vpc_config {
    security_group_ids = [aws_security_group.hyperpod_sg.id]
    subnets            = aws_subnet.private[*].id
  }

  tags = {
    Project      = var.project
    Environment  = var.environment
    ModelPhase   = "Shri-Ma-Saraswathi"
    Orchestrator = "EKS-Slurm"
  }
}

# ─── Security Group for SageMaker HyperPod ──────────────────────────────────
resource "aws_security_group" "hyperpod_sg" {
  name        = "${var.project}-${var.environment}-hyperpod-sg"
  description = "Security group for SageMaker HyperPod cluster"
  vpc_id      = aws_vpc.main.id

  # High-speed cluster inner communication (All traffic within SG)
  ingress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"
    self      = true
  }

  # Inbound from SageMaker Studio & ECS
  ingress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    security_groups = [aws_security_group.ecs.id]
  }

  # Outbound to all (including Confluent Cloud PrivateLink, S3, etc.)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project}-${var.environment}-hyperpod-sg"
    Environment = var.environment
  }
}

# ─── Confluent Cloud PrivateLink Integration ────────────────────────────────
# Configures secure connectivity to Confluent Cloud in us-east-1, bypassing the public internet.

resource "aws_vpc_endpoint" "confluent_privatelink" {
  vpc_id              = aws_vpc.main.id
  service_name        = var.confluent_privatelink_service_name
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.hyperpod_sg.id]
  private_dns_enabled = true

  tags = {
    Name        = "${var.project}-${var.environment}-confluent-privatelink"
    Environment = var.environment
  }
}

# ─── SageMaker Studio Integration with HyperPod ─────────────────────────────
# Attach HyperPod resource settings to the SageMaker Studio Domain via default settings or user profile.

data "aws_sagemaker_prebuilt_ecr_image" "hyperpod_datascience" {
  repository_name = "sagemaker-data-science-310-v1"
}

resource "aws_sagemaker_user_profile" "hyperpod_developer" {
  domain_id         = aws_sagemaker_domain.main.id
  user_profile_name = "${var.project}-${var.environment}-hyperpod-dev"

  user_settings {
    execution_role = aws_iam_role.sagemaker.arn

    jupyter_server_app_settings {
      default_resource_spec {
        instance_type       = "system"
        sagemaker_image_arn = data.aws_sagemaker_prebuilt_ecr_image.hyperpod_datascience.registry_path
      }
    }

    kernel_gateway_app_settings {
      default_resource_spec {
        instance_type = "ml.g5.24xlarge" # Match HyperPod node size for interactive testing
      }
    }
  }
}

# ─── AWS Deep Learning AMIs + GPU Compute ─────────────────────────────────────
#
# Provisions:
#   - Latest Deep Learning AMI (Ubuntu 22.04) via SSM parameter lookup
#   - Launch templates for GPU training (p3/g4dn) and inference (g4dn)
#   - Auto Scaling Group for on-demand GPU workers
#   - Spot Fleet for cost-optimised batch training
#   - Key pair for SSH access (public key must be provided in tfvars)
#   - EFS shared filesystem for training data across GPU instances

# ─── Deep Learning AMI (latest via SSM) ──────────────────────────────────────

data "aws_ssm_parameter" "deep_learning_ami_ubuntu" {
  name = "/aws/service/deeplearning/ami/x86_64/base-oss-neuron-ubuntu22.04-latest"
}

data "aws_ssm_parameter" "deep_learning_ami_pytorch" {
  name = "/aws/service/deeplearning/ami/x86_64/pytorch-2.1-neuron-ubuntu22.04-latest"
}

data "aws_ssm_parameter" "deep_learning_ami_tensorflow" {
  name = "/aws/service/deeplearning/ami/x86_64/tensorflow-2.15-neuron-ubuntu22.04-latest"
}

# ─── Security Group for GPU instances ────────────────────────────────────────

resource "aws_security_group" "gpu" {
  name        = "${var.project}-${var.environment}-gpu-sg"
  description = "GPU compute instances for deep learning training"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH from within VPC (bastion)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
  ingress {
    description = "Jupyter notebook (internal only)"
    from_port   = 8888
    to_port     = 8888
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
  ingress {
    description = "TensorBoard"
    from_port   = 6006
    to_port     = 6006
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.project}-gpu-sg" }
}

# ─── EFS shared filesystem for training datasets ──────────────────────────────

resource "aws_efs_file_system" "training_data" {
  creation_token   = "${var.project}-${var.environment}-training-data"
  performance_mode = "maxIO"
  throughput_mode  = "bursting"
  encrypted        = true

  lifecycle_policy { transition_to_ia = "AFTER_7_DAYS" }
  tags = { Name = "${var.project}-training-data" }
}

resource "aws_efs_mount_target" "training_data" {
  count           = length(var.availability_zones)
  file_system_id  = aws_efs_file_system.training_data.id
  subnet_id       = aws_subnet.private[count.index].id
  security_groups = [aws_security_group.gpu.id]
}

# ─── IAM Instance Profile for GPU instances ───────────────────────────────────

resource "aws_iam_role" "gpu_instance" {
  name = "${var.project}-${var.environment}-gpu-instance"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow"; Principal = { Service = "ec2.amazonaws.com" }; Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy_attachment" "gpu_ssm" {
  role       = aws_iam_role.gpu_instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "gpu_instance_permissions" {
  name = "gpu-permissions"
  role = aws_iam_role.gpu_instance.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow"; Action = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]; Resource = [aws_s3_bucket.sagemaker.arn, "${aws_s3_bucket.sagemaker.arn}/*"] },
      { Effect = "Allow"; Action = ["sagemaker:PutRecord", "sagemaker:GetRecord"]; Resource = "*" },
      { Effect = "Allow"; Action = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]; Resource = "*" },
      { Effect = "Allow"; Action = ["ecr:GetAuthorizationToken", "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"]; Resource = "*" },
      # Confluent Cloud — no MSK IAM needed; auth is SASL/PLAIN via Secrets Manager credentials
      { Effect = "Allow"; Action = ["secretsmanager:GetSecretValue"]; Resource = "arn:aws:secretsmanager:${var.aws_region}:*:secret:${var.project}/${var.environment}/confluent/*" },
    ]
  })
}

resource "aws_iam_instance_profile" "gpu" {
  name = "${var.project}-${var.environment}-gpu"
  role = aws_iam_role.gpu_instance.name
}

# ─── Launch Template — GPU Training (p3.2xlarge: 8 vCPU, 61 GB, Tesla V100) ──

resource "aws_launch_template" "gpu_training" {
  name_prefix   = "${var.project}-${var.environment}-gpu-training-"
  image_id      = data.aws_ssm_parameter.deep_learning_ami_tensorflow.value
  instance_type = "p3.2xlarge"

  iam_instance_profile { arn = aws_iam_instance_profile.gpu.arn }

  vpc_security_group_ids = [aws_security_group.gpu.id]

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_size           = 500
      volume_type           = "gp3"
      throughput            = 1000
      iops                  = 4000
      encrypted             = true
      delete_on_termination = true
    }
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -ex

    # Mount EFS training data volume
    apt-get install -y amazon-efs-utils
    mkdir -p /mnt/training-data
    echo "${aws_efs_file_system.training_data.id}:/ /mnt/training-data efs _netdev,tls 0 0" >> /etc/fstab
    mount -a || true

    # Configure AWS region
    aws configure set region ${var.aws_region}

    # Install additional Python packages
    pip install --upgrade \
      tensorflow-gpu \
      keras \
      transformers \
      datasets \
      accelerate \
      tensorboard \
      kafka-python \
      boto3 \
      opensearch-py

    # Start CloudWatch agent
    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
      -a fetch-config -m ec2 -s -c ssm:/${var.project}/${var.environment}/cloudwatch-config || true

    echo "Deep Learning AMI ready on $(date)" >> /var/log/user-data.log
  EOF
  )

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  monitoring { enabled = true }

  tag_specifications {
    resource_type = "instance"
    tags = { Name = "${var.project}-gpu-training", Role = "training" }
  }

  lifecycle { create_before_destroy = true }
}

# ─── Launch Template — GPU Inference (g4dn.xlarge: 4 vCPU, 16 GB, T4) ────────

resource "aws_launch_template" "gpu_inference" {
  name_prefix   = "${var.project}-${var.environment}-gpu-inference-"
  image_id      = data.aws_ssm_parameter.deep_learning_ami_pytorch.value
  instance_type = "g4dn.xlarge"

  iam_instance_profile { arn = aws_iam_instance_profile.gpu.arn }
  vpc_security_group_ids = [aws_security_group.gpu.id]

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs { volume_size = 200; volume_type = "gp3"; encrypted = true; delete_on_termination = true }
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
    pip install transformers sentence-transformers fastapi uvicorn boto3
    echo "Inference instance ready" >> /var/log/user-data.log
  EOF
  )

  metadata_options { http_tokens = "required" }
  monitoring { enabled = true }

  tag_specifications {
    resource_type = "instance"
    tags = { Name = "${var.project}-gpu-inference", Role = "inference" }
  }
}

# ─── Auto Scaling Group — GPU Training ───────────────────────────────────────

resource "aws_autoscaling_group" "gpu_training" {
  name                = "${var.project}-${var.environment}-gpu-training"
  min_size            = 0
  max_size            = 4
  desired_capacity    = 0   # scaled up programmatically by Airflow/SageMaker
  vpc_zone_identifier = aws_subnet.private[*].id

  launch_template {
    id      = aws_launch_template.gpu_training.id
    version = "$Latest"
  }

  instance_refresh { strategy = "Rolling"; preferences { min_healthy_percentage = 50 } }

  tag {
    key                 = "Name"
    value               = "${var.project}-gpu-training"
    propagate_at_launch = true
  }
}

# ─── Spot Fleet — cost-optimised training runs ────────────────────────────────

resource "aws_spot_fleet_request" "training" {
  iam_fleet_role                      = aws_iam_role.spot_fleet.arn
  target_capacity                     = 0          # scale up for training runs
  allocation_strategy                 = "diversified"
  terminate_instances_with_expiration = true
  valid_until                         = "2027-01-01T00:00:00Z"

  launch_template_config {
    launch_template_specification {
      id      = aws_launch_template.gpu_training.id
      version = "$Latest"
    }
    overrides { instance_type = "p3.2xlarge"; subnet_id = aws_subnet.private[0].id }
    overrides { instance_type = "p3.8xlarge"; subnet_id = aws_subnet.private[1].id }
    overrides { instance_type = "g5.2xlarge"; subnet_id = aws_subnet.private[2].id }
  }
}

resource "aws_iam_role" "spot_fleet" {
  name = "${var.project}-${var.environment}-spot-fleet"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow"; Principal = { Service = "spotfleet.amazonaws.com" }; Action = "sts:AssumeRole" }]
  })
}
resource "aws_iam_role_policy_attachment" "spot_fleet" {
  role       = aws_iam_role.spot_fleet.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2SpotFleetTaggingRole"
}

# ─── AWS Batch for bulk training jobs ─────────────────────────────────────────

resource "aws_batch_compute_environment" "gpu" {
  compute_environment_name = "${var.project}-${var.environment}-gpu"
  type                     = "MANAGED"
  state                    = "ENABLED"
  service_role             = aws_iam_role.batch_service.arn

  compute_resources {
    type               = "SPOT"
    bid_percentage     = 60
    min_vcpus          = 0
    max_vcpus          = 64
    desired_vcpus      = 0
    instance_type      = ["p3.2xlarge", "p3.8xlarge", "g4dn.xlarge", "g4dn.4xlarge"]
    subnets            = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.gpu.id]
    instance_role      = aws_iam_instance_profile.gpu.arn

    spot_iam_fleet_role = aws_iam_role.spot_fleet.arn

    launch_template {
      launch_template_id = aws_launch_template.gpu_training.id
      version            = "$Latest"
    }
  }
}

resource "aws_batch_job_queue" "gpu_training" {
  name                 = "${var.project}-${var.environment}-gpu-training"
  state                = "ENABLED"
  priority             = 1
  compute_environments = [aws_batch_compute_environment.gpu.arn]
}

resource "aws_batch_job_definition" "tensorflow_train" {
  name = "${var.project}-${var.environment}-tensorflow-train"
  type = "container"

  container_properties = jsonencode({
    image   = "${aws_ecr_repository.shri_api.repository_url}:latest"
    vcpus   = 8
    memory  = 61440
    jobRoleArn = aws_iam_role.gpu_instance.arn
    environment = [
      { name = "AWS_REGION";          value = var.aws_region },
      { name = "S3_SAGEMAKER_BUCKET"; value = aws_s3_bucket.sagemaker.id },
      { name = "KAFKA_BOOTSTRAP";          value = aws_ssm_parameter.confluent_bootstrap.value },
      { name = "CONFLUENT_SECRET_NAME";    value = aws_secretsmanager_secret.confluent_app.name },
    ]
    mountPoints = [{ containerPath = "/mnt/training-data"; readOnly = false; sourceVolume = "efs" }]
    volumes     = [{ name = "efs"; host = { sourcePath = "/mnt/training-data" } }]
    resourceRequirements = [{ type = "GPU"; value = "1" }]
    logConfiguration = {
      logDriver = "awslogs"
      options = { awslogs-group = "/batch/${var.project}/tensorflow-train"; awslogs-region = var.aws_region }
    }
  })
}

resource "aws_iam_role" "batch_service" {
  name = "${var.project}-${var.environment}-batch-service"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow"; Principal = { Service = "batch.amazonaws.com" }; Action = "sts:AssumeRole" }]
  })
}
resource "aws_iam_role_policy_attachment" "batch_service" {
  role       = aws_iam_role.batch_service.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBatchServiceRole"
}

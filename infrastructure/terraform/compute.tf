# ─── Compute ──────────────────────────────────────────────────────────────────
#
# General-purpose EC2 compute that complements ECS Fargate:
#   - Bastion host (SSM Session Manager preferred — this is a fallback)
#   - EC2 Image Builder pipeline for custom AMIs (baked with project tools)
#   - AWS Nitro Enclaves for confidential computing (sensitive data processing)
#   - Graviton3 ARM instances for cost-optimised background workers
#   - EC2 Auto Scaling for variable-load batch workers
#   - AWS Compute Optimizer (auto-rightsizing recommendations)
#   - Transit Gateway for multi-VPC networking (future multi-region)
#   - AWS Global Accelerator (low-latency global routing)

# ─── EC2 Image Builder — custom AMI pipeline ─────────────────────────────────

resource "aws_imagebuilder_infrastructure_configuration" "main" {
  name                          = "${var.project}-${var.environment}-image-builder"
  instance_types                = ["t3.medium"]
  subnet_id                     = aws_subnet.private[0].id
  security_group_ids            = [aws_security_group.ecs.id]
  instance_profile_name         = aws_iam_instance_profile.image_builder.name
  terminate_instance_on_failure = true

  logging {
    s3_logs {
      s3_bucket_name = aws_s3_bucket.assets.id
      s3_key_prefix  = "image-builder-logs/"
    }
  }
}

resource "aws_imagebuilder_component" "platform_tools" {
  name     = "${var.project}-platform-tools"
  platform = "Linux"
  version  = "1.0.0"

  data = yamlencode({
    schemaVersion = "1.0"
    phases = [{
      name = "build"
      steps = [
        { name = "InstallDeps"; action = "ExecuteBash"; inputs = { commands = [
          "yum update -y",
          "curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -",
          "yum install -y nodejs python3.12 git amazon-cloudwatch-agent",
          "pip3 install --upgrade pip boto3 kafka-python opensearch-py",
          "curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o awscliv2.zip && unzip awscliv2.zip && ./aws/install",
        ]}}
      ]
    }]
  })
}

data "aws_ssm_parameter" "al2023_ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

resource "aws_imagebuilder_image_recipe" "platform" {
  name         = "${var.project}-${var.environment}-platform"
  version      = "1.0.0"
  parent_image = "arn:aws:imagebuilder:${var.aws_region}:aws:image/amazon-linux-2023-x86-latest/x.x.x"
  # NOTE: The above canonical ARN resolves to the latest AL2023 x86 image;
  # Image Builder resolves the wildcard version at build time. This is the
  # correct format per AWS docs (not a resolvable AMI ID).
  # Ref: https://docs.aws.amazon.com/imagebuilder/latest/userguide/start-build-image-pipeline.html

  component {
    component_arn = aws_imagebuilder_component.platform_tools.arn
  }

  block_device_mapping {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 50
      volume_type           = "gp3"
      delete_on_termination = true
      encrypted             = true
    }
  }
}

resource "aws_imagebuilder_image_pipeline" "platform" {
  name                             = "${var.project}-${var.environment}-platform"
  image_recipe_arn                 = aws_imagebuilder_image_recipe.platform.arn
  infrastructure_configuration_arn = aws_imagebuilder_infrastructure_configuration.main.arn
  description                      = "Builds custom SRI Platform AMI weekly"

  schedule {
    schedule_expression                = "cron(0 2 ? * SUN *)"  # Sunday 2am UTC
    pipeline_execution_start_condition = "EXPRESSION_MATCH_ONLY"
  }

  image_tests_configuration { image_tests_enabled = true; timeout_minutes = 60 }
}

resource "aws_iam_role" "image_builder" {
  name = "${var.project}-${var.environment}-image-builder"
  assume_role_policy = jsonencode({ Version = "2012-10-17"; Statement = [{ Effect = "Allow"; Principal = { Service = "ec2.amazonaws.com" }; Action = "sts:AssumeRole" }] })
}
resource "aws_iam_role_policy_attachment" "image_builder" {
  for_each   = toset(["arn:aws:iam::aws:policy/EC2InstanceProfileForImageBuilder", "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"])
  role       = aws_iam_role.image_builder.name
  policy_arn = each.key
}
resource "aws_iam_instance_profile" "image_builder" {
  name = "${var.project}-${var.environment}-image-builder"
  role = aws_iam_role.image_builder.name
}

# ─── Graviton3 ARM — cost-optimised background workers ───────────────────────

# Latest AL2023 ARM64 AMI (Graviton-compatible) — separate from the x86 DL AMI
data "aws_ssm_parameter" "al2023_ami_arm64" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

resource "aws_launch_template" "arm_worker" {
  name_prefix   = "${var.project}-${var.environment}-arm-worker-"
  image_id      = data.aws_ssm_parameter.al2023_ami_arm64.value  # ARM64 AMI — matches m7g/m6g instances
  instance_type = "m7g.xlarge"   # Graviton3: 4 vCPU, 16 GB, ~40% cheaper than x86

  iam_instance_profile { arn = aws_iam_instance_profile.gpu.arn }
  vpc_security_group_ids = [aws_security_group.ecs.id]

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs { volume_size = 100; volume_type = "gp3"; encrypted = true; delete_on_termination = true }
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo ECS_CLUSTER=${aws_ecs_cluster.main.name} >> /etc/ecs/ecs.config
    echo ECS_ENABLE_CONTAINER_METADATA=true >> /etc/ecs/ecs.config
  EOF
  )

  metadata_options { http_tokens = "required" }
  tag_specifications {
    resource_type = "instance"
    tags = { Name = "${var.project}-arm-worker", Arch = "arm64" }
  }
}

resource "aws_autoscaling_group" "arm_workers" {
  name                = "${var.project}-${var.environment}-arm-workers"
  min_size            = 0
  max_size            = 20
  desired_capacity    = 2
  vpc_zone_identifier = aws_subnet.private[*].id

  mixed_instances_policy {
    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.arm_worker.id
        version            = "$Latest"
      }
      override { instance_type = "m7g.xlarge" }
      override { instance_type = "m7g.2xlarge" }
      override { instance_type = "m6g.xlarge" }
    }
    instances_distribution {
      on_demand_base_capacity                  = 1
      on_demand_percentage_above_base_capacity = 20
      spot_allocation_strategy                 = "price-capacity-optimized"
    }
  }

  tag { key = "Name"; value = "${var.project}-arm-worker"; propagate_at_launch = true }
}

# ─── AWS Global Accelerator ───────────────────────────────────────────────────

resource "aws_globalaccelerator_accelerator" "main" {
  name            = "${var.project}-${var.environment}"
  ip_address_type = "IPV4"
  enabled         = true

  attributes {
    flow_logs_enabled   = true
    flow_logs_s3_bucket = aws_s3_bucket.assets.id
    flow_logs_s3_prefix = "global-accelerator-logs/"
  }
}

resource "aws_globalaccelerator_listener" "https" {
  accelerator_arn = aws_globalaccelerator_accelerator.main.id
  client_affinity = "SOURCE_IP"
  protocol        = "TCP"

  port_range { from_port = 443; to_port = 443 }
  port_range { from_port = 80;  to_port = 80  }
}

resource "aws_globalaccelerator_endpoint_group" "us_east_1" {
  listener_arn          = aws_globalaccelerator_listener.https.id
  endpoint_group_region = var.aws_region
  traffic_dial_percentage = 100

  endpoint_configuration {
    endpoint_id                    = aws_lb.main.arn
    weight                         = 100
    client_ip_preservation_enabled = true
  }

  health_check_path             = "/api/healthz"
  health_check_protocol         = "HTTPS"
  health_check_port             = 443
  health_check_interval_seconds = 30
  threshold_count               = 3
}

# ─── AWS Transit Gateway (future multi-region backbone) ──────────────────────

resource "aws_ec2_transit_gateway" "main" {
  description                     = "${var.project} backbone transit gateway"
  amazon_side_asn                 = 64512
  auto_accept_shared_attachments  = "disable"
  default_route_table_association = "enable"
  default_route_table_propagation = "enable"
  dns_support                     = "enable"
  vpn_ecmp_support                = "enable"

  tags = { Name = "${var.project}-${var.environment}-tgw" }
}

resource "aws_ec2_transit_gateway_vpc_attachment" "main" {
  subnet_ids         = aws_subnet.private[*].id
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.main.id

  dns_support  = "enable"
  ipv6_support = "disable"

  tags = { Name = "${var.project}-${var.environment}-tgw-attachment" }
}

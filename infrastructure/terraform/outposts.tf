# ─── AWS Outposts ──────────────────────────────────────────────────────────────
#
# AWS Outposts extends AWS infrastructure, services, APIs, and tools to
# customer on-premises locations.
#
# PREREQUISITE: An Outpost must be physically ordered from AWS and installed
# at your data centre / colocation facility before these resources can be
# provisioned. Once AWS delivers and activates the rack, the Outpost ARN
# becomes available in your account.
#
# This file:
#   1. Reads the existing Outpost as a data source (once delivered by AWS)
#   2. Creates Outpost subnets in the VPC for on-premises workloads
#   3. Deploys ECS Fargate tasks on Outpost for data-residency requirements
#   4. Deploys RDS on Outpost (local data processing without AWS-region round-trip)
#   5. Configures local gateway (LGW) for on-premises connectivity

# ─── Data source — reference existing Outpost (set ARN in tfvars) ─────────────

variable "outpost_arn" {
  description = "ARN of the AWS Outpost rack (leave empty until Outpost is delivered)"
  type        = string
  default     = ""
}

variable "outpost_local_gateway_id" {
  description = "Local Gateway ID from the Outpost (e.g. lgw-XXXX, available after AWS delivers hardware)"
  type        = string
  default     = ""
}

variable "outpost_local_gateway_route_table_id" {
  description = "Local Gateway Route Table ID (not the LGW ID) — find it in the AWS Console under VPC → Local Gateway Route Tables"
  type        = string
  default     = ""
}

data "aws_outposts_outpost" "main" {
  count = var.outpost_arn != "" ? 1 : 0
  arn   = var.outpost_arn
}

# ─── Outpost Subnet (attached to the VPC, but physically on-premises) ─────────

resource "aws_subnet" "outpost" {
  count             = var.outpost_arn != "" ? 1 : 0
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, 30)
  availability_zone = data.aws_outposts_outpost.main[0].availability_zone
  outpost_arn       = var.outpost_arn

  tags = { Name = "${var.project}-${var.environment}-outpost" }
}

# ─── Local Gateway Route Table (routes on-premises traffic back to Outpost) ────

resource "aws_ec2_local_gateway_route_table_vpc_association" "main" {
  count                        = (var.outpost_arn != "" && var.outpost_local_gateway_route_table_id != "") ? 1 : 0
  local_gateway_route_table_id = var.outpost_local_gateway_route_table_id  # lgt-XXXX, not lgw-XXXX
  vpc_id                       = aws_vpc.main.id
}

resource "aws_route_table" "outpost" {
  count  = var.outpost_arn != "" ? 1 : 0
  vpc_id = aws_vpc.main.id
  # Route on-premises traffic via the Local Gateway.
  # The gateway_id must be the Local Gateway ID (lgw-*), not a route-table ID.
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = var.outpost_local_gateway_id   # lgw-XXXX
  }
  tags = { Name = "${var.project}-${var.environment}-outpost-rt" }
}

resource "aws_route_table_association" "outpost" {
  count          = var.outpost_arn != "" ? 1 : 0
  subnet_id      = aws_subnet.outpost[0].id
  route_table_id = aws_route_table.outpost[0].id
}

# ─── RDS on Outpost (low-latency database for on-premises applications) ────────

resource "aws_db_subnet_group" "outpost" {
  count      = var.outpost_arn != "" ? 1 : 0
  name       = "${var.project}-${var.environment}-outpost-db-subnet"
  subnet_ids = [aws_subnet.outpost[0].id]
  tags       = { Name = "${var.project}-outpost-db-subnet" }
}

resource "aws_db_instance" "outpost" {
  count             = var.outpost_arn != "" ? 1 : 0
  identifier        = "${var.project}-${var.environment}-outpost-postgres"
  engine            = "postgres"
  engine_version    = "15.6"
  instance_class    = "db.m5.large"
  allocated_storage = 200
  storage_type      = "gp2"
  storage_encrypted = true

  db_name  = "${var.db_name}_local"
  username = var.db_username
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.outpost[0].name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 7
  skip_final_snapshot     = true
  deletion_protection     = false    # on-prem instance can be recreated

  tags = { Name = "${var.project}-outpost-postgres", Location = "on-premises" }
}

# ─── ECS Capacity Provider on Outpost ─────────────────────────────────────────

resource "aws_launch_template" "outpost_ecs" {
  count         = var.outpost_arn != "" ? 1 : 0
  name_prefix   = "${var.project}-${var.environment}-outpost-ecs-"
  image_id      = data.aws_ssm_parameter.deep_learning_ami_ubuntu.value
  instance_type = "m5.xlarge"

  iam_instance_profile { arn = aws_iam_instance_profile.gpu.arn }
  vpc_security_group_ids = [aws_security_group.ecs.id]

  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo ECS_CLUSTER=${aws_ecs_cluster.main.name} >> /etc/ecs/ecs.config
    echo ECS_ENABLE_CONTAINER_METADATA=true >> /etc/ecs/ecs.config
  EOF
  )

  placement { tenancy = "default" }
  tag_specifications {
    resource_type = "instance"
    tags = { Name = "${var.project}-outpost-ecs", Location = "on-premises" }
  }
}

resource "aws_autoscaling_group" "outpost_ecs" {
  count               = var.outpost_arn != "" ? 1 : 0
  name                = "${var.project}-${var.environment}-outpost-ecs"
  min_size            = 0
  max_size            = 10
  desired_capacity    = 2
  vpc_zone_identifier = [aws_subnet.outpost[0].id]

  launch_template {
    id      = aws_launch_template.outpost_ecs[0].id
    version = "$Latest"
  }
}

# ─── Terraform instructions for Outpost setup ─────────────────────────────────
# Set in terraform.tfvars once your Outpost is delivered:
#
#   outpost_arn                          = "arn:aws:outposts:us-east-1:ACCOUNT_ID:outpost/op-XXXX"
#   outpost_local_gateway_id             = "lgw-XXXX"      # LGW ID — used as gateway_id on routes
#   outpost_local_gateway_route_table_id = "lgt-XXXX"      # LGW Route Table ID — used for VPC association
#
# Then run:  terraform apply -target=aws_subnet.outpost -target=aws_db_instance.outpost

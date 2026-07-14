# ─── ECR Repositories ─────────────────────────────────────────────────────────

resource "aws_ecr_repository" "api_server" {
  name                 = "${var.project}/api-server"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "KMS" }
}

resource "aws_ecr_repository" "shri_api" {
  name                 = "${var.project}/shri-academy-api"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "KMS" }
}

resource "aws_ecr_lifecycle_policy" "api_server" {
  repository = aws_ecr_repository.api_server.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 20 images"
      selection    = { tagStatus = "any"; countType = "imageCountMoreThan"; countNumber = 20 }
      action       = { type = "expire" }
    }]
  })
}

# ─── ECS Cluster ──────────────────────────────────────────────────────────────

resource "aws_ecs_cluster" "main" {
  name = "${var.project}-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 70
    capacity_provider = "FARGATE"
  }
  default_capacity_provider_strategy {
    weight            = 30
    capacity_provider = "FARGATE_SPOT"
  }
}

# ─── Application Load Balancer ────────────────────────────────────────────────

resource "aws_lb" "main" {
  name               = "${var.project}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = true

  access_logs {
    bucket  = aws_s3_bucket.assets.id
    prefix  = "alb-logs"
    enabled = true
  }
}

resource "aws_lb_target_group" "api" {
  name        = "${var.project}-api-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/api/healthz"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
  }
}

resource "aws_lb_target_group" "shri" {
  name        = "${var.project}-shri-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/shri-api/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.main.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

resource "aws_lb_listener_rule" "shri" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.shri.arn
  }
  condition {
    path_pattern { values = ["/shri-api/*"] }
  }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ─── Task Definitions ─────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "api_server" {
  name              = "/ecs/${var.project}/${var.environment}/api-server"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "shri_api" {
  name              = "/ecs/${var.project}/${var.environment}/shri-api"
  retention_in_days = 7
}

resource "aws_ecs_task_definition" "api_server" {
  family                   = "${var.project}-${var.environment}-api-server"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "api-server"
      image     = var.api_server_image != "" ? var.api_server_image : "${aws_ecr_repository.api_server.repository_url}:latest"
      essential = true
      portMappings = [{ containerPort = 8080, protocol = "tcp" }]
      environment = [
        { name = "NODE_ENV",             value = "production" },
        { name = "PORT",                 value = "8080" },
        { name = "REDIS_URL",            value = "rediss://${aws_elasticache_replication_group.main.primary_endpoint_address}:6379" },
        { name = "OPENSEARCH_URL",       value = "https://${aws_opensearch_domain.main.endpoint}" },
        { name = "AWS_REGION",           value = var.aws_region },
        { name = "S3_ASSETS_BUCKET",     value = aws_s3_bucket.assets.id },
        { name = "S3_CHROMADB_BUCKET",   value = aws_s3_bucket.chromadb.id },
        { name = "S3_ACADEMIC_BUCKET",   value = aws_s3_bucket.academic.id },
      ]
      secrets = [
        { name = "DATABASE_URL",      valueFrom = "${aws_secretsmanager_secret.db_password.arn}:database_url::" },
        { name = "SESSION_SECRET",    valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.project}/${var.environment}/session_secret" },
        { name = "STRIPE_SECRET_KEY", valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.project}/${var.environment}/stripe_secret_key" },
        # Confluent Cloud credentials (JSON: { api_key, api_secret, bootstrap })
        { name = "KAFKA_BOOTSTRAP",   valueFrom = "${aws_secretsmanager_secret.confluent_app.arn}:bootstrap::" },
        { name = "KAFKA_API_KEY",     valueFrom = "${aws_secretsmanager_secret.confluent_app.arn}:api_key::" },
        { name = "KAFKA_API_SECRET",  valueFrom = "${aws_secretsmanager_secret.confluent_app.arn}:api_secret::" },
        # NVIDIA NIM — Nemotron games + mythology
        { name = "NVIDIA_API_KEY",    valueFrom = "${aws_secretsmanager_secret.nvidia_api_key.arn}" },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.api_server.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "api"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8080/api/healthz || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])
}

resource "aws_ecs_task_definition" "shri_api" {
  family                   = "${var.project}-${var.environment}-shri-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 1024
  memory                   = 2048
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "shri-api"
      image     = var.shri_api_image != "" ? var.shri_api_image : "${aws_ecr_repository.shri_api.repository_url}:latest"
      essential = true
      portMappings = [{ containerPort = 8000, protocol = "tcp" }]
      environment = [
        { name = "CHROMADB_S3_BUCKET",  value = aws_s3_bucket.chromadb.id },
        { name = "AWS_REGION",          value = var.aws_region },
        { name = "S3_ACADEMIC_BUCKET",  value = aws_s3_bucket.academic.id },
        { name = "OPENSEARCH_URL",      value = "https://${aws_opensearch_domain.main.endpoint}" },
        { name = "API_SERVER_URL",      value = "http://api-server.${var.project}.internal:8080" },
        # Bedrock — used when BEDROCK_ENABLED=true (primary) or OPENAI_API_KEY missing (fallback)
        { name = "BEDROCK_ENABLED",     value = "true" },
        { name = "BEDROCK_REGION",      value = var.aws_region },
        { name = "BEDROCK_MODEL_ID",    value = "anthropic.claude-3-5-sonnet-20241022-v2:0" },
      ]
      secrets = [
        { name = "OPENAI_API_KEY",   valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.project}/${var.environment}/openai_api_key" },
        # Confluent Cloud credentials
        { name = "KAFKA_BOOTSTRAP",  valueFrom = "${aws_secretsmanager_secret.confluent_app.arn}:bootstrap::" },
        { name = "KAFKA_API_KEY",    valueFrom = "${aws_secretsmanager_secret.confluent_app.arn}:api_key::" },
        { name = "KAFKA_API_SECRET", valueFrom = "${aws_secretsmanager_secret.confluent_app.arn}:api_secret::" },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.shri_api.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "shri"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8000/shri-api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 120
      }
    }
  ])
}

# ─── ECS Services ─────────────────────────────────────────────────────────────

resource "aws_ecs_service" "api_server" {
  name            = "api-server"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api_server.arn
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 70
    base              = 1
  }

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 30
  }

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api-server"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller { type = "ECS" }

  lifecycle { ignore_changes = [desired_count, task_definition] }
}

resource "aws_ecs_service" "shri_api" {
  name            = "shri-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.shri_api.arn
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 70
    base              = 1
  }

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 30
  }

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.shri.arn
    container_name   = "shri-api"
    container_port   = 8000
  }

  deployment_circuit_breaker { enable = true; rollback = true }
  lifecycle { ignore_changes = [desired_count, task_definition] }
}

# ─── Auto Scaling ─────────────────────────────────────────────────────────────

resource "aws_appautoscaling_target" "api_server" {
  max_capacity       = 3
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api_server.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "api_server_cpu" {
  name               = "${var.project}-api-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api_server.resource_id
  scalable_dimension = aws_appautoscaling_target.api_server.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api_server.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 70.0
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# ─── NVIDIA NIM API Key ───────────────────────────────────────────────────────
# Set var.nvidia_api_key in terraform.tfvars (sensitive) or via TF_VAR_nvidia_api_key.
# The secret is created empty when var.nvidia_api_key is "" — update it manually in
# the AWS console or with: aws secretsmanager put-secret-value --secret-id <arn> --secret-string '<key>'

resource "aws_secretsmanager_secret" "nvidia_api_key" {
  name                    = "${var.project}/${var.environment}/nvidia_api_key"
  description             = "NVIDIA NIM API key for Nemotron-powered games and mythology routes"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "nvidia_api_key" {
  secret_id     = aws_secretsmanager_secret.nvidia_api_key.id
  secret_string = var.nvidia_api_key != "" ? var.nvidia_api_key : "PLACEHOLDER_SET_ME"

  # Prevent Terraform from overwriting a key that was set manually after initial deploy
  lifecycle {
    ignore_changes = [secret_string]
  }
}

data "aws_caller_identity" "current" {}

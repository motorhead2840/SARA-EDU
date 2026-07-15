# ─── GitHub Actions OIDC — keyless auth for deploy-monorepo.yml ──────────────
#
# Allows GitHub Actions to assume a deploy role using OIDC (no static keys).
# The workflow file sets `permissions: id-token: write` and uses
# `aws-actions/configure-aws-credentials` with `role-to-assume`.
#
# After `terraform apply`, copy the output `github_actions_deploy_role_arn`
# and add it as a GitHub secret named AWS_DEPLOY_ROLE_ARN in the monorepo's
# "production" environment (Settings → Environments → production → Secrets).

resource "aws_iam_openid_connect_provider" "github_actions" {
  url = "https://token.actions.githubusercontent.com"

  # GitHub's OIDC thumbprints (stable — rotating announced on GitHub blog)
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd"
  ]

  client_id_list = ["sts.amazonaws.com"]
}

resource "aws_iam_role" "github_actions_deploy" {
  name        = "${var.project}-${var.environment}-github-actions-deploy"
  description = "Assumed by GitHub Actions (OIDC) to push ECR images and update ECS services"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "GitHubOIDC"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github_actions.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            # Allow tag pushes and workflow_dispatch from the production environment.
            # Subject format for environment-scoped runs:
            #   repo:<org>/<repo>:environment:production
            # Subject format for tag-triggered runs (no environment gate yet):
            #   repo:<org>/<repo>:ref:refs/tags/v*
            "token.actions.githubusercontent.com:sub" = [
              "repo:${var.github_org}/${var.github_monorepo}:environment:production",
              "repo:${var.github_org}/${var.github_monorepo}:ref:refs/tags/v*",
              "repo:${var.github_org}/${var.github_monorepo}:ref:refs/heads/*",
              "repo:${var.github_org}/${lower(var.github_monorepo)}:environment:production",
              "repo:${var.github_org}/${lower(var.github_monorepo)}:ref:refs/tags/v*",
              "repo:${var.github_org}/${lower(var.github_monorepo)}:ref:refs/heads/*",
            ]
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "github_actions_deploy" {
  name = "deploy-permissions"
  role = aws_iam_role.github_actions_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRAuth"
        Effect = "Allow"
        Action = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Sid    = "ECRPush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
        ]
        Resource = [
          aws_ecr_repository.api_server.arn,
          aws_ecr_repository.shri_api.arn,
        ]
      },
      {
        # Describe actions have no resource-level restrictions in IAM
        Sid    = "ECSDescribe"
        Effect = "Allow"
        Action = [
          "ecs:DescribeTaskDefinition",
          "ecs:DescribeServices",
          "ecs:DescribeClusters",
        ]
        Resource = "*"
      },
      {
        # Task definition registration is scoped to this project's families only
        Sid    = "ECSRegisterTaskDef"
        Effect = "Allow"
        Action = [
          "ecs:RegisterTaskDefinition",
          "ecs:DeregisterTaskDefinition",
        ]
        Resource = "arn:aws:ecs:${var.aws_region}:*:task-definition/${var.project}-${var.environment}-*"
      },
      {
        # UpdateService scoped to the two known services inside the production cluster
        Sid    = "ECSUpdateService"
        Effect = "Allow"
        Action = ["ecs:UpdateService"]
        Resource = [
          "arn:aws:ecs:${var.aws_region}:*:service/${var.project}-${var.environment}/api-server",
          "arn:aws:ecs:${var.aws_region}:*:service/${var.project}-${var.environment}/shri-api",
        ]
      },
      {
        Sid      = "PassECSRoles"
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = [
          aws_iam_role.ecs_execution.arn,
          aws_iam_role.ecs_task.arn,
        ]
        Condition = {
          StringEquals = {
            "iam:PassedToService" = "ecs-tasks.amazonaws.com"
          }
        }
      },
      {
        # amplify:ListApps does not support resource-level permissions and must target wildcard '*'
        Sid    = "AmplifyList"
        Effect = "Allow"
        Action = ["amplify:ListApps"]
        Resource = "*"
      },
      {
        Sid    = "AmplifyDeploy"
        Effect = "Allow"
        Action = [
          "amplify:StartJob",
          "amplify:GetJob",
          "amplify:ListJobs",
          "amplify:GetApp",
          "amplify:GetBranch",
          "amplify:ListBranches"
        ]
        Resource = [
          aws_amplify_app.shri_academy.arn,
          "${aws_amplify_app.shri_academy.arn}/*",
          aws_amplify_app.shri_mentor.arn,
          "${aws_amplify_app.shri_mentor.arn}/*"
        ]
      },
    ]
  })
}

# ─── GitHub → AWS CodeStar Connection ────────────────────────────────────────
#
# After `terraform apply`, open AWS Console → Developer Tools → Connections
# and click "Update pending connection" to complete the GitHub OAuth handshake.

resource "aws_codestarconnections_connection" "github" {
  name          = "${var.project}-github"
  provider_type = "GitHub"
}

# ─── Artifact Store ───────────────────────────────────────────────────────────

resource "aws_s3_bucket" "codepipeline_artifacts" {
  bucket = "${var.project}-${var.environment}-codepipeline-artifacts"
}
resource "aws_s3_bucket_public_access_block" "codepipeline_artifacts" {
  bucket = aws_s3_bucket.codepipeline_artifacts.id
  block_public_acls = true; block_public_policy = true
  ignore_public_acls = true; restrict_public_buckets = true
}

# ─── CodeBuild — shared build project for Docker + ECR push ──────────────────

resource "aws_codebuild_project" "cyberdemon" {
  name          = "${var.project}-cyberdemon-build"
  description   = "Build and push Cyberdemon Docker image to ECR"
  build_timeout = 20
  service_role  = aws_iam_role.codebuild.arn

  artifacts { type = "CODEPIPELINE" }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true # needed for Docker daemon

    environment_variable { name = "AWS_REGION";    value = var.aws_region }
    environment_variable { name = "ECR_REPO_URI";  value = aws_ecr_repository.api_server.repository_url }
    environment_variable { name = "ECS_CLUSTER";   value = aws_ecs_cluster.main.name }
    environment_variable { name = "ECS_SERVICE";   value = aws_ecs_service.api_server.name }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = file("${path.module}/../codebuild/buildspec-cyberdemon.yml")
  }

  logs_config {
    cloudwatch_logs { group_name = "/codebuild/${var.project}/cyberdemon"; stream_name = "build" }
  }
}

resource "aws_codebuild_project" "opentag" {
  name          = "${var.project}-opentag-build"
  description   = "Build and push OpenTag Docker image to ECR"
  build_timeout = 20
  service_role  = aws_iam_role.codebuild.arn

  artifacts { type = "CODEPIPELINE" }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true

    environment_variable { name = "AWS_REGION";   value = var.aws_region }
    environment_variable { name = "ECR_REPO_URI"; value = aws_ecr_repository.shri_api.repository_url }
    environment_variable { name = "ECS_CLUSTER";  value = aws_ecs_cluster.main.name }
    environment_variable { name = "ECS_SERVICE";  value = aws_ecs_service.shri_api.name }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = file("${path.module}/../codebuild/buildspec-opentag.yml")
  }

  logs_config {
    cloudwatch_logs { group_name = "/codebuild/${var.project}/opentag"; stream_name = "build" }
  }
}

# ─── CodePipeline — Cyberdemon (motorhead2840/Cyberdemon) ────────────────────

resource "aws_codepipeline" "cyberdemon" {
  name     = "${var.project}-cyberdemon"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.codepipeline_artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"
    action {
      name             = "GitHub_Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]
      configuration = {
        ConnectionArn        = aws_codestarconnections_connection.github.arn
        FullRepositoryId     = "${var.github_org}/Cyberdemon"
        BranchName           = "main"
        OutputArtifactFormat = "CODE_ZIP"
        DetectChanges        = "true"
      }
    }
  }

  stage {
    name = "Build"
    action {
      name             = "Docker_Build_Push"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]
      configuration    = { ProjectName = aws_codebuild_project.cyberdemon.name }
    }
  }

  stage {
    name = "Deploy"
    action {
      name            = "ECS_Deploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      version         = "1"
      input_artifacts = ["build_output"]
      configuration = {
        ClusterName = aws_ecs_cluster.main.name
        ServiceName = aws_ecs_service.api_server.name
        FileName    = "imagedefinitions.json"
      }
    }
  }
}

# ─── CodePipeline — OpenTag (motorhead2840/OpenTag) ─────────────────────────

resource "aws_codepipeline" "opentag" {
  name     = "${var.project}-opentag"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.codepipeline_artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"
    action {
      name             = "GitHub_Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]
      configuration = {
        ConnectionArn        = aws_codestarconnections_connection.github.arn
        FullRepositoryId     = "${var.github_org}/OpenTag"
        BranchName           = "main"
        OutputArtifactFormat = "CODE_ZIP"
        DetectChanges        = "true"
      }
    }
  }

  stage {
    name = "Build"
    action {
      name             = "Docker_Build_Push"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]
      configuration    = { ProjectName = aws_codebuild_project.opentag.name }
    }
  }

  stage {
    name = "Deploy"
    action {
      name            = "ECS_Deploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      version         = "1"
      input_artifacts = ["build_output"]
      configuration = {
        ClusterName = aws_ecs_cluster.main.name
        ServiceName = aws_ecs_service.shri_api.name
        FileName    = "imagedefinitions.json"
      }
    }
  }
}

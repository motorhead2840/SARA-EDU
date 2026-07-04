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
    compute_type                = "BUILD_GENERAL1_MEDIUM"
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
    compute_type                = "BUILD_GENERAL1_MEDIUM"
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

# ─── AWS Amplify Apps ────────────────────────────────────────────────────────
#
# Frontend applications:
# 1. shri-academy (artifacts/shri-academy)
# 2. shri-mentor (artifacts/sri-platform)
#
# Note: The 'shri-mentor' Amplify App deploys the frontend codebase located at
# the 'artifacts/sri-platform' directory, aligning with the monorepo structure
# and naming conventions.
#
# These are deployed to AWS Amplify using the IAM service roles provided.

variable "shri_academy_amplify_role_arn" {
  description = "Optional custom IAM Service Role ARN for shri-academy Amplify app"
  type        = string
  default     = ""
}

variable "shri_mentor_amplify_role_arn" {
  description = "Optional custom IAM Service Role ARN for shri-mentor Amplify app"
  type        = string
  default     = ""
}

locals {
  shri_academy_amplify_role_arn = var.shri_academy_amplify_role_arn != "" ? var.shri_academy_amplify_role_arn : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/shri-academy-amplify-role"
  shri_mentor_amplify_role_arn  = var.shri_mentor_amplify_role_arn != "" ? var.shri_mentor_amplify_role_arn : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/shri-mentor-amplify-role"

  # SPA custom rewrite rule pattern to redirect all non-file-asset requests to index.html for client-side routing.
  # Logic: Matches any path without a period (no file extension), or any path with an extension
  # that is NOT in the whitelisted list of static assets (css, gif, ico, jpg, js, png, txt, svg, woff, woff2, json).
  # This ensures all routing endpoints are handled by the client-side router (Vite/React/wouter), while preserving asset requests.
  spa_routing_redirect_source = "^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|json)$)([^.]+$)"
}

# ── Shri Academy Amplify App ──────────────────────────────────────────────────
resource "aws_amplify_app" "shri_academy" {
  name                 = "shri-academy"
  repository           = "https://github.com/${var.github_org}/${var.github_monorepo}"
  iam_service_role_arn = local.shri_academy_amplify_role_arn

  # Vite environment variables required for build constraints
  environment_variables = {
    PORT                      = "8080"
    BASE_PATH                 = "/"
    AMPLIFY_MONOREPO_APP_ROOT = "artifacts/shri-academy"
  }

  # SPA custom rewrite rule to support client-side routing
  custom_rule {
    source = local.spa_routing_redirect_source
    status = "200"
    target = "/index.html"
  }
}

resource "aws_amplify_branch" "shri_academy_main" {
  app_id      = aws_amplify_app.shri_academy.id
  branch_name = "main"

  framework         = "Web"
  stage             = "PRODUCTION"
  enable_auto_build = true
}

# ── Shri Mentor Amplify App ───────────────────────────────────────────────────
resource "aws_amplify_app" "shri_mentor" {
  # This app is named 'shri-mentor' as requested by the user, and compiles
  # the 'sri-platform' package.
  name                 = "shri-mentor"
  repository           = "https://github.com/${var.github_org}/${var.github_monorepo}"
  iam_service_role_arn = local.shri_mentor_amplify_role_arn

  # Vite environment variables required for build constraints
  environment_variables = {
    PORT                      = "8080"
    BASE_PATH                 = "/"
    AMPLIFY_MONOREPO_APP_ROOT = "artifacts/sri-platform" # maps to the 'sri-platform' directory
  }

  # SPA custom rewrite rule to support client-side routing
  custom_rule {
    source = local.spa_routing_redirect_source
    status = "200"
    target = "/index.html"
  }
}

resource "aws_amplify_branch" "shri_mentor_main" {
  app_id      = aws_amplify_app.shri_mentor.id
  branch_name = "main"

  framework         = "Web"
  stage             = "PRODUCTION"
  enable_auto_build = true
}

# ── Outputs ───────────────────────────────────────────────────────────────────
output "amplify_shri_academy_app_id" {
  value       = aws_amplify_app.shri_academy.id
  description = "AWS Amplify App ID for shri-academy"
}

output "amplify_shri_academy_default_domain" {
  value       = aws_amplify_app.shri_academy.default_domain
  description = "AWS Amplify Default Domain for shri-academy"
}

output "amplify_shri_mentor_app_id" {
  value       = aws_amplify_app.shri_mentor.id
  description = "AWS Amplify App ID for shri-mentor (sri-platform)"
}

output "amplify_shri_mentor_default_domain" {
  value       = aws_amplify_app.shri_mentor.default_domain
  description = "AWS Amplify Default Domain for shri-mentor (sri-platform)"
}

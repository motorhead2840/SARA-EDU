#!/usr/bin/env bash
# bootstrap.sh — run ONCE before `terraform init` to create remote state resources
# Usage: AWS_PROFILE=your-profile bash infrastructure/scripts/bootstrap.sh
set -euo pipefail

REGION="us-east-1"
STATE_BUCKET="sri-platform-tfstate"
LOCK_TABLE="sri-platform-tflock"
PROJECT="sri"

echo "──────────────────────────────────────────────────"
echo " SRI Platform — Terraform bootstrap"
echo " Region: $REGION"
echo "──────────────────────────────────────────────────"

# ─── S3 state bucket ──────────────────────────────────────────────────────────
if aws s3api head-bucket --bucket "$STATE_BUCKET" 2>/dev/null; then
  echo "✓ State bucket '$STATE_BUCKET' already exists"
else
  echo "Creating S3 state bucket '$STATE_BUCKET'..."
  aws s3api create-bucket \
    --bucket "$STATE_BUCKET" \
    --region "$REGION"

  aws s3api put-bucket-versioning \
    --bucket "$STATE_BUCKET" \
    --versioning-configuration Status=Enabled

  aws s3api put-bucket-encryption \
    --bucket "$STATE_BUCKET" \
    --server-side-encryption-configuration '{
      "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "aws:kms"}}]
    }'

  aws s3api put-public-access-block \
    --bucket "$STATE_BUCKET" \
    --public-access-block-configuration \
      "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

  echo "✓ State bucket created and hardened"
fi

# ─── DynamoDB lock table ───────────────────────────────────────────────────────
if aws dynamodb describe-table --table-name "$LOCK_TABLE" --region "$REGION" 2>/dev/null; then
  echo "✓ Lock table '$LOCK_TABLE' already exists"
else
  echo "Creating DynamoDB lock table '$LOCK_TABLE'..."
  aws dynamodb create-table \
    --table-name "$LOCK_TABLE" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION"
  echo "✓ Lock table created"
fi

# ─── GitHub OIDC provider for CI/CD ──────────────────────────────────────────
OIDC_PROVIDER="token.actions.githubusercontent.com"
if aws iam list-open-id-connect-providers | grep -q "$OIDC_PROVIDER"; then
  echo "✓ GitHub OIDC provider already registered"
else
  echo "Registering GitHub Actions OIDC provider..."
  aws iam create-open-id-connect-provider \
    --url "https://$OIDC_PROVIDER" \
    --client-id-list "sts.amazonaws.com" \
    --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1"
  echo "✓ GitHub OIDC provider registered"
fi

# ─── GitHub Actions deploy role ───────────────────────────────────────────────
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_NAME="${PROJECT}-github-deploy"

TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_PROVIDER}" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "${OIDC_PROVIDER}:aud": "sts.amazonaws.com" },
      "StringLike":   { "${OIDC_PROVIDER}:sub": "repo:motorhead2840/*:ref:refs/heads/main" }
    }
  }]
}
EOF
)

if aws iam get-role --role-name "$ROLE_NAME" 2>/dev/null; then
  echo "✓ GitHub deploy role '$ROLE_NAME' already exists"
else
  echo "Creating GitHub Actions deploy role '$ROLE_NAME'..."
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY"

  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "arn:aws:iam::aws:policy/AmazonECS_FullAccess"

  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"

  echo "✓ Deploy role created: arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
  echo ""
  echo "  ⚠  Add this as a GitHub secret named AWS_DEPLOY_ROLE_ARN:"
  echo "     arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
fi

echo ""
echo "──────────────────────────────────────────────────"
echo " Bootstrap complete. Next steps:"
echo ""
echo "  1. cd infrastructure/terraform"
echo "  2. terraform init"
echo "  3. terraform plan -out=plan.tfplan"
echo "  4. terraform apply plan.tfplan"
echo ""
echo "  After apply:"
echo "  5. Open AWS Console → Developer Tools → Connections"
echo "     and complete the GitHub OAuth handshake for the"
echo "     CodeStar connection."
echo "  6. Add AWS_DEPLOY_ROLE_ARN to GitHub repo secrets."
echo "  7. Upload Airflow DAGs:"
echo "     aws s3 sync infrastructure/airflow/dags/ s3://<airflow-bucket>/dags/"
echo "     aws s3 cp infrastructure/airflow/requirements.txt s3://<airflow-bucket>/requirements.txt"
echo "──────────────────────────────────────────────────"

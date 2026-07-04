# ─── Machine Learning Services ────────────────────────────────────────────────
#
# Provisions:
#   - Amazon Bedrock model access (Claude, Titan, Llama) for enhanced AI tutoring
#   - Amazon Comprehend — NLP on student messages (sentiment, topics, PII detection)
#   - Amazon Transcribe — speech-to-text for voice tutoring sessions
#   - Amazon Polly — TTS for AI tutor voice responses
#   - Amazon Rekognition — visual content analysis (future diagram upload)
#   - Amazon Textract — extract text from student-uploaded PDFs
#   - Amazon Lex — conversational AI bot for intake / FAQ
#   - Amazon Kendra — intelligent search over course materials
#   - Amazon Translate — multi-language student support

# ─── Amazon Bedrock ──────────────────────────────────────────────────────────
# Bedrock is a managed service — no infrastructure to provision; access is
# enabled at the AWS account level. We create IAM policies and SSM params.

resource "aws_iam_role_policy" "ecs_task_bedrock" {
  name = "bedrock-access"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "BedrockInvoke"
      Effect = "Allow"
      Action = [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:GetFoundationModel",
        "bedrock:ListFoundationModels",
      ]
      Resource = [
        "arn:aws:bedrock:${var.aws_region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0",
        "arn:aws:bedrock:${var.aws_region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
        "arn:aws:bedrock:${var.aws_region}::foundation-model/amazon.titan-embed-text-v1",
        "arn:aws:bedrock:${var.aws_region}::foundation-model/meta.llama3-8b-instruct-v1:0",
      ]
    }]
  })
}

resource "aws_ssm_parameter" "bedrock_model_ids" {
  name = "/${var.project}/${var.environment}/bedrock/model_ids"
  type = "String"
  value = jsonencode({
    primary_chat    = "anthropic.claude-3-sonnet-20240229-v1:0"
    fast_chat       = "anthropic.claude-3-haiku-20240307-v1:0"
    embeddings      = "amazon.titan-embed-text-v1"
    open_source     = "meta.llama3-8b-instruct-v1:0"
  })
}

# ─── Amazon Comprehend ────────────────────────────────────────────────────────

# Custom classifier endpoint for student frustration / topic classification
resource "aws_iam_role" "comprehend" {
  name = "${var.project}-${var.environment}-comprehend"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow"; Principal = { Service = "comprehend.amazonaws.com" }; Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy" "comprehend_s3" {
  name = "s3-access"
  role = aws_iam_role.comprehend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow"; Action = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]; Resource = [aws_s3_bucket.sagemaker.arn, "${aws_s3_bucket.sagemaker.arn}/*", aws_s3_bucket.data_lake.arn, "${aws_s3_bucket.data_lake.arn}/*"] }]
  })
}

# IAM policy for ECS tasks to call Comprehend
resource "aws_iam_role_policy" "ecs_task_comprehend" {
  name = "comprehend-access"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "comprehend:DetectSentiment",
        "comprehend:DetectKeyPhrases",
        "comprehend:DetectEntities",
        "comprehend:DetectPiiEntities",
        "comprehend:ClassifyDocument",
        "comprehend:StartDocumentClassificationJob",
        "comprehend:StartTopicsDetectionJob",
      ]
      Resource = "*"
    }]
  })
}

# Comprehend async job output → S3
resource "aws_s3_object" "comprehend_output_prefix" {
  bucket  = aws_s3_bucket.data_lake.id
  key     = "comprehend-output/.keep"
  content = ""
}

# ─── Amazon Transcribe ────────────────────────────────────────────────────────

resource "aws_iam_role_policy" "ecs_task_transcribe" {
  name = "transcribe-access"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "transcribe:StartTranscriptionJob",
        "transcribe:GetTranscriptionJob",
        "transcribe:ListTranscriptionJobs",
        "transcribe:DeleteTranscriptionJob",
        "transcribe:CreateVocabulary",
        "transcribe:StartStreamTranscription",
      ]
      Resource = "*"
    }]
  })
}

# Custom vocabulary for education domain terms
resource "aws_ssm_parameter" "transcribe_vocabulary" {
  name  = "/${var.project}/${var.environment}/transcribe/vocabulary_name"
  type  = "String"
  value = "${var.project}-${var.environment}-edu-vocabulary"
}

# ─── Amazon Polly ─────────────────────────────────────────────────────────────

resource "aws_iam_role_policy" "ecs_task_polly" {
  name = "polly-access"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["polly:SynthesizeSpeech", "polly:DescribeVoices", "polly:GetLexicon", "polly:StartSpeechSynthesisTask"]
      Resource = "*"
    }]
  })
}

resource "aws_ssm_parameter" "polly_config" {
  name  = "/${var.project}/${var.environment}/polly/config"
  type  = "String"
  value = jsonencode({
    default_voice  = "Joanna"
    neural_voices  = ["Joanna", "Matthew", "Aria"]
    engine         = "neural"
    output_format  = "mp3"
    sample_rate    = "22050"
    s3_bucket      = aws_s3_bucket.assets.id
    s3_prefix      = "tts-output/"
  })
}

# ─── Amazon Rekognition ───────────────────────────────────────────────────────

resource "aws_iam_role_policy" "ecs_task_rekognition" {
  name = "rekognition-access"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "rekognition:DetectLabels",
        "rekognition:DetectText",
        "rekognition:DetectModerationLabels",
        "rekognition:AnalyzeDocument",
        "rekognition:DetectFaces",
      ]
      Resource = "*"
    }]
  })
}

# ─── Amazon Textract ──────────────────────────────────────────────────────────

resource "aws_iam_role_policy" "ecs_task_textract" {
  name = "textract-access"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["textract:AnalyzeDocument", "textract:StartDocumentAnalysis", "textract:GetDocumentAnalysis", "textract:StartDocumentTextDetection", "textract:GetDocumentTextDetection"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = ["${aws_s3_bucket.assets.arn}/*"]
      }
    ]
  })
}

resource "aws_s3_object" "textract_output_prefix" {
  bucket  = aws_s3_bucket.data_lake.id
  key     = "textract-output/.keep"
  content = ""
}

# ─── Amazon Lex v2 — Intake Bot ──────────────────────────────────────────────

resource "aws_iam_role" "lex" {
  name = "${var.project}-${var.environment}-lex"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow"; Principal = { Service = "lexv2.amazonaws.com" }; Action = "sts:AssumeRole" }]
  })
}
resource "aws_iam_role_policy_attachment" "lex" {
  role       = aws_iam_role.lex.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonLexFullAccess"
}

resource "aws_lexv2models_bot" "shri_intake" {
  name     = "${var.project}-${var.environment}-shri-intake"
  role_arn = aws_iam_role.lex.arn

  data_privacy { child_directed = false }
  idle_session_ttl_in_seconds = 300

  tags = { Project = var.project }
}

# ─── Amazon Kendra — Intelligent course material search ──────────────────────

resource "aws_iam_role" "kendra" {
  name = "${var.project}-${var.environment}-kendra"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow"; Principal = { Service = "kendra.amazonaws.com" }; Action = "sts:AssumeRole" }]
  })
}
resource "aws_iam_role_policy" "kendra_s3" {
  name = "s3-access"
  role = aws_iam_role.kendra.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow"; Action = ["s3:GetObject", "s3:ListBucket"]; Resource = [aws_s3_bucket.assets.arn, "${aws_s3_bucket.assets.arn}/*"] },
      { Effect = "Allow"; Action = ["cloudwatch:PutMetricData"]; Resource = "*"; Condition = { StringEquals = { "cloudwatch:namespace" = "Kendra" } } },
      { Effect = "Allow"; Action = ["logs:DescribeLogGroups", "logs:CreateLogGroup", "logs:DescribeLogStreams", "logs:CreateLogStream", "logs:PutLogEvents"]; Resource = ["arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/kendra/*"] },
    ]
  })
}

resource "aws_kendra_index" "course_materials" {
  name     = "${var.project}-${var.environment}-course-materials"
  role_arn = aws_iam_role.kendra.arn
  edition  = "DEVELOPER_EDITION"  # switch to ENTERPRISE_EDITION for production scale

  server_side_encryption_configuration {
    kms_key_id = aws_kms_key.kafka.arn
  }

  document_metadata_configuration_updates {
    name = "_created_at"; type = "DATE_VALUE"
    search { facetable = false; searchable = false; displayable = true; sortable = true }
    relevance { freshness = true; importance = 1; duration = "25920000s"; rank_order = "ASCENDING" }
  }
}

# ─── Amazon Translate ─────────────────────────────────────────────────────────

resource "aws_iam_role_policy" "ecs_task_translate" {
  name = "translate-access"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["translate:TranslateText", "translate:TranslateDocument", "translate:ListLanguages"]
      Resource = "*"
    }]
  })
}

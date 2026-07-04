# ─── AWS Ground Station (Satellite) ──────────────────────────────────────────
#
# AWS Ground Station is a fully managed service for controlling satellite
# communications, processing satellite data, and scaling satellite operations.
#
# Use cases for SRI Platform:
#   - Global connectivity for regions without reliable internet (rural education)
#   - Downlinking earth observation data for SageMaker analysis
#   - Redundant uplink for data streaming to Kafka when terrestrial links fail
#
# Note: Ground Station requires reserved satellite contacts ($9.50–$22.50/min).
# Contacts are scheduled individually; this Terraform configures the mission
# profile and antenna settings but does NOT automatically schedule contacts.

# ─── Data Config — Antenna Downlink (receive satellite data) ─────────────────

resource "aws_groundstation_config" "antenna_downlink" {
  name = "${var.project}-${var.environment}-antenna-downlink"

  config_data {
    antenna_downlink_config {
      spectrum_config {
        bandwidth {
          units = "MHz"
          value = 30.0
        }
        center_frequency {
          units = "MHz"
          value = 8160.0    # X-band downlink (typical EO satellite)
        }
        polarization = "RIGHT_HAND"
      }
    }
  }
}

# ─── Data Config — Antenna Downlink Demod/Decode ──────────────────────────────

resource "aws_groundstation_config" "antenna_downlink_demod_decode" {
  name = "${var.project}-${var.environment}-downlink-demod-decode"

  config_data {
    antenna_downlink_demod_decode_config {
      decode_config {
        unvalidated_json = jsonencode({
          type = "CADUSDecoder"
          codingScheme = "CONVOLUTIONAL"
          frameLength = 1115
        })
      }
      demodulation_config {
        unvalidated_json = jsonencode({
          type = "QPSK"
          carrierFrequency = { value = 8160.0; units = "MHz" }
          bandwidth        = { value = 30.0;   units = "MHz" }
          sampleRate       = { value = 15.0;   units = "MHz" }
          polarization     = "RIGHT_HAND"
        })
      }
      spectrum_config {
        bandwidth        { value = 30.0;   units = "MHz" }
        center_frequency { value = 8160.0; units = "MHz" }
        polarization     = "RIGHT_HAND"
      }
    }
  }
}

# ─── Data Config — Tracking ───────────────────────────────────────────────────

resource "aws_groundstation_config" "tracking" {
  name = "${var.project}-${var.environment}-tracking"

  config_data {
    tracking_config { autotrack = "PREFERRED" }
  }
}

# ─── Data Config — Uplink (command uplink to satellite) ───────────────────────

resource "aws_groundstation_config" "antenna_uplink" {
  name = "${var.project}-${var.environment}-antenna-uplink"

  config_data {
    antenna_uplink_config {
      spectrum_config {
        center_frequency { value = 7190.0; units = "MHz" }   # X-band uplink
        polarization = "LEFT_HAND"
      }
      target_eirp {
        units = "dBW"
        value = 20.0
      }
      transmit_disabled = false
    }
  }
}

# ─── Data Delivery — stream received data to Kinesis → MSK ───────────────────

resource "aws_kinesis_stream" "satellite_data" {
  name             = "${var.project}-${var.environment}-satellite-data"
  shard_count      = 2
  retention_period = 24

  encryption_type = "KMS"
  kms_key_id      = aws_kms_key.kafka.id

  tags = { Name = "${var.project}-satellite-data" }
}

resource "aws_groundstation_config" "dataflow_endpoint" {
  name = "${var.project}-${var.environment}-dataflow-endpoint"

  config_data {
    dataflow_endpoint_config {
      dataflow_endpoint_name   = "${var.project}-${var.environment}-kinesis-endpoint"
      dataflow_endpoint_region = var.aws_region
    }
  }
}

# ─── IAM Role for Ground Station ─────────────────────────────────────────────

resource "aws_iam_role" "ground_station" {
  name = "${var.project}-${var.environment}-ground-station"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "groundstation.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "ground_station_kinesis" {
  name = "kinesis-write"
  role = aws_iam_role.ground_station.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow"; Action = ["kinesis:PutRecord", "kinesis:PutRecords"]; Resource = aws_kinesis_stream.satellite_data.arn },
      { Effect = "Allow"; Action = ["s3:PutObject"]; Resource = "${aws_s3_bucket.data_lake.arn}/satellite/*" },
    ]
  })
}

# ─── Mission Profile ──────────────────────────────────────────────────────────

resource "aws_groundstation_mission_profile" "main" {
  name = "${var.project}-${var.environment}-mission"

  contact_pre_pass_duration_seconds  = 120
  contact_post_pass_duration_seconds = 30
  minimum_viable_contact_duration_seconds = 180

  tracking_config_arn = aws_groundstation_config.tracking.arn

  dataflow_edges {
    source      = aws_groundstation_config.antenna_downlink_demod_decode.arn
    destination = aws_groundstation_config.dataflow_endpoint.arn
  }

  tags = { Name = "${var.project}-${var.environment}-mission" }
}

# ─── Lambda: Kinesis → MSK bridge (satellite data into Kafka pipeline) ────────

resource "aws_iam_role" "lambda_satellite_bridge" {
  name = "${var.project}-${var.environment}-lambda-satellite-bridge"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole"; Effect = "Allow"; Principal = { Service = "lambda.amazonaws.com" } }]
  })
}
resource "aws_iam_role_policy_attachment" "lambda_satellite_vpc" {
  role       = aws_iam_role.lambda_satellite_bridge.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}
resource "aws_iam_role_policy" "lambda_satellite_permissions" {
  name = "satellite-bridge-permissions"
  role = aws_iam_role.lambda_satellite_bridge.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow"; Action = ["kinesis:GetRecords", "kinesis:GetShardIterator", "kinesis:DescribeStream", "kinesis:ListShards"]; Resource = aws_kinesis_stream.satellite_data.arn },
      # Confluent Cloud — SASL/PLAIN; credentials from Secrets Manager
      { Effect = "Allow"; Action = ["secretsmanager:GetSecretValue"]; Resource = "arn:aws:secretsmanager:${var.aws_region}:*:secret:${var.project}/${var.environment}/confluent/*" },
      { Effect = "Allow"; Action = ["s3:PutObject"]; Resource = "${aws_s3_bucket.data_lake.arn}/satellite/*" },
      { Effect = "Allow"; Action = ["ssm:GetParameter"]; Resource = "arn:aws:ssm:${var.aws_region}:*:parameter/${var.project}/${var.environment}/*" },
      { Effect = "Allow"; Action = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]; Resource = "arn:aws:logs:*:*:*" },
    ]
  })
}

resource "aws_lambda_function" "satellite_kinesis_bridge" {
  function_name = "${var.project}-satellite-kinesis-bridge"
  role          = aws_iam_role.lambda_satellite_bridge.arn
  runtime       = "python3.12"
  handler       = "handler.lambda_handler"
  timeout       = 60
  memory_size   = 256

  filename         = "${path.module}/../lambda/satellite_bridge.zip"
  source_code_hash = fileexists("${path.module}/../lambda/satellite_bridge.zip") ? filebase64sha256("${path.module}/../lambda/satellite_bridge.zip") : "placeholder"

  environment {
    variables = {
      KAFKA_BOOTSTRAP       = aws_ssm_parameter.confluent_bootstrap.value
      CONFLUENT_SECRET_NAME = aws_secretsmanager_secret.confluent_lambda.name
      KAFKA_TOPIC     = "data.cleaned"
      S3_BUCKET       = aws_s3_bucket.data_lake.id
      S3_PREFIX       = "satellite/"
    }
  }

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.kafka.id]
  }
}

resource "aws_lambda_event_source_mapping" "satellite_kinesis" {
  event_source_arn              = aws_kinesis_stream.satellite_data.arn
  function_name                 = aws_lambda_function.satellite_kinesis_bridge.arn
  starting_position             = "LATEST"
  batch_size                    = 100
  bisect_batch_on_function_error = true
  parallelization_factor         = 2
}

# ─── CloudWatch Alarm: satellite contact missed ───────────────────────────────

resource "aws_cloudwatch_metric_alarm" "satellite_data_gap" {
  alarm_name          = "${var.project}-${var.environment}-satellite-data-gap"
  alarm_description   = "No satellite data received in 12 hours"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  threshold           = 1
  period              = 43200   # 12 hours
  statistic           = "SampleCount"
  namespace           = "AWS/Kinesis"
  metric_name         = "IncomingRecords"
  dimensions          = { StreamName = aws_kinesis_stream.satellite_data.name }
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

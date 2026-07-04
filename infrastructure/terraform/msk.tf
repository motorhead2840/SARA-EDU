# ─── MSK DEPRECATED ──────────────────────────────────────────────────────────
#
# AWS Managed Streaming for Kafka (MSK) has been replaced by Confluent Cloud.
# See: confluent.tf
#
# All topic definitions, partition configs, and retention settings have been
# migrated to confluent_kafka_topic resources in confluent.tf.
#
# The kafka_topic_provisioner Lambda (lambda/kafka_topics/) is no longer needed
# because Confluent topics are now managed directly in Terraform.
#
# The MSK security group (aws_security_group.kafka) defined in vpc.tf can be
# removed on the next terraform apply once no MSK resources remain.
#
# REMOVAL CHECKLIST (run once after this file is committed):
#   1. terraform state rm aws_msk_cluster.main
#   2. terraform state rm aws_msk_configuration.main
#   3. terraform state rm aws_kms_key.kafka
#   4. terraform state rm aws_cloudwatch_log_group.kafka
#   5. terraform state rm aws_lambda_function.kafka_topic_provisioner
#   6. Destroy the MSK cluster via AWS console (or terraform destroy -target)
#   7. Remove aws_security_group.kafka from vpc.tf
# ─────────────────────────────────────────────────────────────────────────────

"""
DEPRECATED — Kafka topic provisioner Lambda.

This Lambda is no longer needed.

Confluent Cloud Kafka topics are now managed directly in Terraform via
confluent_kafka_topic resources in infrastructure/terraform/confluent.tf.

All 17 topics (12 original platform topics + 5 Research Navigator topics)
are created by 'terraform apply' with no Lambda invocation required.

Keeping this file for reference. Do NOT invoke this Lambda against a
Confluent cluster — it uses the old MSK IAM auth mechanism.

Original MSK topic list (now in confluent.tf as confluent_kafka_topic):
  shri.session.events      shri.chat.messages       shri.frustration.events
  subscription.created     subscription.cancelled
  payment.fiat.events      payment.crypto.events
  mentor.metrics.snapshots blockchain.token.events
  data.cleaned             opensearch.ingestion     sagemaker.features
  academic.course.viewed   academic.search.query    academic.plan.generated
  academic.profile.saved   academic.opensearch.sync
"""

import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.warning(
        "kafka_topic_provisioner is DEPRECATED. "
        "Topics are now managed by Terraform (confluent_kafka_topic in confluent.tf). "
        "This Lambda should be removed from EventBridge and decommissioned."
    )
    return {
        "statusCode": 410,
        "message": "Deprecated — topics managed by Terraform/Confluent Cloud",
    }

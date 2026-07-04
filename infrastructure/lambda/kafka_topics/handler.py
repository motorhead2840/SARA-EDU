"""
Kafka topic provisioner Lambda.
Invoked once after MSK cluster creation to create all required topics.
Idempotent: skips topics that already exist.
"""

import json
import logging
import os
import socket
import struct

logger = logging.getLogger()
logger.setLevel(logging.INFO)

KAFKA_BOOTSTRAP = os.environ["KAFKA_BOOTSTRAP"]
TOPICS_JSON     = os.environ["TOPICS_JSON"]


def lambda_handler(event, context):
    topics = json.loads(TOPICS_JSON)
    logger.info("Provisioning %d Kafka topics on %s", len(topics), KAFKA_BOOTSTRAP)

    try:
        from kafka import KafkaAdminClient  # type: ignore
        from kafka.admin import NewTopic    # type: ignore
        from kafka.errors import TopicAlreadyExistsError  # type: ignore

        admin = KafkaAdminClient(
            bootstrap_servers=KAFKA_BOOTSTRAP,
            security_protocol="SASL_SSL",
            sasl_mechanism="AWS_MSK_IAM",
            client_id="lambda-topic-provisioner",
        )

        existing = set(admin.list_topics())
        new_topics = []
        for t in topics:
            if t["name"] in existing:
                logger.info("Topic '%s' already exists — skipping", t["name"])
                continue
            new_topics.append(NewTopic(
                name=t["name"],
                num_partitions=t.get("partitions", 6),
                replication_factor=3,
                topic_configs={
                    "retention.ms":   str(t.get("retention_ms", 604_800_000)),
                    "compression.type": "lz4",
                    "min.insync.replicas": "2",
                },
            ))

        if new_topics:
            admin.create_topics(new_topics)
            logger.info("Created %d topics: %s", len(new_topics), [t.name for t in new_topics])
        else:
            logger.info("All topics already exist")

        admin.close()
        return {"statusCode": 200, "created": len(new_topics), "skipped": len(topics) - len(new_topics)}

    except Exception as exc:
        logger.exception("Topic provisioning failed: %s", exc)
        raise

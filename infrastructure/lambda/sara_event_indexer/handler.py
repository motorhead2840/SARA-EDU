"""
SARA Token Event Indexer Lambda
--------------------------------
Polls Etherscan API for new ERC-20 Transfer events on the SARA token contract,
publishes each new event to the 'blockchain.token.events' Kafka topic, and
indexes into OpenSearch.

Triggered every 5 minutes by EventBridge.
Uses SSM Parameter Store for the last-processed block number (checkpoint).
"""

import json
import logging
import os
import time
from typing import Any

import boto3
import urllib.request
import urllib.parse

logger = logging.getLogger()
logger.setLevel(logging.INFO)

KAFKA_BOOTSTRAP  = os.environ.get("KAFKA_BOOTSTRAP", "")
KAFKA_TOPIC      = os.environ.get("KAFKA_TOPIC", "blockchain.token.events")
OPENSEARCH_URL   = os.environ.get("OPENSEARCH_URL", "")
AWS_REGION       = os.environ.get("AWS_REGION", "us-east-1")
CONTRACT_SECRET  = os.environ.get("SARA_CONTRACT_SECRET", "")
ETHERSCAN_SECRET = os.environ.get("ETHERSCAN_SECRET", "")

SSM_CHECKPOINT_KEY = f"/sri/production/blockchain/sara_last_block"

ssm = boto3.client("ssm", region_name=AWS_REGION)
sm  = boto3.client("secretsmanager", region_name=AWS_REGION)


def _get_secret(secret_name: str) -> str:
    try:
        resp = sm.get_secret_value(SecretId=secret_name)
        return resp.get("SecretString", "")
    except Exception as exc:
        logger.warning("Could not fetch secret %s: %s", secret_name, exc)
        return ""


def _get_checkpoint() -> int:
    try:
        resp = ssm.get_parameter(Name=SSM_CHECKPOINT_KEY)
        return int(resp["Parameter"]["Value"])
    except ssm.exceptions.ParameterNotFound:
        return 0
    except Exception as exc:
        logger.warning("Checkpoint read failed: %s", exc)
        return 0


def _set_checkpoint(block_number: int) -> None:
    try:
        ssm.put_parameter(
            Name=SSM_CHECKPOINT_KEY,
            Value=str(block_number),
            Type="String",
            Overwrite=True,
        )
    except Exception as exc:
        logger.warning("Checkpoint write failed: %s", exc)


def _fetch_etherscan_events(contract: str, api_key: str, start_block: int) -> list[dict]:
    """Fetch ERC-20 Transfer events from Etherscan tokentx API."""
    params = urllib.parse.urlencode({
        "module":     "account",
        "action":     "tokentx",
        "contractaddress": contract,
        "startblock": start_block,
        "endblock":   999999999,
        "sort":       "asc",
        "apikey":     api_key,
    })
    url = f"https://api.etherscan.io/api?{params}"
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = json.loads(resp.read())
        if data.get("status") == "1":
            return data.get("result", [])
        logger.info("Etherscan returned status %s: %s", data.get("status"), data.get("message"))
        return []
    except Exception as exc:
        logger.error("Etherscan API error: %s", exc)
        return []


def _publish_to_kafka(events: list[dict]) -> int:
    """Publish events to MSK Kafka. Returns count published."""
    if not KAFKA_BOOTSTRAP or not events:
        return 0
    try:
        from kafka import KafkaProducer  # type: ignore
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP.split(","),
            security_protocol="SASL_SSL",
            sasl_mechanism="AWS_MSK_IAM",
            value_serializer=lambda v: json.dumps(v).encode(),
            key_serializer=lambda k: k.encode() if k else None,
        )
        for ev in events:
            # Use tx_hash as the Kafka key for idempotency/partitioning
            producer.send(KAFKA_TOPIC, key=ev.get("tx_hash"), value=ev)
        producer.flush()
        producer.close()
        return len(events)
    except Exception as exc:
        logger.error("Kafka publish failed: %s", exc)
        return 0


def _index_to_opensearch(events: list[dict]) -> None:
    """Bulk-index events into OpenSearch sri-blockchain-token-events."""
    if not OPENSEARCH_URL or not events:
        return
    try:
        from opensearchpy import OpenSearch, helpers  # type: ignore
        client = OpenSearch(hosts=[OPENSEARCH_URL], use_ssl=True, verify_certs=True)
        # Use tx_hash as the document _id for idempotent upserts
        actions = [{"_index": "sri-blockchain-token-events", "_id": ev.get("tx_hash") or str(i), "_source": ev} for i, ev in enumerate(events)]
        success, errors = helpers.bulk(client, actions, raise_on_error=False)
        logger.info("OpenSearch: %d indexed, %d errors", success, len(errors))
    except Exception as exc:
        logger.warning("OpenSearch index failed: %s", exc)


def lambda_handler(event: dict, context: Any) -> dict:
    contract_address = _get_secret(CONTRACT_SECRET)
    etherscan_api_key = _get_secret(ETHERSCAN_SECRET)

    if not contract_address:
        logger.error("SARA contract address not found in Secrets Manager at %s", CONTRACT_SECRET)
        return {"statusCode": 500, "error": "Missing SARA contract address"}

    start_block = _get_checkpoint()
    logger.info("Polling SARA events from block %d", start_block)

    raw_events = _fetch_etherscan_events(contract_address, etherscan_api_key, start_block)
    if not raw_events:
        logger.info("No new SARA events found")
        return {"statusCode": 200, "published": 0}

    # Transform and enrich
    enriched = []
    max_block = start_block
    for tx in raw_events:
        block_num = int(tx.get("blockNumber", 0))
        # tx_hash is the canonical field name — used as Kafka key and OpenSearch _id
        tx_hash = tx.get("hash", "")
        enriched.append({
            "tx_hash":     tx_hash,
            "from":        tx.get("from", "").lower(),
            "to":          tx.get("to", "").lower(),
            "value":       tx.get("value"),
            "token_name":  tx.get("tokenName", "SARA"),
            "token_symbol":tx.get("tokenSymbol", "SARA"),
            "block_number":block_num,
            "timestamp":   int(tx.get("timeStamp", 0)) * 1000,  # ms epoch
            "gas_used":    tx.get("gasUsed"),
            "event_type":  "Transfer",
            "network":     "mainnet",
            "_indexed_at": int(time.time() * 1000),
        })
        max_block = max(max_block, block_num)

    published = _publish_to_kafka(enriched)
    _index_to_opensearch(enriched)

    # Advance checkpoint past the last processed block
    if max_block > start_block:
        _set_checkpoint(max_block + 1)
        logger.info("Checkpoint advanced to block %d", max_block + 1)

    logger.info("Processed %d SARA events, published %d to Kafka", len(enriched), published)
    return {"statusCode": 200, "events_found": len(enriched), "published": published, "last_block": max_block}

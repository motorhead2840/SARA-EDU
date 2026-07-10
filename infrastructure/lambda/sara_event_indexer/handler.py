"""
SARA Token Event Indexer Lambda
--------------------------------
Polls Etherscan API for new ERC-20 Transfer events on the SARA token contract,
publishes each new event to the 'blockchain.token.events' Confluent Kafka topic,
and indexes into OpenSearch.

Auth: Confluent Cloud SASL/PLAIN — credentials from Secrets Manager.
Was:  AWS MSK IAM SASL (changed when MSK was replaced by Confluent Cloud).

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

KAFKA_TOPIC      = os.environ.get("KAFKA_TOPIC", "blockchain.token.events")
OPENSEARCH_URL   = os.environ.get("OPENSEARCH_URL", "")
AWS_REGION       = os.environ.get("AWS_REGION", "us-east-1")
CONTRACT_SECRET  = os.environ.get("SARA_CONTRACT_SECRET", "")
ETHERSCAN_SECRET = os.environ.get("ETHERSCAN_SECRET", "")
CONFLUENT_SECRET = os.environ.get("CONFLUENT_SECRET_NAME", "sri/production/confluent/lambda-key")

SSM_CHECKPOINT_KEY = "/sri/production/blockchain/sara_last_block"
OS_INDEX           = "blockchain-token-events"

ssm = boto3.client("ssm",            region_name=AWS_REGION)
sm  = boto3.client("secretsmanager", region_name=AWS_REGION)

_confluent_producer = None


def _get_confluent_producer():
    global _confluent_producer
    if _confluent_producer:
        return _confluent_producer
    try:
        from confluent_kafka import Producer  # type: ignore
        secret = json.loads(sm.get_secret_value(SecretId=CONFLUENT_SECRET)["SecretString"])
        bootstrap = secret["bootstrap"].replace("SASL_SSL://", "").replace("SSL://", "")
        _confluent_producer = Producer({
            "bootstrap.servers":  bootstrap,
            "security.protocol": "SASL_SSL",
            "sasl.mechanisms":   "PLAIN",
            "sasl.username":     secret["api_key"],
            "sasl.password":     secret["api_secret"],
            "client.id":         "sara-event-indexer",
            "acks":              "1",
            "retries":           3,
        })
        logger.info("Confluent producer initialised for sara-event-indexer")
        return _confluent_producer
    except Exception as exc:
        logger.warning("Confluent producer init failed: %s", exc)
        return None


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


def _fetch_token_events(contract: str, api_key: str, from_block: int) -> list[dict]:
    params = urllib.parse.urlencode({
        "module":          "account",
        "action":          "tokentx",
        "contractaddress": contract,
        "startblock":      from_block,
        "endblock":        "latest",
        "sort":            "asc",
        "apikey":          api_key,
    })
    url = f"https://api.etherscan.io/api?{params}"
    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            data = json.loads(resp.read())
        if data.get("status") == "1":
            return data.get("result", [])
        logger.info("Etherscan: %s", data.get("message", "no events"))
        return []
    except Exception as exc:
        logger.warning("Etherscan fetch failed: %s", exc)
        return []


def _publish_to_kafka(producer, event: dict) -> None:
    if producer is None:
        return
    payload = json.dumps({
        "tx_hash":    event.get("hash", ""),
        "from":       event.get("from", ""),
        "to":         event.get("to", ""),
        "value":      event.get("value", "0"),
        "token_name": event.get("tokenName", "SARA"),
        "block":      int(event.get("blockNumber", 0)),
        "timestamp":  int(event.get("timeStamp", 0)),
        "_source":    "sara-event-indexer",
    })
    tx_hash = event.get("hash", "unknown")
    try:
        producer.produce(KAFKA_TOPIC, key=tx_hash.encode(), value=payload.encode())
    except Exception as exc:
        logger.warning("Kafka produce failed for tx %s: %s", tx_hash, exc)


def _index_to_opensearch(event: dict, _api_key: str = "") -> None:
    """Index a single SARA token event to OpenSearch with AWS SigV4 signing."""
    if not OPENSEARCH_URL:
        return
    tx_hash = event.get("hash", "unknown")
    doc = {
        "tx_hash":    tx_hash,
        "from":       event.get("from", ""),
        "to":         event.get("to", ""),
        "value":      event.get("value", "0"),
        "token_name": event.get("tokenName", "SARA"),
        "block":      int(event.get("blockNumber", 0)),
        "timestamp":  int(event.get("timeStamp", 0)),
    }
    url = f"{OPENSEARCH_URL}/{OS_INDEX}/_doc/{tx_hash}"
    body = json.dumps(doc).encode()

    try:
        import botocore.auth
        import botocore.awsrequest
        import botocore.session

        session     = botocore.session.get_session()
        credentials = session.get_credentials().get_frozen_credentials()
        service     = "es"
        region      = AWS_REGION

        request = botocore.awsrequest.AWSRequest(
            method="PUT",
            url=url,
            data=body,
            headers={"Content-Type": "application/json"},
        )
        signer = botocore.auth.SigV4Auth(credentials, service, region)
        signer.add_auth(request)

        prepared = request.prepare()
        # Convert to urllib Request
        req = urllib.request.Request(
            prepared.url,
            data=body,
            method="PUT",
            headers=dict(prepared.headers),
        )
        with urllib.request.urlopen(req, timeout=10):
            pass
    except Exception as exc:
        logger.warning("OpenSearch index failed for tx %s: %s", tx_hash, exc)


def lambda_handler(event: Any, context: Any) -> dict:
    contract_raw = _get_secret(CONTRACT_SECRET)
    etherscan_raw = _get_secret(ETHERSCAN_SECRET)

    try:
        contract_data = json.loads(contract_raw)
        contract_address = contract_data.get("contract_address", "")
    except (json.JSONDecodeError, AttributeError):
        contract_address = contract_raw

    try:
        etherscan_data = json.loads(etherscan_raw)
        etherscan_api_key = etherscan_data.get("api_key", "")
    except (json.JSONDecodeError, AttributeError):
        etherscan_api_key = etherscan_raw

    if not contract_address or not etherscan_api_key:
        logger.error("Missing SARA contract address or Etherscan API key")
        return {"statusCode": 500, "error": "Missing configuration"}

    from_block = _get_checkpoint() or 1
    logger.info("Fetching SARA events from block %d", from_block)

    events = _fetch_token_events(contract_address, etherscan_api_key, from_block)
    if not events:
        logger.info("No new events since block %d", from_block)
        return {"statusCode": 200, "processed": 0}

    producer = _get_confluent_producer()
    max_block = from_block

    for tx in events:
        _publish_to_kafka(producer, tx)
        _index_to_opensearch(tx, etherscan_api_key)
        block = int(tx.get("blockNumber", 0))
        if block > max_block:
            max_block = block

    if producer:
        producer.flush(timeout=30)

    _set_checkpoint(max_block + 1)
    logger.info("Processed %d events, checkpoint now block %d", len(events), max_block + 1)
    return {"statusCode": 200, "processed": len(events), "new_checkpoint": max_block + 1}

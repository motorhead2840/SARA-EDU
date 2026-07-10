"""
OpenSearch Index Provisioner Lambda
-------------------------------------
Idempotently creates index templates and ISM policies in OpenSearch.
Invoked once after the domain is active (terraform apply triggers it via
a null_resource or manual invocation).

Required env vars:
  OPENSEARCH_URL           — https endpoint of the domain
  INDEX_TEMPLATES_JSON     — JSON of template name → template body
  ISM_POLICIES_JSON        — JSON of policy name → policy body
  AWS_REGION
"""

import json
import logging
import os
import urllib.request
import urllib.parse
from typing import Any

import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.credentials import Credentials

logger = logging.getLogger()
logger.setLevel(logging.INFO)

OPENSEARCH_URL = os.environ.get("OPENSEARCH_URL", "").rstrip("/")
TEMPLATES_JSON = os.environ.get("INDEX_TEMPLATES_JSON", "{}")
POLICIES_JSON  = os.environ.get("ISM_POLICIES_JSON", "{}")
AWS_REGION     = os.environ.get("AWS_REGION", "us-east-1")


def _signed_request(method: str, path: str, body: dict | None = None) -> tuple[int, dict]:
    """Make a SigV4-signed request to OpenSearch."""
    session = boto3.session.Session()
    creds = session.get_credentials().get_frozen_credentials()

    url = f"{OPENSEARCH_URL}{path}"
    body_bytes = json.dumps(body).encode() if body else b""

    aws_request = AWSRequest(
        method=method,
        url=url,
        data=body_bytes,
        headers={"Content-Type": "application/json", "Host": urllib.parse.urlparse(url).netloc},
    )
    SigV4Auth(creds, "es", AWS_REGION).add_auth(aws_request)

    req = urllib.request.Request(
        url=url,
        data=body_bytes if body_bytes else None,
        headers=dict(aws_request.headers),
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
            # HEAD responses have no body; treat as empty success dict
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"raw": raw.decode(errors="replace")}
        return exc.code, parsed
    except Exception as exc:
        logger.error("HTTP request failed: %s", exc)
        return 500, {"error": str(exc)}


def _provision_index_templates(templates: dict) -> dict:
    results = {}
    for name, body in templates.items():
        status, resp = _signed_request("PUT", f"/_index_template/{name}", body)
        results[name] = {"status": status, "acknowledged": resp.get("acknowledged", False)}
        if status in (200, 201):
            logger.info("Template '%s' created/updated", name)
        else:
            logger.warning("Template '%s' failed (%d): %s", name, status, resp)
    return results


def _provision_ism_policies(policies: dict) -> dict:
    """Create ISM policies via OpenSearch _plugins/_ism/policies API."""
    results = {}
    for name, body in policies.items():
        # Check if policy exists first
        check_status, _ = _signed_request("GET", f"/_plugins/_ism/policies/{name}")
        if check_status == 200:
            logger.info("ISM policy '%s' already exists — skipping", name)
            results[name] = {"status": 200, "skipped": True}
            continue

        status, resp = _signed_request("PUT", f"/_plugins/_ism/policies/{name}", {"policy": body})
        results[name] = {"status": status, "policy_id": resp.get("_id")}
        if status in (200, 201):
            logger.info("ISM policy '%s' created", name)
        else:
            logger.warning("ISM policy '%s' failed (%d): %s", name, status, resp)
    return results


def _provision_index_aliases() -> None:
    """Create write aliases for all known index patterns."""
    aliases = {
        "sri-shri-session-events":    "sri-shri-session-events-000001",
        "sri-subscription-created":   "sri-subscription-created-000001",
        "sri-payment-fiat-events":    "sri-payment-fiat-events-000001",
        "sri-payment-crypto-events":  "sri-payment-crypto-events-000001",
        "sri-mentor-metrics":         "sri-mentor-metrics-snapshots-000001",
        "sri-blockchain-token-events":"sri-blockchain-token-events-000001",
    }
    for alias, initial_index in aliases.items():
        # Create the initial index if not exists
        status, _ = _signed_request("HEAD", f"/{initial_index}")
        if status != 200:
            _, _ = _signed_request("PUT", f"/{initial_index}", {
                "aliases": {alias: {"is_write_index": True}}
            })
            logger.info("Created initial index %s with alias %s", initial_index, alias)
        else:
            logger.info("Index %s already exists", initial_index)


def lambda_handler(event: dict, context: Any) -> dict:
    if not OPENSEARCH_URL:
        return {"statusCode": 500, "error": "OPENSEARCH_URL not set"}

    # Wait for domain to be ready (simple ping)
    status, _ = _signed_request("GET", "/_cluster/health")
    if status not in (200, 206):
        return {"statusCode": 503, "error": f"OpenSearch not ready (HTTP {status})"}

    templates = json.loads(TEMPLATES_JSON)
    policies  = json.loads(POLICIES_JSON)

    template_results = _provision_index_templates(templates)
    policy_results   = _provision_ism_policies(policies)
    _provision_index_aliases()

    logger.info("Provisioning complete: %d templates, %d ISM policies", len(template_results), len(policy_results))
    return {
        "statusCode": 200,
        "templates":  template_results,
        "ism_policies": policy_results,
    }

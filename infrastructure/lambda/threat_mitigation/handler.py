"""
Global Defense Network - Threat Mitigation Lambda
-------------------------------------------------
Consumes detected threats from the 'security.detected.threats' Confluent Kafka topic
(via AWS Lambda Kafka Event Source Mapping or direct invocation) and dynamically
updates the AWS WAFv2 IP Sets to block malicious actors globally in real-time.

Features:
- Handles both IPv4 and IPv6 addresses.
- Graceful concurrency handling using lock token retrieval and retry logic.
- Cloud-native Kafka trigger parsing (Base64-decoded record payloads).
"""

import base64
import ipaddress
import json
import logging
import os
import time
from typing import Any
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# ─── Configuration ───────────────────────────────────────────────────────────
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
IPV4_SET_ID = os.environ.get("WAF_IPV4_SET_ID", "")
IPV4_SET_NAME = os.environ.get("WAF_IPV4_SET_NAME", "")
IPV6_SET_ID = os.environ.get("WAF_IPV6_SET_ID", "")
IPV6_SET_NAME = os.environ.get("WAF_IPV6_SET_NAME", "")
WAF_SCOPE = os.environ.get("WAF_SCOPE", "CLOUDFRONT") # Must be CLOUDFRONT for globally scoped WAF

# Resilience & Retries
MAX_UPDATE_RETRIES = int(os.environ.get("MAX_UPDATE_RETRIES", "5"))
INITIAL_BACKOFF_DELAY_SECONDS = float(os.environ.get("INITIAL_BACKOFF_DELAY_SECONDS", "0.5"))

# WAFv2 client must be in us-east-1 for CLOUDFRONT scope
waf_client = boto3.client("wafv2", region_name="us-east-1" if WAF_SCOPE == "CLOUDFRONT" else AWS_REGION)


def is_valid_ipv4(ip: str) -> bool:
    """Validate if the string is a standard IPv4 address."""
    try:
        raw_ip = ip.split("/")[0]
        return ipaddress.ip_address(raw_ip).version == 4
    except ValueError:
        return False


def is_valid_ipv6(ip: str) -> bool:
    """Validate if the string is a valid IPv6 address."""
    try:
        raw_ip = ip.split("/")[0]
        return ipaddress.ip_address(raw_ip).version == 6
    except ValueError:
        return False


def update_waf_ip_set(ip_set_id: str, ip_set_name: str, new_ips: list[str]) -> bool:
    """
    Safely adds list of IPs to an AWS WAFv2 IP Set.
    Implements a read-modify-write pattern with backoff retries to handle lock conflicts.
    """
    if not ip_set_id or not ip_set_name:
        logger.error("WAF IP Set ID or Name is not configured.")
        return False

    backoff_delay = INITIAL_BACKOFF_DELAY_SECONDS

    for attempt in range(MAX_UPDATE_RETRIES):
        try:
            # 1. Fetch current IP set to get LockToken and existing addresses
            response = waf_client.get_ip_set(
                Name=ip_set_name,
                Scope=WAF_SCOPE,
                Id=ip_set_id
            )
            lock_token = response["LockToken"]
            current_addresses = response.get("IPSet", {}).get("Addresses", [])

            # 2. Append new IPs (WAF IP Set requires CIDR suffix, e.g., /32 or /128)
            updated_addresses = set(current_addresses)
            for ip in new_ips:
                cidr_suffix = "/32" if ":" not in ip else "/128"
                ip_with_cidr = ip if "/" in ip else f"{ip}{cidr_suffix}"
                updated_addresses.add(ip_with_cidr)

            # Check if there are actual new additions
            if len(updated_addresses) == len(current_addresses):
                logger.info("IP addresses already blacklisted. No update required.")
                return True

            # 3. Update the IP Set
            waf_client.update_ip_set(
                Name=ip_set_name,
                Scope=WAF_SCOPE,
                Id=ip_set_id,
                Addresses=list(updated_addresses),
                LockToken=lock_token
            )
            logger.info("Successfully added %d IPs to WAF IP Set %s", len(new_ips), ip_set_name)
            return True

        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code")
            # Handle WAFOptimisticLockException (concurrent edits)
            if error_code in ["WAFOptimisticLockException", "WAFAssociatedItemException"]:
                logger.warning("Lock conflict or dynamic update collision. Retrying in %f sec...", backoff_delay)
                time.sleep(backoff_delay)
                backoff_delay *= 2
            else:
                logger.error("Failed to update WAF IP Set %s: %s", ip_set_name, exc)
                break
        except Exception as exc:
            logger.error("Unexpected error updating WAF IP Set %s: %s", ip_set_name, exc)
            break

    return False


def lambda_handler(event: dict, _context: Any) -> dict:
    """
    AWS Lambda entry point. Parses Confluent Kafka event records,
    classifies malicious source IPs, and applies mitigation.
    """
    logger.info("Received Global Defense Network mitigation event.")

    records = event.get("records", {})
    if not records:
        logger.warning("No records found in the incoming Lambda invocation event.")
        return {"statusCode": 200, "message": "No records to process"}

    ipv4_to_block = []
    ipv6_to_block = []

    # Iterate over all topic-partitions in the Lambda Kafka batch
    for topic_partition, partition_records in records.items():
        logger.info("Processing partition: %s with %d records", topic_partition, len(partition_records))

        for record in partition_records:
            try:
                # AWS Lambda Kafka integration base64 encodes the message payload
                raw_payload = record.get("value", "")
                if not raw_payload:
                    continue

                decoded_bytes = base64.b64decode(raw_payload)
                threat_data = json.loads(decoded_bytes.decode("utf-8"))

                # Expected schema: { "source_ip": "1.2.3.4", "threat_type": "credential_stuffing", "confidence": 0.95 }
                source_ip = threat_data.get("source_ip", "").strip()
                if not source_ip:
                    continue

                if is_valid_ipv4(source_ip):
                    ipv4_to_block.append(source_ip)
                elif is_valid_ipv6(source_ip):
                    ipv6_to_block.append(source_ip)
                else:
                    logger.warning("Discarding invalid/unsupported IP format: %s", source_ip)

            except Exception as exc:
                logger.error("Failed to parse threat record value: %s", exc)

    # Apply mitigation dynamically to WAF IPv4 blocklist
    ipv4_success = True
    if ipv4_to_block:
        logger.info("Mitigating %d IPv4 threat actors: %s", len(ipv4_to_block), ipv4_to_block)
        ipv4_success = update_waf_ip_set(IPV4_SET_ID, IPV4_SET_NAME, ipv4_to_block)

    # Apply mitigation dynamically to WAF IPv6 blocklist
    ipv6_success = True
    if ipv6_to_block:
        logger.info("Mitigating %d IPv6 threat actors: %s", len(ipv6_to_block), ipv6_to_block)
        ipv6_success = update_waf_ip_set(IPV6_SET_ID, IPV6_SET_NAME, ipv6_to_block)

    status_code = 200 if (ipv4_success and ipv6_success) else 500
    return {
        "statusCode": status_code,
        "mitigated_ipv4_count": len(ipv4_to_block),
        "mitigated_ipv6_count": len(ipv6_to_block),
        "status": "success" if status_code == 200 else "partial_failure"
    }

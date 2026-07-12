# ─── Global AWS WAF and Shield Security Configuration ──────────────────────────
#
# Scope: CLOUDFRONT (Global) — deployed in us-east-1 to protect the CloudFront distribution.
# This file defines the Web Application Firewall (WAF) to prevent DDoS, credential stuffing,
# automated abuse, and provides an empty IP Set for real-time dynamic mitigation.

# ── IP Sets for Dynamic Mitigation ──────────────────────────────────────────

resource "aws_wafv2_ip_set" "malicious_ips_ipv4" {
  name               = "${var.project}-${var.environment}-malicious-ips-ipv4"
  description        = "Dynamic IP Blocklist (IPv4) managed by automated mitigation Lambda"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"

  # Initialized as empty; dynamically updated by the Mitigation Lambda in real-time
  addresses = []

  lifecycle {
    ignore_changes = [
      addresses, # Prevent Terraform from resetting dynamically blocked IPs on next apply
    ]
  }
}

resource "aws_wafv2_ip_set" "malicious_ips_ipv6" {
  name               = "${var.project}-${var.environment}-malicious-ips-ipv6"
  description        = "Dynamic IP Blocklist (IPv6) managed by automated mitigation Lambda"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV6"

  # Initialized as empty; dynamically updated by the Mitigation Lambda in real-time
  addresses = []

  lifecycle {
    ignore_changes = [
      addresses, # Prevent Terraform from resetting dynamically blocked IPs on next apply
    ]
  }
}

# ── Web ACL Definition ────────────────────────────────────────────────────────

resource "aws_wafv2_web_acl" "global_defense_network" {
  name        = "${var.project}-${var.environment}-global-defense-network"
  description = "Global Defense Network Web ACL for exascale threat mitigation"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # 1. Rule to block dynamically detected IPv4 adversaries
  rule {
    name     = "Dynamic-Block-IPv4"
    priority = 1

    action {
      block {}
    }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.malicious_ips_ipv4.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "DynamicBlockIPv4Metric"
      sampled_requests_enabled   = true
    }
  }

  # 2. Rule to block dynamically detected IPv6 adversaries
  rule {
    name     = "Dynamic-Block-IPv6"
    priority = 2

    action {
      block {}
    }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.malicious_ips_ipv6.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "DynamicBlockIPv6Metric"
      sampled_requests_enabled   = true
    }
  }

  # 3. Strict Rate Limiting Rule (Mitigates brute-force/scraping/credential stuffing)
  rule {
    name     = "Strict-Rate-Limit"
    priority = 10

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 500
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "StrictRateLimitMetric"
      sampled_requests_enabled   = true
    }
  }

  # 4. AWS Managed Common Rule Set (OWASP Top 10 protection)
  rule {
    name     = "AWS-ManagedRules-CommonRuleSet"
    priority = 20

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "GlobalDefenseNetworkWebACLMetric"
    sampled_requests_enabled   = true
  }
}

# ── Outputs ───────────────────────────────────────────────────────────────────

output "waf_web_acl_id" {
  description = "The ID of the Global Defense Network WAF Web ACL"
  value       = aws_wafv2_web_acl.global_defense_network.id
}

output "waf_web_acl_arn" {
  description = "The ARN of the Global Defense Network WAF Web ACL"
  value       = aws_wafv2_web_acl.global_defense_network.arn
}

output "waf_ipv4_ip_set_id" {
  description = "The ID of the IPv4 dynamic blocklist IP Set"
  value       = aws_wafv2_ip_set.malicious_ips_ipv4.id
}

output "waf_ipv4_ip_set_name" {
  description = "The Name of the IPv4 dynamic blocklist IP Set"
  value       = aws_wafv2_ip_set.malicious_ips_ipv4.name
}

output "waf_ipv6_ip_set_id" {
  description = "The ID of the IPv6 dynamic blocklist IP Set"
  value       = aws_wafv2_ip_set.malicious_ips_ipv6.id
}

output "waf_ipv6_ip_set_name" {
  description = "The Name of the IPv6 dynamic blocklist IP Set"
  value       = aws_wafv2_ip_set.malicious_ips_ipv6.name
}

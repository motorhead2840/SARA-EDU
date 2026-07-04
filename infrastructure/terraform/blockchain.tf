# ─── AWS Managed Blockchain ───────────────────────────────────────────────────
# Provisions an Ethereum node (Goerli testnet for staging, mainnet for production)
# giving the platform a dedicated, private Ethereum RPC endpoint without
# relying on public providers like Infura.

resource "aws_managed_blockchain_network" "ethereum" {
  count = 0  # Set to 1 to provision. Ethereum networks on AMB are created once.
             # For now AMB Ethereum nodes are attached to existing networks.
}

# AMB Ethereum Accessor — provides an HTTP Billing Token for Ethereum node access
resource "aws_managed_blockchain_accessor" "ethereum" {
  accessor_type = "BILLING_TOKEN"
  tags          = { Name = "${var.project}-${var.environment}-eth-accessor" }
}

# Store the accessor billing token in Secrets Manager so ECS tasks can use it
resource "aws_secretsmanager_secret" "eth_accessor_token" {
  name                    = "${var.project}/${var.environment}/blockchain/eth_accessor_token"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "eth_accessor_token" {
  secret_id     = aws_secretsmanager_secret.eth_accessor_token.id
  secret_string = aws_managed_blockchain_accessor.ethereum.billing_token
}

# AMB Ethereum endpoint — injected into ECS task envvars via Secrets Manager
# Format: https://mainnet.ethereum.managedblockchain.us-east-1.amazonaws.com/?billingtoken=<TOKEN>
locals {
  amb_ethereum_endpoint = "https://mainnet.ethereum.managedblockchain.${var.aws_region}.amazonaws.com"
}

# SSM parameter so MWAA DAGs can resolve the endpoint without hard-coding
resource "aws_ssm_parameter" "eth_endpoint" {
  name  = "/${var.project}/${var.environment}/blockchain/eth_endpoint"
  type  = "String"
  value = local.amb_ethereum_endpoint
}

# ─── Hyperledger Fabric (private permissioned network for SARA governance) ────
# Uncomment when a private network for governance/voting is required.
#
# resource "aws_managed_blockchain_network" "fabric" {
#   name           = "${var.project}-${var.environment}-fabric"
#   framework      = "HYPERLEDGER_FABRIC"
#   framework_version = "2.2"
#   edition        = "STARTER"
#   voting_policy {
#     approval_threshold_policy {
#       threshold_percentage         = 50
#       proposal_duration_in_hours   = 24
#       threshold_comparator         = "GREATER_THAN"
#     }
#   }
#   member_configuration {
#     name = "${var.project}-founding-member"
#     framework_configuration {
#       fabric {
#         admin_username = "admin"
#         admin_password = random_password.db.result
#       }
#     }
#   }
# }

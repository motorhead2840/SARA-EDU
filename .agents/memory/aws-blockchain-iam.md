---
name: AWS Blockchain IAM Permissions
description: The IAM user used for AWS Managed Blockchain requires explicit policy grants; defaults deny everything.
---

## Rule
The IAM user (`SARA_IAM_REPLIT`) must have the `AmazonManagedBlockchainQueryFullAccess` managed policy (or a scoped inline policy) attached before any `managedblockchain-query:*` API calls succeed. Without it, calls fail with authorization errors even though credentials are valid.

**Why:** AWS Managed Blockchain Query is a distinct service with its own IAM namespace (`managedblockchain-query`). New IAM users have no permissions by default.

**How to apply:** Two separate IAM namespaces must be granted:
1. `managedblockchain-query:*` — for the high-level SDK (GetTokenBalance, ListTokenBalances, ListTransactions). Attach `AmazonManagedBlockchainQueryFullAccess` managed policy.
2. `managedblockchain:*` on `Resource: "*"` — for SigV4-signed JSON-RPC node calls (eth_call, eth_blockNumber, etc). Scoping to a specific node ARN does NOT work — must use `*`. Add as an inline policy.

**Observed errors (in order):**
- `not authorized to perform: managedblockchain-query:GetTokenBalance` → fix #1 above
- `not authorized to perform: managedblockchain:POST` → fix #2 above

**eth_call returns `0x` (empty):** Contract does not exist at that address on that network. Returns clean `0` after code defensively handles `0x` → `0x0` conversion.

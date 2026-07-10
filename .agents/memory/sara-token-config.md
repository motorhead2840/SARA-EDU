---
name: SARA Token Integration Config
description: Env vars, routing, and contract details for the SARA ERC-20 / AWS Managed Blockchain integration.
---

## Environment Variables

| Variable | Value / Notes |
|---|---|
| `AWS_ACCESS_KEY_ID` | Replit Secret |
| `AWS_SECRET_ACCESS_KEY` | Replit Secret |
| `AWS_REGION` | `us-east-1` |
| `AWS_BLOCKCHAIN_NODE_URL` | `https://nd-5q7q2xbykzhafpbrivluwrd5vm.ethereum.managedblockchain.us-east-1.amazonaws.com` |
| `SARA_CONTRACT_ADDRESS` | `0xd9145CCE52D386f254917e481eB44e9943F39138` (Sepolia) |
| `VITE_SARA_CONTRACT_ADDRESS` | same as above |
| `VITE_API_URL` | `https://<repl-dev-domain>/api` — must match api-server preview path `/api` |

## API routing
- API server artifact serves at path `/api` (see `artifacts/api-server/.replit-artifact/artifact.toml`).
- Blockchain routes mount at `/api/blockchain/...`.
- Frontend `sara.ts` reads `VITE_API_URL` as base and appends `/blockchain/...`.

## AWS SDK notes
- Use `QueryNetwork.ETHEREUM_SEPOLIA_TESTNET` (not `ETHEREUM_SEPOLIA`) for the network enum.
- SigV4 signing uses service name `managedblockchain` (not `managedblockchain-query`).
- `eth_getLogs` excluded from RPC allowlist — too expensive for unbounded queries on AWS node.

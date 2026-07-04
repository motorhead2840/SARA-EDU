# Memory Index

- [Scholarship Scheme](scholarship-arch.md) — monthly exam → top 100 → lifetime sub; schema, routes, grant flow, subscription_source='scholarship'.

- [SecOps + RageSage](secops-ragethesage.md) — PMI content scoring, Cyberdemon outbox, RageSage SageMaker pipeline; ARN→name extraction required.

- [AWS Blockchain IAM](aws-blockchain-iam.md) — SARA_IAM_REPLIT user needs explicit ManagedBlockchain query permissions; missing by default.
- [SARA Token Config](sara-token-config.md) — contract address, node URL, env var names, and API routing for the SARA ERC-20 integration.
- [Abhaya Gate Architecture](abhaya-gate.md) — V3.0 thermodynamic phase-cancellation middleware: equation params, numerical edge cases, API routes.
- [Stripe Integration Quirks](stripe-integration-quirks.md) — connector field is `settings.secret` not `secret_key`; stripe-replit-sync must be esbuild-external; runMigrations has no schema param.
- [Shri Academy Architecture](shri-academy-arch.md) — Python FastAPI proxied via api-server; LangChain 1.x imports; ChromaDB ONNX; TS2308 Orval response schema naming rule.
- [Confluent Cloud + Research Navigator AWS](confluent-aws-migration.md) — MSK→Confluent SASL/PLAIN migration; Bedrock primary+OpenAI fallback; academic OpenSearch indices; 17 Confluent topics; kafka_utils.py pattern.
- [Global Subscription Architecture](subscription-arch.md) — GDP tiers, Stripe card+bank, ETH/USDC/BTC/SARA crypto; tx replay prevention; atomic confirm+activate.
- [Mentor Auth & Portal](mentor-auth.md) — school_mentor role, PBKDF2+HMAC auth, timingSafeEqual everywhere, no upsert on register, /mentor dashboard in Shri Academy.
- [AWS Infrastructure](aws-infrastructure.md) — Terraform IaC for full AWS stack; bootstrap script; 12 Kafka topics; MWAA DAGs; GitHub Actions OIDC CI/CD for Cyberdemon+OpenTag repos.

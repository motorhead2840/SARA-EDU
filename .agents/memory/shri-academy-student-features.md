---
name: Shri Academy Student Features
description: The four NVIDIA-powered student features added to Shri Academy — drawing pad, Nemotron games, Cosmos Lore mythology channel, and student forum.
---

# Shri Academy — NVIDIA Student Features

## The Four Features

### 1. Drawing Board (`/drawing`)
- Pure HTML5 Canvas with React hooks — no external lib
- Tools: pen, eraser, line, rect, circle, text
- Color swatches + stroke width selector in sidebar
- Export as PNG, clear canvas
- No backend — client-only

### 2. Nemotron Games (`/games` → `GET /api/games/types`, `POST /api/games/generate`)
- NVIDIA NIM API: `https://integrate.api.nvidia.com/v1`
- Model: `nvidia/llama-3.1-nemotron-70b-instruct`
- 4 game types: quiz, riddle, myth-match, code-challenge
- MythMatch shuffle: stored in `useState(() => [...data.pairs].sort(...))` — DO NOT re-shuffle on render
- JSON parser strips preamble text before `{` or `[` to handle model verbosity

### 3. Cosmos Lore Mythology Channel (`/mythology` → `GET /api/mythology/episodes`, `GET /api/mythology/traditions`, `POST /api/mythology/narrative`)
- 12 episodes across Greek, Hindu, Norse, Egyptian, Aztec, Japanese, Celtic
- Narratives generated on-demand by Nemotron (not pre-generated)
- Section parser splits on `\n(?=**[A-Z])` — case-sensitive, handles `**ORIGIN**` style headers
- Slide-in viewer panel (framer-motion from right)

### 4. Student Forum (`/forum` → `/api/forum/*`)
- DB tables: `forum_categories`, `forum_threads`, `forum_posts` in PostgreSQL
- 5 seed categories seeded on first run
- Three-view state machine: categories → thread list → thread detail
- New Thread modal: requires `activeCategory` to be set; if Browse All, falls back to `categories[0]`
- `localStorage` persists author name under `forum_author_name`

## Critical Patterns

### DB connection
Forum uses `import { pool } from "../db.js"` — NOT `getDb()` (that doesn't exist in this codebase).

### NVIDIA API Key
Secret name: `NVIDIA_API_KEY`. Used server-side only in `routes/games.ts` and `routes/mythology.ts`. Never exposed to frontend.

### Text-only enforcement
All chat/mentor POST routes have `textOnlyGuard` middleware (Node) + `TextOnlyMiddleware` (Python FastAPI) + `@field_validator` on Pydantic models. Drawing pad exports are PNG only — no upload path back to AI.

### Input validation
All `parseInt(req.params.id)` calls include `isNaN(id) || id <= 0` guards before DB queries.

## Route registration
All three new backend routers registered in `artifacts/api-server/src/routes/index.ts`:
- `/api/forum` → forum.ts
- `/api/games` → games.ts  
- `/api/mythology` → mythology.ts

Forum schema init: `initForumSchema()` called in `artifacts/api-server/src/index.ts` as `void initForum()`.

## Kafka Events (student activity topics)
Three new Confluent topics declared in `infrastructure/terraform/confluent.tf`:
- `student.game.played` — emitted in games.ts after Nemotron response, key=game_type
- `student.forum.posted` — emitted in forum.ts after thread/reply create, key=thread_id
- `student.mythology.viewed` — emitted in mythology.ts on episode fetch + narrative gen, key=episode_id

Typed helpers added to `artifacts/api-server/src/lib/kafkaProducer.ts` (kafka.studentGamePlayed, kafka.studentForumPosted, kafka.studentMythologyViewed). All fire-and-forget (`void kafka.*()`).

## AWS Deployment
- `NVIDIA_API_KEY` stored in Secrets Manager at `${project}/${env}/nvidia_api_key` (managed by Terraform `ecs.tf`)
- Injected into `api-server` ECS task definition via `secrets` block
- Terraform secret version has `lifecycle { ignore_changes = [secret_string] }` — update value via console/CLI, not Terraform
- `variable "nvidia_api_key"` added to `variables.tf` (sensitive, default "")

## Dockerfiles
- `artifacts/api-server/Dockerfile` — pnpm multi-stage build (builder → `pnpm deploy --prod` → slim runtime); build context = repo root
- `shri-academy-api/Dockerfile` — Python 3.11-slim; pre-warms ChromaDB ONNX model during build to eliminate cold-start S3 download

## CI/CD
`.github/workflows/deploy-monorepo.yml` — triggered by `v*.*.*` semver tags (also `workflow_dispatch` with `service` input).
- Two parallel jobs: `deploy-api-server` and `deploy-shri-api`
- Both use OIDC (`AWS_DEPLOY_ROLE_ARN` secret in GitHub → production environment)
- Image tags: `<registry>/<repo>:<git-tag>-<sha7>` + `:latest`
- api-server build context: repo root (`-f artifacts/api-server/Dockerfile .`)
- shri-api build context: `shri-academy-api/` directory

**To deploy:** `git tag v1.0.0 && git push --tags`
**To deploy one service:** use `workflow_dispatch` with `service=api-server` or `service=shri-api`

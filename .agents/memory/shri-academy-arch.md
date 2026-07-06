---
name: Shri Academy Architecture
description: Architecture decisions for the Shri Academy AI Mentor prototype — Python FastAPI backend routing via Node.js api-server proxy, LangChain + ChromaDB RAG, Circuit A/B frustration tracker.
---

## Architecture

- **Frontend**: `react-vite` artifact at `/shri-academy/` (port 25572)
- **Python backend**: `shri-academy-api/main.py` — FastAPI on port **8001**, registered as second service in `artifacts/api-server/.replit-artifact/artifact.toml` (name: "Python API"). The old standalone `configureWorkflow` "Shri Academy Python API" was neutralised to an echo no-op — do not re-enable it or it will steal port 8001.
- **Proxy**: Node.js api-server forwards `/api/shri/*` → `http://localhost:8001/shri-api/*` via `artifacts/api-server/src/routes/shri.ts`; registered in `routes/index.ts` under `/shri`
- **Why port 8001 not 8000**: Port 8000 was held by the old standalone workflow and couldn't be freed reliably in Replit's sandbox. Moving to 8001 was the clean fix.
- **Production deployment**: Python API runs via artifact service (production.run args: bash -c cd ... && uvicorn --port 8001 --workers 2). Standalone workflow does NOT run in production — artifact services are required.
- **OpenAPI**: Shri endpoints added to `lib/api-spec/openapi.yaml` under `/shri/chat`, `/shri/state`, `/shri/reset`; response schema named `ShriMessage` (NOT `ShriChatResponse` — Orval auto-derives `ShriChatResponse` from operationId `shriChat`, causing TS2308 collision)

## LangChain 1.x Imports

`langchain.schema` was removed in LangChain 1.x. Use `langchain_core.messages`:
```python
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
```

## ChatOpenAI with gpt-4o (user's own key)

```python
ChatOpenAI(api_key=..., model="gpt-4o", max_tokens=1024, temperature=0.7)
```
Note: gpt-5.x requires `max_completion_tokens` and no `temperature` — only use gpt-4o with user's direct key unless AI Integrations proxy is confirmed working.

## ChromaDB Embeddings

ChromaDB automatically downloads `all-MiniLM-L6-v2` (ONNX) on first use from S3. No additional packages needed beyond `chromadb`. Startup takes ~10s the first time.

**Why:** The `embeddings` API is unsupported by Replit AI Integrations; using ChromaDB's built-in ONNX model avoids any API dependency for embeddings.

## Session State Hardening

`sessions` dict is bounded: `MAX_SESSIONS=500`, `SESSION_TTL_SECONDS=3600`. Call `_evict_stale_sessions()` before any session access. Raise HTTP 429 if at cap.

**Why:** In-memory session dict keyed by caller-controlled `session_id` is a DoS vector without bounds.

## OpenAPI Schema Naming Rule (avoid TS2308)

Orval auto-derives `<OperationIdPascal>Response` as the Zod schema name for operation responses. If a `components/schemas` entry has the same name, both `generated/api.ts` (Zod) and `generated/types/` (TS interface) export it → TS2308.

**Fix:** Name response component schemas differently from `<OperationIdPascal>Response`. For `shriChat`, the safe name is `ShriMessage` (not `ShriChatResponse`).

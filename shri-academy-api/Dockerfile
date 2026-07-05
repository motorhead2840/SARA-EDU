# ─── Shri Academy — Python FastAPI Dockerfile ────────────────────────────────
# Build context: shri-academy-api/
# Output: Python 3.11 slim image running FastAPI + uvicorn on PORT 8000
#
# ChromaDB downloads the all-MiniLM-L6-v2 ONNX model on first startup.
# The model is baked into this image during build (pre-warmed) so ECS tasks
# start cleanly without hitting S3 cold-start delay.

FROM python:3.11-slim AS base

ARG BUILD_SHA=dev
ARG BUILD_DATE=unknown

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    BUILD_SHA=${BUILD_SHA} \
    BUILD_DATE=${BUILD_DATE}

WORKDIR /app

# System deps: curl (healthcheck), build-essential (chromadb C extensions)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# ── Python deps ───────────────────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Pre-warm ChromaDB ONNX model ──────────────────────────────────────────────
# Baking the model into the image eliminates the ~30s cold-start download.
# The model is cached at /root/.cache/chroma/ by chromadb's default path.
RUN python - <<'EOF'
import chromadb
client = chromadb.Client()
# Creating a collection triggers the ONNX model download
col = client.create_collection("_warmup")
col.add(documents=["warmup"], ids=["w1"])
client.delete_collection("_warmup")
print("ChromaDB ONNX model pre-warmed successfully")
EOF

# ── Application source ────────────────────────────────────────────────────────
COPY . .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD curl -f http://localhost:8000/shri-api/health || exit 1

# 2 workers: one for inference, one for Bedrock/OpenAI fallback concurrency
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]

"""
Shri Academy AI Mentor Backend
FastAPI + ChromaDB (local ONNX embeddings) + NVIDIA NIM
Eval mode: parallel NVIDIA Nemotron + SageMaker Nemotron endpoint comparison
"""

import asyncio
import json
import os
import logging
from contextlib import asynccontextmanager

from typing import Optional

import chromadb

# boto3 imported lazily — only needed for SageMaker eval mode calls,
# not required for normal mentor operation.
try:
    import boto3
    _boto3_available = True
except ImportError:
    boto3 = None  # type: ignore
    _boto3_available = False
import openai
import re as _re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import JSONResponse
import time
from pydantic import BaseModel, Field, field_validator

# ─── Text-only content policy ────────────────────────────────────────────────
# Students use the drawing pad and plain text. No file, image, or document
# content is permitted in any field sent to the AI backend.

_DATA_URI = _re.compile(r"data:[a-z]+/[a-z0-9.+\-]+;base64,", _re.IGNORECASE)
_RAW_B64  = _re.compile(r"[A-Za-z0-9+/]{256,}={0,2}")
_FILENAME = _re.compile(
    r"\.(jpe?g|png|gif|webp|svg|pdf|docx?|xlsx?|pptx?|zip|tar|gz|mp4|mov|avi|mp3|wav)\b",
    _re.IGNORECASE,
)


def _enforce_text_only(value: str, field_name: str = "message") -> str:
    """Raise ValueError if the string contains image/document/binary content."""
    if _DATA_URI.search(value):
        raise ValueError(
            f"{field_name}: embedded images and documents are not allowed. "
            "Use the drawing pad for diagrams."
        )
    if _RAW_B64.search(value):
        raise ValueError(f"{field_name}: binary or encoded file content is not allowed.")
    if _FILENAME.search(value):
        raise ValueError(f"{field_name}: file references are not allowed. Describe your question in text.")
    return value


class TextOnlyMiddleware(BaseHTTPMiddleware):
    """Block any request whose Content-Type indicates a file/binary upload."""
    async def dispatch(self, request: StarletteRequest, call_next):
        ct = request.headers.get("content-type", "").lower()
        if "multipart/form-data" in ct or "application/octet-stream" in ct:
            return JSONResponse(
                status_code=415,
                content={"detail": "File and image uploads are not allowed. The mentor accepts text and drawing-pad input only."},
            )
        return await call_next(request)


from routes.research import router as research_router
from routes.sagemaker import router as sagemaker_router
from syllabus import SYLLABUS_CHUNKS  # shared with sagemaker/generate_data.py

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# ─── ChromaDB Setup ─────────────────────────────────────────────────────────────
chroma_client: chromadb.Client = None  # type: ignore
collection = None

def init_chromadb():
    global chroma_client, collection
    try:
        chroma_client = chromadb.Client()
        collection = chroma_client.get_or_create_collection(name="syllabus")
        if collection.count() == 0:
            ids = [chunk[0] for chunk in SYLLABUS_CHUNKS]
            docs = [chunk[1] for chunk in SYLLABUS_CHUNKS]
            collection.add(documents=docs, ids=ids)
            log.info(f"Seeded ChromaDB with {len(SYLLABUS_CHUNKS)} syllabus chunks")
        else:
            log.info(f"ChromaDB already has {collection.count()} chunks")
    except Exception as e:
        log.error(f"ChromaDB init error: {e}")
        collection = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_chromadb()
    yield

# ─── FastAPI App ────────────────────────────────────────────────────────────────
app = FastAPI(title="Shri Academy API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Block file/image uploads at the server boundary — must be added AFTER CORSMiddleware
# so CORS pre-flights are still handled correctly.
app.add_middleware(TextOnlyMiddleware)

app.include_router(research_router, prefix="/shri-api/research")
app.include_router(sagemaker_router, prefix="/shri-api/sagemaker")

# ─── LLM Factory ────────────────────────────────────────────────────────────────
NIM_MODEL = "nvidia/llama-3.1-nemotron-70b-instruct"

def get_nim_client() -> openai.OpenAI:
    api_key = os.environ.get("NVIDIA_API_KEY")
    if not api_key:
<<<<<<< HEAD
        raise RuntimeError("NVIDIA_API_KEY is not configured")
=======
        raise RuntimeError("NVIDIA_API_KEY or OPENAI_API_KEY is not configured")
    if api_key.startswith("sk-"):
        return openai.OpenAI(
            base_url="https://api.openai.com/v1",
            api_key=api_key
        )
>>>>>>> origin/main
    return openai.OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key
    )

# ─── SageMaker Eval Inference ────────────────────────────────────────────────────
async def call_sagemaker_endpoint(
    messages: list[dict],
    endpoint_name: str,
    region: str,
) -> Optional[str]:
    """
    Call the deployed Nemotron SageMaker endpoint with the same message list.
    Returns the generated text or None on failure (never raises — eval mode is best-effort).

    The HuggingFace TGI container expects:
      {"inputs": "<formatted prompt>", "parameters": {"max_new_tokens": 1024}}
    """
    try:
        runtime = boto3.client("sagemaker-runtime", region_name=region)

        # Build a simple prompt from the messages list
        prompt_parts = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                prompt_parts.append(f"<|system|>\n{content}")
            elif role == "user":
                prompt_parts.append(f"<|user|>\n{content}")
            elif role == "assistant":
                prompt_parts.append(f"<|assistant|>\n{content}")
        prompt_parts.append("<|assistant|>")
        prompt = "\n".join(prompt_parts)

        payload = json.dumps({
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 1024,
                "temperature": 0.7,
                "do_sample": True,
                "return_full_text": False,
            },
        })

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: runtime.invoke_endpoint(
                EndpointName=endpoint_name,
                ContentType="application/json",
                Body=payload,
            ),
        )
        body = json.loads(response["Body"].read().decode("utf-8"))
        # TGI returns [{"generated_text": "..."}]
        if isinstance(body, list) and body:
            return body[0].get("generated_text", "").strip()
        if isinstance(body, dict):
            return body.get("generated_text", "").strip()
        return None
    except Exception as e:
        log.warning(f"SageMaker eval call failed (non-fatal): {e}")
        return None

# ─── Session State (bounded + TTL-evicted) ───────────────────────────────────────
MAX_SESSIONS = 500
SESSION_TTL_SECONDS = 3600  # 1 hour

sessions: dict[str, dict] = {}

def _evict_stale_sessions() -> None:
    """Evict sessions older than SESSION_TTL_SECONDS, or cap to MAX_SESSIONS (oldest first)."""
    now = time.time()
    stale = [k for k, v in sessions.items() if now - v.get("last_active", 0) > SESSION_TTL_SECONDS]
    for k in stale:
        del sessions[k]
    # If still over cap, evict oldest by last_active
    if len(sessions) >= MAX_SESSIONS:
        sorted_keys = sorted(sessions, key=lambda k: sessions[k].get("last_active", 0))
        for k in sorted_keys[:len(sessions) - MAX_SESSIONS + 1]:
            del sessions[k]

def get_or_create_session(session_id: str) -> dict:
    _evict_stale_sessions()
    if session_id not in sessions and len(sessions) >= MAX_SESSIONS:
        raise HTTPException(status_code=429, detail="Session limit reached. Try again later.")
    session = sessions.setdefault(session_id, {
        "frustration": 0,
        "correct_streak": 0,
        "history": [],
        "message_count": 0,
        "last_active": time.time(),
    })
    session["last_active"] = time.time()
    return session

FRUSTRATION_SIGNALS = [
    "don't get", "dont get", "confused", "don't understand", "dont understand",
    "i give up", "stuck", "no idea", "help me", "not making sense", "makes no sense",
    "doesn't make sense", "doesnt make sense", "i'm lost", "im lost", "what?",
    "huh", "too hard", "clueless", "please just tell me", "frustrated",
    "can't figure", "cant figure", "please explain", "how does this even",
]

def is_frustrated(message: str) -> bool:
    lowered = message.lower()
    return any(signal in lowered for signal in FRUSTRATION_SIGNALS)

# Standard and contracted spelling variations are included here to robustly match
# different user input styles and catch common typing patterns.
GENERAL_MOTIVATIONAL_KEYWORDS = [
    "motivation", "motivate", "encouragement", "encourage", "inspire", "inspiration",
    "give up", "quit", "can't do", "cant do", "cannot do", "can not do", "too hard", "struggling", "struggle"
]

SPEECH_SPECIFIC_KEYWORDS = [
    "make your bed", "mcraven", "admiral"
]

MOTIVATIONAL_PREFIX = "motivational_"
MAX_CONTEXT_RESULTS = 5
FALLBACK_CONTEXT_RESULTS = 2
INITIAL_QUERY_RESULTS = 10

def needs_motivation(message: str, circuit: str) -> bool:
    # Under Circuit A (Supportive Mode), the student is struggling and needs support,
    # so we proactively allow motivational content in RAG retrieval.
    if circuit == "A":
        return True
    if is_frustrated(message):
        return True
    lowered = message.lower()
    return (any(keyword in lowered for keyword in GENERAL_MOTIVATIONAL_KEYWORDS) or
            any(keyword in lowered for keyword in SPEECH_SPECIFIC_KEYWORDS))

def get_circuit(session: dict) -> str:
    """'A' = Supportive/Empathetic, 'B' = Socratic/Rigorous"""
    return "A" if session["frustration"] >= 2 else "B"

def retrieve_context(query: str, circuit: str = "B") -> tuple[str, list[str]]:
    """Retrieve top-N relevant chunks via ChromaDB semantic search, filtering motivational chunks if not needed."""
    if collection is None:
        return _keyword_fallback(query, circuit)
    try:
        # Retrieve INITIAL_QUERY_RESULTS results instead of MAX_CONTEXT_RESULTS to ensure we have enough academic content
        # left over if motivational chunks are filtered out. Given our approximate collection size of ~35 syllabus
        # chunks at the time of implementation (July 2026), this single-stage query is highly efficient and avoids
        # complex multi-stage querying.
        results = collection.query(query_texts=[query], n_results=INITIAL_QUERY_RESULTS)
        docs = results["documents"][0] if results["documents"] else []
        ids = results["ids"][0] if results["ids"] else []
        
        allow_motivation = needs_motivation(query, circuit)
        
        filtered_docs = []
        for doc_id, doc_text in zip(ids, docs):
            is_motivational = doc_id.startswith(MOTIVATIONAL_PREFIX)
            if is_motivational and not allow_motivation:
                continue
            filtered_docs.append(doc_text)
            if len(filtered_docs) >= MAX_CONTEXT_RESULTS:
                break
                
        context = "\n\n---\n\n".join(filtered_docs) if filtered_docs else "No relevant context found."
        return context, filtered_docs
    except Exception as e:
        log.warning(f"ChromaDB query failed: {e}, using keyword fallback")
        return _keyword_fallback(query, circuit)

def _keyword_fallback(query: str, circuit: str = "B") -> tuple[str, list[str]]:
    """Simple keyword-based retrieval as ChromaDB fallback."""
    lowered = query.lower()
    scored = []
    allow_motivation = needs_motivation(query, circuit)
    
    for chunk_id, doc in SYLLABUS_CHUNKS:
        is_motivational = chunk_id.startswith(MOTIVATIONAL_PREFIX)
        if is_motivational and not allow_motivation:
            continue
        score = sum(1 for word in lowered.split() if len(word) > 3 and word in doc.lower())
        scored.append((score, doc))
    scored.sort(key=lambda x: x[0], reverse=True)
    top_docs = [doc for _, doc in scored[:FALLBACK_CONTEXT_RESULTS]]
    context = "\n\n---\n\n".join(top_docs) if top_docs else "No relevant context."
    return context, top_docs

def build_system_prompt(circuit: str, context: str) -> str:
    has_context = context and context.strip() and context.strip() != "No relevant context found." and context.strip() != "No relevant context."
    context_block = (
        f"RELEVANT SYLLABUS CONTEXT (use this as your primary reference):\n{context}\n\n"
        if has_context else
        "RELEVANT SYLLABUS CONTEXT: None retrieved — use your broad academic knowledge.\n\n"
    )
    base = (
        "You are Shri, a knowledgeable and warm AI mentor for Shri Academy. "
        "You help students across all academic subjects: mathematics, sciences, history, "
        "computer science, English literature, and more.\n\n"
        f"{context_block}"
        "TEACHING GUIDELINES:\n"
        "• Use the retrieved syllabus context above as your primary reference when it is relevant.\n"
        "• When the context does not fully cover the question, draw freely on your broad academic "
        "knowledge — you are a full-subject mentor, not limited to any single topic.\n"
        "• Always adapt your explanation to the student's apparent level — simpler language for "
        "basic questions, more rigour for advanced ones.\n"
        "• Give accurate, complete explanations. Do not deflect or refuse standard academic questions.\n\n"
    )

    if circuit == "A":
        behavioral = (
            "━━━ CIRCUIT A — SUPPORTIVE MODE ACTIVE ━━━\n"
            "The student is struggling and needs support. Your response must:\n"
            "• Open with genuine empathy and acknowledgment of their frustration\n"
            "• Lower pedagogical friction significantly — give a strong, near-explicit hint\n"
            "• Break down the concept into the smallest possible steps\n"
            "• Use warm, accessible language — avoid jargon unless you immediately explain it\n"
            "• When motivational context (e.g., Admiral McRaven's lessons) is retrieved, integrate its "
            "message of resilience and simple tasks (like making your bed) to inspire them to keep going\n"
            "• Close with genuine encouragement\n"
            "You may be more direct than usual, but still frame your help as a guiding question."
        )
    else:
        behavioral = (
            "━━━ CIRCUIT B — SOCRATIC MODE ACTIVE ━━━\n"
            "The student is capable. Your primary goal is to build their understanding through guided reasoning:\n"
            "• Prefer guiding questions over direct answers — ask the student to reason through the concept first\n"
            "• If the student explicitly asks for an explanation, definition, or formula they cannot be expected "
            "to derive, provide a clear and complete answer — do not withhold factual information\n"
            "• After answering directly, follow up with a question that deepens or extends their thinking\n"
            "• If the student is progressing confidently, raise the challenge — ask synthesis-level questions "
            "that connect multiple concepts\n"
            "• Keep responses focused; avoid overwhelming the student with too many questions at once"
        )

    return base + behavioral


# ─── Pydantic Models ─────────────────────────────────────────────────────────────
class ChatInput(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: str = Field(default="default", max_length=128)

    @field_validator("message")
    @classmethod
    def no_media_content(cls, v: str) -> str:
        return _enforce_text_only(v, "message")


class ChatResponse(BaseModel):
    response: str
    circuit: str
    frustration_level: int
    correct_streak: int
    session_id: str
    context_used: list[str]
    # Populated only when MENTOR_EVAL_MODE=true and SAGEMAKER_ENDPOINT_NAME is set
    sagemaker_response: Optional[str] = None


class ShriState(BaseModel):
    circuit: str
    frustration_level: int
    correct_streak: int
    message_count: int
    session_id: str


class ResetInput(BaseModel):
    session_id: str = "default"


class ResetResponse(BaseModel):
    status: str
    session_id: str


# ─── Routes ──────────────────────────────────────────────────────────────────────
@app.get("/shri-api/health")
async def health():
    chunks_loaded = collection.count() if collection else 0
    eval_mode = os.environ.get("MENTOR_EVAL_MODE", "").lower() == "true"
    endpoint = os.environ.get("SAGEMAKER_ENDPOINT_NAME")
    return {
        "status": "ok",
        "chunks_loaded": chunks_loaded,
        "chromadb": collection is not None,
        "eval_mode": eval_mode and bool(endpoint),
        "sagemaker_endpoint": endpoint or None,
    }


@app.post("/shri-api/chat", response_model=ChatResponse)
async def chat(req: ChatInput):
    # Get or create session (bounded, TTL-evicted)
    session = get_or_create_session(req.session_id)

    session["message_count"] += 1

    # Update frustration state
    if is_frustrated(req.message):
        session["frustration"] = min(session["frustration"] + 1, 5)
        session["correct_streak"] = 0
    else:
        session["correct_streak"] = min(session["correct_streak"] + 1, 10)
        if session["frustration"] > 0:
            session["frustration"] = max(0, session["frustration"] - 1)

    circuit = get_circuit(session)

    # RAG retrieval
    context, context_used = retrieve_context(req.message, circuit)

    # Build system prompt and NIM message list (system + history + current)
    system_prompt = build_system_prompt(circuit, context)
    plain_messages = [{"role": "system", "content": system_prompt}]
    for msg in session["history"][-10:]:
        plain_messages.append({"role": msg["role"], "content": msg["content"]})
    plain_messages.append({"role": "user", "content": req.message})

    # ── Eval mode: call NVIDIA NIM + SageMaker in parallel ───────────────────
    eval_mode = os.environ.get("MENTOR_EVAL_MODE", "").lower() == "true"
    sm_endpoint = os.environ.get("SAGEMAKER_ENDPOINT_NAME")
    sm_region = os.environ.get("AWS_REGION", "us-east-1")

    async def _nim_call() -> str:
        try:
            client = get_nim_client()
            api_key = os.environ.get("NVIDIA_API_KEY") or os.environ.get("OPENAI_API_KEY") or ""
            model = "gpt-4o" if api_key.startswith("sk-") else NIM_MODEL
            resp = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: client.chat.completions.create(
                    model=model,
                    messages=plain_messages,
                    max_tokens=2048,
                    temperature=0.7,
                ),
            )
            return resp.choices[0].message.content
        except Exception as e:
            log.error(f"NVIDIA NIM error: {e}")
            raise HTTPException(status_code=502, detail=f"AI mentor unavailable: {str(e)}")

    if eval_mode and sm_endpoint:
        nim_task = asyncio.create_task(_nim_call())
        sm_task = asyncio.create_task(
            call_sagemaker_endpoint(plain_messages, sm_endpoint, sm_region)
        )
        answer, sm_answer = await asyncio.gather(nim_task, sm_task)
    else:
        answer = await _nim_call()
        sm_answer = None

    # Persist to history (NIM response is canonical)
    session["history"].append({"role": "user", "content": req.message})
    session["history"].append({"role": "assistant", "content": answer})

    return ChatResponse(
        response=answer,
        circuit=circuit,
        frustration_level=session["frustration"],
        correct_streak=session["correct_streak"],
        session_id=req.session_id,
        context_used=context_used,
        sagemaker_response=sm_answer,
    )


@app.get("/shri-api/state", response_model=ShriState)
async def get_state(session_id: str = "default"):
    session = sessions.get(session_id, {
        "frustration": 0,
        "correct_streak": 0,
        "history": [],
        "message_count": 0,
    })
    return ShriState(
        circuit=get_circuit(session),
        frustration_level=session.get("frustration", 0),
        correct_streak=session.get("correct_streak", 0),
        message_count=session.get("message_count", 0),
        session_id=session_id,
    )


@app.post("/shri-api/reset", response_model=ResetResponse)
async def reset_session(req: ResetInput):
    if req.session_id in sessions:
        del sessions[req.session_id]
    return ResetResponse(status="reset", session_id=req.session_id)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

"""
Research mentor routes — AI-powered academic path generator.

Primary AI path: AWS Bedrock (Claude 3.5 Sonnet) when BEDROCK_ENABLED=true.
Fallback:        OpenAI GPT-4o when OPENAI_API_KEY is set.
Events:          Publishes to Confluent Cloud Kafka topic 'academic.plan.generated'
                 after every successful plan generation.
"""

from __future__ import annotations
import os
import json
import asyncio
import logging
from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

logger = logging.getLogger(__name__)
router = APIRouter()

# ─── Configuration ────────────────────────────────────────────────────────────

API_SERVER      = os.getenv("API_SERVER_URL", "http://localhost:3000")
OPENAI_KEY      = os.getenv("OPENAI_API_KEY", "")
BEDROCK_ENABLED = os.getenv("BEDROCK_ENABLED", "false").lower() == "true"
BEDROCK_MODEL   = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20241022-v2:0")
BEDROCK_REGION  = os.getenv("BEDROCK_REGION", "us-east-1")
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "")
KAFKA_API_KEY   = os.getenv("KAFKA_API_KEY", "")
KAFKA_API_SECRET = os.getenv("KAFKA_API_SECRET", "")

# ─── Request / Response models ────────────────────────────────────────────────

class MentorRequest(BaseModel):
    interest: str
    user_email: str | None = None
    background: str | None = None

class LearningMilestone(BaseModel):
    phase: int
    title: str
    duration_weeks: str
    courses: list[dict]
    goals: list[str]
    deliverable: str

class ResearchPlan(BaseModel):
    research_title: str
    summary: str
    discipline: str
    specialization: str
    difficulty: int
    estimated_months: int
    milestones: list[LearningMilestone]
    open_problems: list[str]
    next_step: str

# ─── Kafka producer (fire-and-forget) ────────────────────────────────────────

_kafka_producer: Any = None

def _get_kafka_producer() -> Any:
    global _kafka_producer
    if _kafka_producer is not None:
        return _kafka_producer
    if not all([KAFKA_BOOTSTRAP, KAFKA_API_KEY, KAFKA_API_SECRET]):
        return None
    try:
        from confluent_kafka import Producer  # type: ignore
        clean_bootstrap = KAFKA_BOOTSTRAP.replace("SASL_SSL://", "").replace("SSL://", "")
        _kafka_producer = Producer({
            "bootstrap.servers":  clean_bootstrap,
            "security.protocol": "SASL_SSL",
            "sasl.mechanisms":   "PLAIN",
            "sasl.username":     KAFKA_API_KEY,
            "sasl.password":     KAFKA_API_SECRET,
            "client.id":         "shri-academy-api",
            "acks":              "1",
            "retries":           3,
        })
        logger.info("Confluent Kafka producer initialised (%s)", clean_bootstrap)
        return _kafka_producer
    except Exception as exc:
        logger.warning("Confluent Kafka producer failed to init: %s", exc)
        return None


def _emit_plan_event(req: MentorRequest, plan: dict) -> None:
    producer = _get_kafka_producer()
    if producer is None:
        return
    try:
        payload = json.dumps({
            "user_email":       req.user_email,
            "interest":         req.interest[:200],
            "discipline":       plan.get("discipline", ""),
            "difficulty":       plan.get("difficulty", 0),
            "estimated_months": plan.get("estimated_months", 0),
            "topic_id":         plan.get("closest_topic_id"),
            "timestamp":        asyncio.get_event_loop().time(),
            "_source":          "shri-academy-api",
        })
        producer.produce(
            "academic.plan.generated",
            key=(req.user_email or "anonymous").encode(),
            value=payload.encode(),
        )
        producer.poll(0)  # trigger delivery callbacks
    except Exception as exc:
        logger.warning("Kafka plan event emit failed: %s", exc)


# ─── Bedrock AI client ────────────────────────────────────────────────────────

async def _call_bedrock(system_prompt: str, user_prompt: str) -> str:
    """Call Claude 3.5 Sonnet via AWS Bedrock using boto3 in a thread pool."""
    import boto3  # type: ignore
    import threading

    def _invoke() -> str:
        client = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 3000,
            "temperature": 0.3,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        })
        resp = client.invoke_model(
            modelId=BEDROCK_MODEL,
            contentType="application/json",
            accept="application/json",
            body=body,
        )
        result = json.loads(resp["body"].read())
        return result["content"][0]["text"]

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _invoke)


# ─── OpenAI client ────────────────────────────────────────────────────────────

async def _call_openai(system_prompt: str, user_prompt: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.3,
                "response_format": {"type": "json_object"},
                "max_tokens": 2500,
            }
        )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def fetch_academic_context() -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=10) as client:
        discs_r, topics_r = await asyncio.gather(
            client.get(f"{API_SERVER}/api/academic/disciplines"),
            client.get(f"{API_SERVER}/api/academic/research-topics"),
        )
    disciplines = discs_r.json().get("disciplines", []) if discs_r.status_code == 200 else []
    topics      = topics_r.json().get("topics", []) if topics_r.status_code == 200 else []
    return {"disciplines": disciplines, "topics": topics}


SYSTEM_PROMPT = """You are an expert academic research advisor at a top university.
Your job is to create a precise, actionable, personalised research mentorship plan.

You have access to MIT OpenCourseWare courses organised into disciplines and research topics.
You will:
1. Identify the most relevant research area from the student's interest
2. Map a sequenced learning path of OCW courses (with correct prerequisites)
3. Define clear milestones with specific deliverables
4. Surface real open research questions the student could tackle
5. Recommend the concrete next step for TODAY

Be honest about difficulty. Be specific — name exact course numbers, exact papers, exact techniques.
Return ONLY valid JSON matching the exact schema provided. No markdown, no extra text."""


def _build_user_prompt(req: MentorRequest, context: dict) -> str:
    disciplines_summary = "\n".join(
        f"- {d['name']} ({d['id']}): {d.get('description','')[:80]}"
        for d in context["disciplines"]
    )
    topics_summary = "\n".join(
        f"- [{t['id']}] {t['title']} ({t.get('discipline_name','')}) — {t.get('description','')[:100]}"
        for t in context["topics"]
    )
    background_clause = f"\nStudent background: {req.background}" if req.background else ""

    return f"""Student research interest: "{req.interest}"{background_clause}

Available disciplines:
{disciplines_summary}

Available research topics:
{topics_summary}

Return a JSON object with this EXACT schema:
{{
  "research_title": "Short descriptive title for this research path",
  "summary": "2-3 sentence explanation of why this is exciting and tractable",
  "discipline": "discipline name",
  "specialization": "specialization name",
  "closest_topic_id": "one of the topic IDs above, or null",
  "difficulty": 1-5,
  "estimated_months": 6-36,
  "milestones": [
    {{
      "phase": 1,
      "title": "Phase title",
      "duration_weeks": "e.g. 8 weeks",
      "course_ids": ["list of OCW course IDs like 6006, 1806 from the database"],
      "goals": ["specific skill or knowledge to gain"],
      "deliverable": "concrete output: reproduce a paper, build a prototype, write a literature review"
    }}
  ],
  "open_problems": ["3-5 actual open research questions in this area"],
  "key_papers": ["2-3 seminal papers with authors and year"],
  "next_step": "One sentence: what should the student do TODAY to begin?"
}}

Use 3-5 milestones. Keep course_ids to real MIT OCW course IDs from our database (6006, 6046, 1806, 804, etc).
Milestone 1 should cover foundations. Last milestone should involve original research contribution."""


# ─── Main mentor endpoint ─────────────────────────────────────────────────────

@router.post("/mentor")
async def research_mentor(req: MentorRequest):
    if not req.interest.strip():
        raise HTTPException(status_code=400, detail="interest is required")

    try:
        context = await fetch_academic_context()
    except Exception:
        context = {"disciplines": [], "topics": []}

    user_prompt = _build_user_prompt(req, context)
    raw: str

    # Priority: Bedrock → OpenAI
    if BEDROCK_ENABLED:
        try:
            raw = await _call_bedrock(SYSTEM_PROMPT, user_prompt)
        except Exception as e:
            logger.warning("Bedrock call failed (%s) — falling back to OpenAI", e)
            if not OPENAI_KEY:
                raise HTTPException(status_code=503, detail=f"Bedrock failed and no OpenAI fallback: {e}")
            try:
                raw = await _call_openai(SYSTEM_PROMPT, user_prompt)
            except httpx.HTTPError as e2:
                raise HTTPException(status_code=502, detail=f"All AI backends failed: {e2}")
    elif OPENAI_KEY:
        try:
            raw = await _call_openai(SYSTEM_PROMPT, user_prompt)
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"OpenAI request failed: {e}")
    else:
        raise HTTPException(status_code=503, detail="No AI backend configured (set BEDROCK_ENABLED=true or OPENAI_API_KEY)")

    try:
        plan_data = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="AI returned invalid JSON")

    # Enrich milestones with full course records
    known_course_ids = {
        "6042","6006","6046","6854","18404","6034","6036","6867","6s897",
        "6004","6033","6824","6828","6858","6875","6830","6035",
        "1801","1802","1803","1806","18100","18701","1805","1865","18335",
        "801","802","804","805","8333","701","703","7091","901","940","9641",
        "1401","1430","5111","560","6002","6003",
    }

    enriched_milestones = []
    for ms in plan_data.get("milestones", []):
        raw_ids = ms.get("course_ids", [])
        valid_ids = [str(cid) for cid in raw_ids if str(cid) in known_course_ids]
        courses_detail: list[dict] = []
        if valid_ids:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    params = "&".join(f"ids={cid}" for cid in valid_ids)
                    r = await client.get(f"{API_SERVER}/api/academic/courses?{params}")
                if r.status_code == 200:
                    courses_detail = r.json().get("courses", [])
            except Exception:
                pass
        enriched_milestones.append({
            "phase":             ms.get("phase", len(enriched_milestones) + 1),
            "title":             ms.get("title", ""),
            "duration_weeks":    ms.get("duration_weeks", ""),
            "courses":           courses_detail,
            "course_ids_requested": valid_ids,
            "goals":             ms.get("goals", []),
            "deliverable":       ms.get("deliverable", ""),
        })

    # Save profile if user is logged in
    topic_id = plan_data.get("closest_topic_id")
    if req.user_email:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    f"{API_SERVER}/api/academic/research-profile",
                    json={
                        "user_email":    req.user_email,
                        "interest_text": req.interest,
                        "topic_ids":     [topic_id] if topic_id else [],
                        "ai_plan":       plan_data,
                    }
                )
        except Exception:
            pass

    # Emit Kafka event (fire-and-forget)
    _emit_plan_event(req, plan_data)

    return {"plan": {**plan_data, "milestones": enriched_milestones}}


# ─── OpenSearch-backed search endpoint ───────────────────────────────────────

@router.get("/search")
async def search_academic(q: str = "", discipline: str = ""):
    params: list[str] = []
    if q:          params.append(f"search={q}")
    if discipline: params.append(f"discipline_id={discipline}")
    query = "&".join(params)
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{API_SERVER}/api/academic/search?q={q}&discipline_id={discipline}")
    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail="Search failed")
    return r.json()

"""
ml_enrichment.py
-----------------
Airflow DAG: reads cleaned student chat messages from S3 data lake,
runs them through Amazon Comprehend (sentiment + key phrase extraction),
then:
  - Publishes enriched records to OpenSearch for mentor analytics
  - Updates SageMaker Feature Store with NLP-derived features
  - Synthesises TTS audio snippets via Amazon Polly for popular answers
  - Writes enrichment results back to S3 data lake

Schedule: every 30 minutes.
Depends on: stream_cleaner DAG has run at least once (reads its S3 output).
"""

from __future__ import annotations

import gzip
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Any

import boto3
from airflow import DAG
from airflow.models import Variable
from airflow.operators.python import PythonOperator
from airflow.utils.dates import days_ago

logger = logging.getLogger(__name__)

AWS_REGION       = Variable.get("aws_region",          default_var=os.environ.get("AWS_REGION", "us-east-1"))
DATA_LAKE_BUCKET = Variable.get("s3_data_lake_bucket", default_var=os.environ.get("S3_DATA_LAKE_BUCKET", ""))
OPENSEARCH_URL   = Variable.get("opensearch_url",      default_var=os.environ.get("OPENSEARCH_URL", ""))
SAGEMAKER_FG     = Variable.get("sagemaker_feature_group", default_var="sri-production-student-engagement")
KAFKA_BOOTSTRAP  = Variable.get("kafka_bootstrap_servers", default_var=os.environ.get("KAFKA_BOOTSTRAP", ""))

comprehend   = boto3.client("comprehend",   region_name=AWS_REGION)
polly        = boto3.client("polly",        region_name=AWS_REGION)
s3           = boto3.client("s3",           region_name=AWS_REGION)
sm_runtime   = boto3.client("sagemaker-featurestore-runtime", region_name=AWS_REGION)
translate    = boto3.client("translate",    region_name=AWS_REGION)


# ─── Task 1: Load recent chat messages from S3 data lake ─────────────────────

def load_chat_messages(**context: Any) -> None:
    """Load last 30 min of cleaned chat messages."""
    now = context["execution_date"]
    prefix = f"cleaned/shri_chat_messages/{now.strftime('%Y/%m/%d')}/"

    messages = []
    try:
        paginator = s3.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=DATA_LAKE_BUCKET, Prefix=prefix):
            for obj in page.get("Contents", []):
                if obj["LastModified"].replace(tzinfo=None) < now.replace(tzinfo=None) - timedelta(minutes=45):
                    continue
                body = s3.get_object(Bucket=DATA_LAKE_BUCKET, Key=obj["Key"])["Body"].read()
                try:
                    content = gzip.decompress(body)
                except OSError:
                    content = body
                for line in content.decode().splitlines():
                    if line.strip():
                        try:
                            messages.append(json.loads(line))
                        except json.JSONDecodeError:
                            pass
    except Exception as exc:
        logger.warning("Failed to load chat messages: %s", exc)

    # Only process AI responses (Circuit A and B) — skip user messages
    ai_messages = [m for m in messages if m.get("role") == "assistant"]
    logger.info("Loaded %d AI messages for enrichment", len(ai_messages))
    context["ti"].xcom_push(key="messages", value=ai_messages[:500])  # cap at 500 per run


# ─── Task 2: Run Amazon Comprehend ───────────────────────────────────────────

def comprehend_analysis(**context: Any) -> None:
    """Run sentiment + key phrase extraction on batch of messages."""
    messages = context["ti"].xcom_pull(key="messages") or []
    if not messages:
        context["ti"].xcom_push(key="enriched", value=[])
        return

    # Comprehend batch APIs accept up to 25 items, max 5000 bytes each
    BATCH = 25
    enriched = []

    for i in range(0, len(messages), BATCH):
        batch = messages[i:i + BATCH]
        texts = [m.get("content", "")[:4900] for m in batch]

        try:
            sentiment_resp = comprehend.batch_detect_sentiment(
                TextList=texts, LanguageCode="en"
            )
            keyphrase_resp = comprehend.batch_detect_key_phrases(
                TextList=texts, LanguageCode="en"
            )

            sentiments  = {r["Index"]: r for r in sentiment_resp.get("ResultList", [])}
            keyphrases  = {r["Index"]: r for r in keyphrase_resp.get("ResultList", [])}

            for j, msg in enumerate(batch):
                s  = sentiments.get(j, {})
                kp = keyphrases.get(j, {})
                enriched.append({
                    **msg,
                    "sentiment":       s.get("Sentiment", "UNKNOWN"),
                    "sentiment_scores": s.get("SentimentScore", {}),
                    "key_phrases":     [p["Text"] for p in kp.get("KeyPhrases", [])[:10]],
                    "_enriched_at":    datetime.utcnow().isoformat() + "Z",
                })

        except Exception as exc:
            logger.warning("Comprehend batch %d failed: %s", i // BATCH, exc)
            enriched.extend(batch)  # pass through unenriched on error

    logger.info("Comprehend enriched %d messages", len(enriched))
    context["ti"].xcom_push(key="enriched", value=enriched)


# ─── Task 3: Detect language and translate non-English messages ───────────────

def translate_non_english(**context: Any) -> None:
    """Detect language and translate non-English student inputs."""
    messages = context["ti"].xcom_pull(key="messages") or []
    user_messages = [m for m in messages if m.get("role") == "user"][:100]

    translated = []
    for msg in user_messages:
        content = msg.get("content", "")
        if not content or len(content) < 10:
            continue
        try:
            resp = translate.translate_text(
                Text=content[:500],
                SourceLanguageCode="auto",
                TargetLanguageCode="en",
            )
            if resp.get("SourceLanguageCode", "en") != "en":
                translated.append({
                    "session_id":       msg.get("session_id"),
                    "original_language": resp.get("SourceLanguageCode"),
                    "original_text":    content[:500],
                    "translated_text":  resp.get("TranslatedText"),
                    "_translated_at":   datetime.utcnow().isoformat() + "Z",
                })
        except Exception as exc:
            logger.debug("Translate failed for message: %s", exc)

    logger.info("Detected %d non-English messages", len(translated))
    context["ti"].xcom_push(key="translated", value=translated)


# ─── Task 4: Polly TTS for top AI responses ───────────────────────────────────

def synthesise_top_responses(**context: Any) -> None:
    """
    Generate TTS audio for the top 5 most positively-received AI responses.
    Stores MP3 files in S3 assets bucket for optional playback in the UI.
    """
    enriched = context["ti"].xcom_pull(key="enriched") or []
    # Top responses = highest POSITIVE sentiment score
    top = sorted(
        [m for m in enriched if m.get("sentiment") == "POSITIVE"],
        key=lambda m: m.get("sentiment_scores", {}).get("Positive", 0),
        reverse=True,
    )[:5]

    synthesised = []
    for msg in top:
        content = msg.get("content", "")[:1500]
        if not content:
            continue
        try:
            resp = polly.synthesize_speech(
                Text=content,
                OutputFormat="mp3",
                VoiceId="Joanna",
                Engine="neural",
                LanguageCode="en-US",
            )
            audio_stream = resp["AudioStream"].read()
            session_id = msg.get("session_id", "unknown")
            key = f"tts-output/{session_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.mp3"

            # Get assets bucket name from SSM
            ssm = boto3.client("ssm", region_name=AWS_REGION)
            bucket = ssm.get_parameter(Name="/sri/production/config/s3_assets_bucket")["Parameter"]["Value"]

            s3.put_object(Bucket=bucket, Key=key, Body=audio_stream, ContentType="audio/mpeg")
            synthesised.append({"session_id": session_id, "s3_key": key, "duration_chars": len(content)})
            logger.info("Synthesised TTS for session %s → s3://%s/%s", session_id, bucket, key)
        except Exception as exc:
            logger.warning("Polly synthesis failed: %s", exc)

    context["ti"].xcom_push(key="synthesised", value=synthesised)


# ─── Task 5: Write enriched records to OpenSearch ────────────────────────────

def index_enriched_to_opensearch(**context: Any) -> None:
    enriched   = context["ti"].xcom_pull(key="enriched") or []
    translated = context["ti"].xcom_pull(key="translated") or []
    if not OPENSEARCH_URL or not enriched:
        return

    try:
        from opensearchpy import OpenSearch, helpers  # type: ignore
        client = OpenSearch(hosts=[OPENSEARCH_URL], use_ssl=True, verify_certs=True)

        actions = [{"_index": "sri-shri-chat-enriched", "_source": rec} for rec in enriched]
        actions += [{"_index": "sri-shri-chat-translated", "_source": rec} for rec in translated]

        if actions:
            success, errors = helpers.bulk(client, actions, raise_on_error=False)
            logger.info("OpenSearch: %d indexed, %d errors", success, len(errors))
    except Exception as exc:
        logger.warning("OpenSearch enrichment index failed: %s", exc)


# ─── Task 6: Archive enriched records to S3 ──────────────────────────────────

def archive_enriched(**context: Any) -> None:
    import gzip
    enriched = context["ti"].xcom_pull(key="enriched") or []
    if not enriched or not DATA_LAKE_BUCKET:
        return

    now = context["execution_date"]
    key = f"enriched/chat_comprehend/{now.strftime('%Y/%m/%d')}/{context['run_id']}.ndjson.gz"
    body = gzip.compress("\n".join(json.dumps(r) for r in enriched).encode())
    s3.put_object(Bucket=DATA_LAKE_BUCKET, Key=key, Body=body, ContentEncoding="gzip", ContentType="application/x-ndjson")
    logger.info("Archived %d enriched records to s3://%s/%s", len(enriched), DATA_LAKE_BUCKET, key)


# ─── DAG Definition ──────────────────────────────────────────────────────────

default_args = {
    "owner": "sri-platform",
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    dag_id="ml_enrichment",
    description="Comprehend sentiment + key phrases → OpenSearch + Polly TTS + S3",
    schedule_interval=timedelta(minutes=30),
    start_date=days_ago(1),
    catchup=False,
    default_args=default_args,
    tags=["comprehend", "polly", "translate", "opensearch", "ml"],
    max_active_runs=2,
) as dag:

    t_load      = PythonOperator(task_id="load_chat_messages",        python_callable=load_chat_messages)
    t_comprehend= PythonOperator(task_id="comprehend_analysis",       python_callable=comprehend_analysis)
    t_translate = PythonOperator(task_id="translate_non_english",     python_callable=translate_non_english)
    t_polly     = PythonOperator(task_id="synthesise_top_responses",  python_callable=synthesise_top_responses)
    t_opensearch= PythonOperator(task_id="index_enriched",            python_callable=index_enriched_to_opensearch)
    t_archive   = PythonOperator(task_id="archive_enriched",          python_callable=archive_enriched)

    # load → [comprehend, translate] in parallel → [polly, opensearch, archive]
    t_load >> [t_comprehend, t_translate]
    t_comprehend >> [t_polly, t_opensearch, t_archive]

"""
processor.py - Prepares training-ready corpora and instruction-tuning datasets from curated OCW data.
Formats text for continued pre-training and constructs Socratic Q&A pairs for SFT fine-tuning.
"""

import logging
import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any

# Ensure import of generate_data features if available
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "shri-academy-api" / "mentor_sagemaker"))

try:
    from generate_data import build_client, generate_pairs, to_training_record, SYSTEM_PROMPT_SHRI, SYSTEM_PROMPT_SARASWATHI
    _generator_imported = True
except ImportError:
    _generator_imported = False
    SYSTEM_PROMPT_SHRI = (
        "You are Shri, a knowledgeable AI mentor for Shri Academy. "
        "You teach students across all academic subjects using Socratic questioning "
        "and supportive guidance. You are patient, precise, and pedagogically rigorous."
    )
    SYSTEM_PROMPT_SARASWATHI = (
        "You are Shri-Ma-Saraswathi, a wise and compassionate AI mentor for Shri Academy. "
        "You guide students using deep psychological, educational, and philosophical insights from "
        "the Bhagavad Gita and modern educational psychology. You are patient, supportive, and "
        "focused on emotional balance, resilience, and self-realization."
    )

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger("OCWProcessor")

# Pure fallback template generator for standalone/offline or keyless runs.
# Generates high-quality Socratic / psychological guidance Q&A records.
LOCAL_SOCRATIC_TEMPLATES = [
    {
        "q": "How does the concept of {focus} apply to holistic human development in education?",
        "a": "To cultivate a complete human being, we must connect intellectual pursuits with emotional, psychological, and spiritual maturity. Centering our teachings on {focus} allows students to tap into their deep inner potential, fostering a balanced mind and self-awareness that empower lifelong resilience.",
    },
    {
        "q": "Can you explain why understanding {focus} helps students achieve greater emotional stability and resilience?",
        "a": "When students grasp {focus}, they acquire a stable internal anchor to weather the pressures of academic and daily life. Instead of being swept away by passing thoughts, they learn to observe their emotional states with clarity, cultivating mindfulness and self-efficacy.",
    },
    {
        "q": "What would happen if an educational system ignored {focus} and focused solely on logical-mathematical testing?",
        "a": "Neglecting {focus} in favor of purely technical testing leads to fragmented growth. While students might excel analytically, they often struggle with severe anxiety. Grounding education in a holistic paradigm is essential to align academic achievements with emotional balance."
    }
]

class OCWProcessor:
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def extract_focus_concepts(self, text: str) -> List[str]:
        """Simple rule-based parser to pull key pedagogical and unified philosophies from text."""
        concepts = []
        lowered = text.lower()
        if "atman" in lowered or "philosophy of unity" in lowered or "narayana guru" in lowered:
            concepts.append("the unity of the Atman")
        if "emotional stability" in lowered or "regulation" in lowered or "resilience" in lowered:
            concepts.append("emotional regulation and mental stability")
        if "cognitive development" in lowered or "educational psychology" in lowered:
            concepts.append("cognitive and educational development")
        if "self-actualization" in lowered or "well-being" in lowered or "rogers" in lowered:
            concepts.append("psychological well-being and self-actualization")
            
        if not concepts:
            concepts.append("academic excellence and self-development")
        return concepts

    def generate_sft_local(self, doc: Dict[str, Any], system_prompt: str) -> List[Dict[str, Any]]:
        """Fallback rule-based Socratic generator when API is not available."""
        records = []
        concepts = self.extract_focus_concepts(doc["content"])
        
        for concept in concepts:
            for template in LOCAL_SOCRATIC_TEMPLATES:
                q = template["q"].format(focus=concept)
                a = template["a"].format(focus=concept)
                
                records.append({
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": q},
                        {"role": "assistant", "content": a},
                    ]
                })
        return records

    def process_for_pretraining(self, curated_docs: List[Dict[str, Any]]) -> Path:
        """Converts curated documents into a single plain text corpus for continued pre-training."""
        pretrain_file = self.output_dir / "pretrain.txt"
        with open(pretrain_file, "w", encoding="utf-8") as f:
            for doc in curated_docs:
                f.write(f"Source: {doc['source']} | Course: {doc['course_title']} | Title: {doc['title']}\n")
                f.write(doc["content"])
                f.write("\n\n=== END OF COURSE MATERIAL ===\n\n")
        logger.info(f"Wrote pre-training corpus to {pretrain_file} ({pretrain_file.stat().st_size} bytes)")
        return pretrain_file

    def process_for_sft(self, curated_docs: List[Dict[str, Any]], pairs_per_doc: int = 4) -> Path:
        """
        Generates chat format Q&A records for supervised fine-tuning.
        Uses NVIDIA NIM / OpenAI teacher LLM if api key is present,
        otherwise falls back to local Socratic template processor.
        """
        all_records = []
        api_key = os.environ.get("NVIDIA_API_KEY") or os.environ.get("OPENAI_API_KEY")
        
        use_llm = _generator_imported and api_key and not api_key.startswith("mock") and "PLACEHOLDER" not in api_key

        if use_llm:
            logger.info("Initializing Teacher LLM client for high-fidelity data generation...")
            client = build_client()
            for doc in curated_docs:
                logger.info(f"Generating {pairs_per_doc} pairs from teacher for doc '{doc['title']}'...")
                # Select proper mentor prompt based on course theme
                is_saraswathi = doc["course_id"].startswith("HARV") or "atman" in doc["content"].lower()
                sys_prompt = SYSTEM_PROMPT_SARASWATHI if is_saraswathi else SYSTEM_PROMPT_SHRI
                
                pairs = generate_pairs(client, doc["content"], n=pairs_per_doc)
                for p in pairs:
                    record = to_training_record(p["question"], p["answer"], system_prompt=sys_prompt)
                    all_records.append(record)
        else:
            logger.info("NVIDIA/OpenAI API key missing or mock. Utilizing local high-quality Socratic template generator.")
            for doc in curated_docs:
                is_saraswathi = doc["course_id"].startswith("HARV") or "atman" in doc["content"].lower()
                sys_prompt = SYSTEM_PROMPT_SARASWATHI if is_saraswathi else SYSTEM_PROMPT_SHRI
                records = self.generate_sft_local(doc, sys_prompt)
                all_records.extend(records)

        # Deduplicate final records to ensure no identical questions, assistant responses, or full records are present
        unique_records = []
        seen_questions = set()
        seen_answers = set()
        seen_full_records = set()
        
        for rec in all_records:
            # Find user and assistant message contents
            q_text = ""
            a_text = ""
            for msg in rec.get("messages", []):
                role = msg.get("role")
                content = msg.get("content", "").strip()
                if role == "user":
                    q_text = content.lower()
                elif role == "assistant":
                    a_text = content.lower()
                    
            # If both user and assistant messages are empty, skip to prevent meaningless records
            if not q_text and not a_text:
                continue

            # Canonical record serialization
            canon_rec = json.dumps(rec, sort_keys=True)
            
            # If the entire record is already seen, skip
            if canon_rec in seen_full_records:
                continue
                
            # If we have a user message, check if seen
            if q_text and q_text in seen_questions:
                continue
            
            # Fallback check on assistant message content
            if a_text and a_text in seen_answers:
                continue

            # Mark as seen and add to unique records
            if q_text:
                seen_questions.add(q_text)
            if a_text:
                seen_answers.add(a_text)
            seen_full_records.add(canon_rec)
            unique_records.append(rec)
            
        all_records = unique_records

        sft_file = self.output_dir / "train.jsonl"
        with open(sft_file, "w", encoding="utf-8") as f:
            for record in all_records:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
                
        logger.info(f"Wrote SFT dataset to {sft_file} ({len(all_records)} chat records)")
        return sft_file

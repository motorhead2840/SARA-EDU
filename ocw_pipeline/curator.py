"""
curator.py - Quality curation, deduplication, and safety filtering of OCW crawled data.
Ensures that only high-quality, safe, and academically rigorous materials are added to the corpus.
Strictly excludes Khan Academy or inappropriate content.
"""

import logging
import re
from typing import List, Dict, Any, Tuple

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger("OCWCurator")

# Quality thresholds
MIN_CHAR_LENGTH = 100
MIN_WORD_COUNT = 15

# Safety checklist/blacklists
BLACKLISTED_KEYWORDS = [
    r"\bkhan\s*academy\b",
    r"\bspam\b",
    r"\bclick\s*here\b",
    r"\bporn\b",
    r"\bviolence\b",
]

class OCWCurator:
    def __init__(self, min_length: int = MIN_CHAR_LENGTH, min_words: int = MIN_WORD_COUNT):
        self.min_length = min_length
        self.min_words = min_words

    def clean_text(self, text: str) -> str:
        """
        Standardizes character normalization and removes extra spacing.
        Replaces em dashes (—, \\u2014) and en dashes (–, \\u2013) with simple hyphens to prevent text
        encoding/decoding issues and ensure clean tokenization in UTF-8/ASCII systems.
        """
        text = text.replace("\u2014", "-").replace("\u2013", "-")
        # Remove multiple newlines and spaces
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def get_jaccard_similarity(self, s1: str, s2: str) -> float:
        """Calculate Jaccard similarity between two texts for deduplication."""
        words1 = set(re.findall(r'\w+', s1.lower()))
        words2 = set(re.findall(r'\w+', s2.lower()))
        if not words1 or not words2:
            return 0.0
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        return len(intersection) / len(union)

    def deduplicate(self, documents: List[Dict[str, Any]], threshold: float = 0.85) -> List[Dict[str, Any]]:
        """Removes near-duplicate documents based on Jaccard similarity."""
        unique_docs = []
        for doc in documents:
            is_duplicate = False
            for u_doc in unique_docs:
                sim = self.get_jaccard_similarity(doc["content"], u_doc["content"])
                if sim >= threshold:
                    logger.info(f"Duplicate detected: '{doc['title']}' is {sim:.2f} similar to '{u_doc['title']}'. Skipping.")
                    is_duplicate = True
                    break
            if not is_duplicate:
                unique_docs.append(doc)
        return unique_docs

    def is_safe_and_appropriate(self, text: str) -> Tuple[bool, str]:
        """Verify safety and alignment with SHRI-ACADEMY values (and strict exclusion of Khan Academy)."""
        lowered = text.lower()
        for pattern in BLACKLISTED_KEYWORDS:
            if re.search(pattern, lowered):
                return False, f"Matched blacklisted/restricted pattern: {pattern}"
        return True, "Passed safety checklist"

    def assess_quality_score(self, text: str) -> float:
        """
        Gives a quality score (0.0 to 1.0) based on educational density,
        vocabulary richness, and length characteristics.
        """
        words = text.split()
        if len(text) < self.min_length or len(words) < self.min_words:
            return 0.0

        # Educational terms density booster
        edu_keywords = [
            "learning", "education", "psychology", "philosophy", "atman", "unity",
            "student", "cognitive", "mindfulness", "resilience", "pedagogy",
            "academic", "understanding", "socratic", "development", "stability"
        ]
        keyword_hits = sum(1 for w in words if w.lower() in edu_keywords)
        keyword_density = keyword_hits / len(words)

        # Vocabulary variety (unique words ratio)
        unique_words = set(w.lower() for w in words)
        vocab_richness = len(unique_words) / len(words) if words else 0

        # Quality scoring formula
        score = (vocab_richness * 0.4) + (min(1.0, keyword_density * 10) * 0.4) + (min(1.0, len(text)/1000) * 0.2)
        return min(1.0, score)

    def curate(self, raw_documents: List[Dict[str, Any]], quality_threshold: float = 0.3) -> List[Dict[str, Any]]:
        """Curates, filters, and cleans the raw documents."""
        curated_docs = []
        for doc in raw_documents:
            # 1. Clean the text
            cleaned_content = self.clean_text(doc["content"])
            doc["content"] = cleaned_content

            # 2. Check Safety
            is_safe, safety_msg = self.is_safe_and_appropriate(cleaned_content)
            if not is_safe:
                logger.warning(f"Skipping document '{doc['title']}' - Safety Failure: {safety_msg}")
                continue

            # 3. Assess Quality
            score = self.assess_quality_score(cleaned_content)
            doc["quality_score"] = score
            if score < quality_threshold:
                logger.info(f"Skipping document '{doc['title']}' - Quality score too low: {score:.2f} < {quality_threshold}")
                continue

            curated_docs.append(doc)

        # 4. Deduplicate
        final_docs = self.deduplicate(curated_docs)
        logger.info(f"Curation complete: {len(final_docs)} out of {len(raw_documents)} documents accepted.")
        return final_docs

if __name__ == "__main__":
    curator = OCWCurator()
    sample_docs = [
        {"title": "Test 1", "content": "This is a brief educational psychology lecture regarding student mental stability, learning paradigms, cognitive science, and pedagogy.", "course_id": "T1"},
        {"title": "Test 2", "content": "This is a brief educational psychology lecture regarding student mental stability, learning paradigms, cognitive science, and pedagogy.", "course_id": "T2"}, # duplicate
        {"title": "Test 3", "content": "Inappropriate content containing reference to Khan Academy, a non-curated provider.", "course_id": "T3"}, # unsafe
        {"title": "Test 4", "content": "Too short.", "course_id": "T4"} # low quality
    ]
    curated = curator.curate(sample_docs, quality_threshold=0.1)
    print(curated)

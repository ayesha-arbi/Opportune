import os
import json
import logging
import requests
from typing import Optional, Dict, Any, List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scraper.llm")

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

MODEL_CANDIDATES = [
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "gemma2-9b-it",
    "llama-3.1-8b-instant",
]

EXTRACTION_SYSTEM_PROMPT = """You are an expert data extraction AI for Opportune.
Your job is to extract opportunity details (hackathons, research fellowships, competitions, grants) from raw web page content into structured JSON.

CRITICAL INSTRUCTIONS:
1. Output ONLY valid JSON matching the specified JSON schema.
2. Output null for any field you cannot clearly and explicitly find on the page — especially 'deadline', 'start_date', and 'end_date'.
3. NEVER guess, estimate, or hallucinate dates, prize amounts, or eligibility requirements. If a date is ambiguous or missing, set it to null.
4. Output ISO 8601 strings for dates if found (e.g., '2026-10-15T23:59:59Z').
5. 'type' MUST be one of: 'hackathon', 'fellowship', 'competition', 'research', 'grant', 'other'.
6. If the content is a guide, advice article, blog post, or informational content (not an actual opportunity with a deadline and application process), return null for all fields to skip extraction.
"""

def extract_opportunity_json(page_text: str, source_url: str, source_name: str, check_title: bool = False, field_tags: List[str] = None) -> Optional[Dict[str, Any]]:
    if field_tags is None:
        field_tags = []
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        logger.error("GROQ_API_KEY environment variable is not set")
        return None

    # Truncate text to fit context if excessively long
    content_snippet = page_text[:12000]

    # Add instruction to check title for deadline if configured
    title_instruction = ""
    if check_title:
        title_instruction = "IMPORTANT: Check both the title and body content for deadline information, as titles often contain key dates."

    # Add instruction about existing field tags if provided
    tags_instruction = ""
    if field_tags:
        tags_instruction = f"Use these existing tags as field_tags: {field_tags}. Only add additional tags if clearly relevant."

    user_prompt = f"""Extract opportunity information from the following page content.

Source URL: {source_url}
Platform Name: {source_name}

{title_instruction}
{tags_instruction}

Page Content:
---
{content_snippet}
---

Return a JSON object with these keys:
- title (string, required)
- description (string or null)
- type (one of: 'hackathon', 'fellowship', 'competition', 'research', 'grant', 'other')
- field_tags (array of string tags e.g. ['ai', 'web3'])
- eligibility (object with optional 'edu_level', 'region' or null)
- organizer (string or null)
- location (string or null)
- is_remote (boolean)
- deadline (ISO 8601 datetime string or null)
- start_date (ISO 8601 datetime string or null)
- end_date (ISO 8601 datetime string or null)
- prize_info (string or null)
- source_url (string, use '{source_url}')
- source_name (string, use '{source_name}')
- application_url (string or null)
"""

    messages = [
        {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    last_error = ""
    for model in MODEL_CANDIDATES:
        try:
            logger.info(f"Attempting extraction using Groq model: {model}")
            response = requests.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"},
                },
                timeout=45,
            )

            if response.status_code != 200:
                last_error = f"Status {response.status_code}: {response.text[:200]}"
                logger.warning(f"Model {model} failed ({last_error}). Retrying with next model...")
                continue

            res_data = response.json()
            raw_content = res_data.get("choices", [{}])[0].get("message", {}).get("content", "")
            if not raw_content:
                last_error = "Empty response content"
                logger.warning(f"Model {model} returned empty content. Retrying with next model...")
                continue

            # Strip markdown fence if present
            clean_json_str = raw_content.strip()
            if clean_json_str.startswith("```"):
                clean_json_str = clean_json_str.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

            parsed = json.loads(clean_json_str)
            logger.info(f"Successfully extracted data using model: {model}")
            return parsed

        except Exception as e:
            last_error = str(e)
            logger.warning(f"Exception using model {model}: {last_error}. Retrying with next model...")

    logger.error(f"All LLM candidate models failed. Last error: {last_error}")
    return None
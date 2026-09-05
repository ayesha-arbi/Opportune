import logging
import datetime
import requests
from bs4 import BeautifulSoup
from typing import List
from scraper.schema import OpportunityExtracted
from scraper.llm import extract_opportunity_json

logger = logging.getLogger("scraper.sources.mlh")

SOURCE_NAME = "Major League Hacking"

def scrape_mlh(limit: int = 5) -> List[OpportunityExtracted]:
    year = datetime.datetime.now().year
    mlh_url = f"https://mlh.io/seasons/{year}/events"
    logger.info(f"Fetching MLH events from {mlh_url}...")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        response = requests.get(mlh_url, headers=headers, timeout=30)
        if response.status_code != 200:
            logger.error(f"Failed to fetch MLH page: Status {response.status_code}")
            return []

        soup = BeautifulSoup(response.text, "html.parser")
        event_cards = soup.select(".event-card, .event, div[itemtype*='Event']")

        results: List[OpportunityExtracted] = []
        urls_seen = set()

        for card in event_cards:
            if len(results) >= limit:
                break

            link_tag = card.select_one("a[href]")
            if not link_tag:
                continue

            href = link_tag.get("href", "").strip()
            if not href or href in urls_seen or "mlh.io" not in href and not href.startswith("http"):
                continue
            urls_seen.add(href)

            card_text = card.get_text(separator="\n", strip=True)

            # Extract via LLM
            extracted = extract_opportunity_json(card_text, href, SOURCE_NAME, check_title=False, field_tags=[])
            if not extracted:
                continue

            extracted["source_url"] = href
            extracted["source_name"] = SOURCE_NAME
            if "type" not in extracted or not extracted["type"]:
                extracted["type"] = "hackathon"

            try:
                item = OpportunityExtracted(**extracted)
                results.append(item)
                logger.info(f"[MLH] Successfully extracted: {item.title}")
            except Exception as val_err:
                if "Deadline is in the past" in str(val_err):
                    logger.info(f"[MLH] Skipping expired opportunity: {href}")
                else:
                    logger.warning(f"[MLH] Validation failed for {href}: {val_err}")

        return results

    except Exception as e:
        logger.error(f"Error scraping MLH: {e}")
        return []

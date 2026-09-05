import logging
import requests
from bs4 import BeautifulSoup
from typing import List
from scraper.schema import OpportunityExtracted
from scraper.llm import extract_opportunity_json

logger = logging.getLogger("scraper.sources.devpost")

DEVPOST_URL = "https://devpost.com/hackathons"
SOURCE_NAME = "Devpost"

def scrape_devpost(limit: int = 5) -> List[OpportunityExtracted]:
    logger.info(f"Fetching Devpost hackathons listing from {DEVPOST_URL}...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        response = requests.get(DEVPOST_URL, headers=headers, timeout=30)
        if response.status_code != 200:
            logger.error(f"Failed to fetch Devpost listing: Status {response.status_code}")
            return []

        soup = BeautifulSoup(response.text, "html.parser")
        tiles = soup.select(".hackathon-tile, .main-content .tile-wrapper, article.challenge-listing")

        results: List[OpportunityExtracted] = []
        urls_seen = set()

        for tile in tiles:
            if len(results) >= limit:
                break

            link_tag = tile.select_one("a[href*='devpost.com']") or tile.select_one("a.strip-link")
            if not link_tag:
                continue

            href = link_tag.get("href", "").strip()
            if not href or href in urls_seen:
                continue
            urls_seen.add(href)

            # Extract tile text context
            tile_text = tile.get_text(separator="\n", strip=True)

            # Try fetching detail page for full content if available
            page_text = tile_text
            try:
                detail_res = requests.get(href, headers=headers, timeout=15)
                if detail_res.status_code == 200:
                    detail_soup = BeautifulSoup(detail_res.text, "html.parser")
                    page_text = detail_soup.get_text(separator="\n", strip=True)[:10000]
            except Exception as e:
                logger.warning(f"Could not fetch detail page for {href}: {e}")

            # AI extraction
            extracted = extract_opportunity_json(page_text, href, SOURCE_NAME, check_title=False, field_tags=[])
            if not extracted:
                continue

            # Ensure source_url is populated correctly
            extracted["source_url"] = href
            extracted["source_name"] = SOURCE_NAME
            if "type" not in extracted or not extracted["type"]:
                extracted["type"] = "hackathon"

            try:
                item = OpportunityExtracted(**extracted)
                results.append(item)
                logger.info(f"[Devpost] Successfully extracted: {item.title}")
            except Exception as val_err:
                if "Deadline is in the past" in str(val_err):
                    logger.info(f"[Devpost] Skipping expired opportunity: {href}")
                else:
                    logger.warning(f"[Devpost] Validation failed for {href}: {val_err}")

        return results

    except Exception as e:
        logger.error(f"Error scraping Devpost: {e}")
        return []

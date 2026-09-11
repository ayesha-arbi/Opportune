"""
Agentic background crawler for opportunity discovery.
Uses AI to decide what to fetch and where to go next.
"""
import os
import sys
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from urllib.parse import urlparse, urljoin
import requests

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from scraper.db import upsert_opportunity
    from scraper.llm import extract_opportunity_json
except ImportError:
    # Fallback imports for standalone execution
    from db import upsert_opportunity
    from llm import extract_opportunity_json

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("scraper.agentic_crawler")

# Configuration
# NOTE: devpost.com and mlh.io were removed from here on purpose — they're
# JS-rendered (React/Next) sites, so a plain requests.get() only sees the
# empty page shell, not the actual event list. They're already covered
# properly by sources/devpost.py and sources/mlh.py (presumably via API).
# This crawler is for the server-rendered / WordPress-style sites where
# link-following actually works.
ALLOWED_DOMAINS = [
    "opportunitiescorners.com",
    "www.opportunitiescircle.com",
    "scholarships-positions.com",
    "youthopportunities.org",
    "fullyfundedscholarships.com",
]

STARTING_URLS = [
    "https://opportunitiescorners.com",
    "https://www.opportunitiescircle.com",
    "https://www.scholarships-positions.com",
    "https://www.youthopportunities.org",
    "https://www.fullyfundedscholarships.com",
]

# Tags to focus on (from Part 1 of tag-scoping prompt)
TOP_TAGS = [
    "artificial intelligence",
    "machine learning",
    "data science",
    "web3",
    "blockchain",
    "climate tech",
    "sustainability",
    "healthcare",
    "fintech",
    "education",
]

class BrowsingConfig:
    def __init__(self, max_fetches: int):
        self.max_fetches = max_fetches
        self.current_fetches = 0
        self.allowlist = ALLOWED_DOMAINS.copy()
        self.visited_urls = set()
        self.agent_log = []

    def can_fetch(self) -> bool:
        return self.current_fetches < self.max_fetches

    def record_fetch(self, url: str, action: str, result: str):
        self.agent_log.append({
            "timestamp": datetime.now().isoformat(),
            "url": url,
            "action": action,
            "result": result,
        })
        logger.info(f"[Agent Log] {action} {url}: {result}")

def extract_domain(url: str) -> Optional[str]:
    try:
        parsed = urlparse(url)
        return parsed.netloc
    except:
        return None

def is_domain_allowed(url: str, config: BrowsingConfig) -> bool:
    domain = extract_domain(url)
    if not domain:
        return False
    
    return any(
        domain == allowed or domain.endswith(f".{allowed}")
        for allowed in config.allowlist
    )

def fetch_page(url: str, config: BrowsingConfig) -> Dict[str, Any]:
    """Fetch a page and extract content and links."""
    if not config.can_fetch():
        return {"error": "Fetch budget exceeded"}
    
    if not is_domain_allowed(url, config):
        return {"error": f"Domain not in allowlist: {extract_domain(url)}"}
    
    if url in config.visited_urls:
        return {"error": "URL already visited"}
    
    config.visited_urls.add(url)
    config.current_fetches += 1
    
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=15)
        
        if response.status_code != 200:
            config.record_fetch(url, "fetch", f"HTTP {response.status_code}")
            return {"error": f"HTTP {response.status_code}"}
        
        # Extract text content
        text = response.text
        # Simple text extraction (remove HTML tags)
        import re
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        text = text[:15000]  # Limit length
        
        # Extract links
        links = []
        link_pattern = r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>([^<]*)</a>'
        for match in re.finditer(link_pattern, response.text, re.IGNORECASE):
            href = match.group(1)
            link_text = match.group(2).strip()
            
            # Resolve relative URLs
            if href.startswith('/'):
                href = urljoin(url, href)
            elif not href.startswith('http'):
                continue
            
            links.append({"href": href, "text": link_text})
        
        config.record_fetch(url, "fetch", f"Success - {len(links)} links found")
        return {"text": text, "links": links, "url": url}
        
    except Exception as e:
        config.record_fetch(url, "fetch", f"Error: {str(e)}")
        return {"error": str(e)}

def should_follow_link(link: Dict[str, str], context: str) -> bool:
    """AI decision: should the agent follow this link?"""
    # Heuristic-based implementation

    href = link["href"].lower()
    text = link["text"].lower()

    # Skip common non-opportunity links. NOTE: pagination markers
    # ("page/", "/page/") used to be in here, which meant the crawler
    # could never move past page 1 of any listing. Removed.
    skip_patterns = [
        "privacy", "terms", "contact", "about", "advertise", "subscribe",
        "whatsapp", "telegram", "facebook", "twitter", "instagram",
        "login", "register", "signin", "signup",
        "wp-admin", "xmlrpc", "feed", "mailto:", "javascript:", "#",
    ]

    for pattern in skip_patterns:
        if pattern in href:
            return False

    # Follow links that look like opportunities
    opportunity_patterns = [
        "scholarship", "fellowship", "internship", "grant", "competition",
        "hackathon", "summit", "conference", "program", "funded",
        "opportunity", "call for", "apply",
    ]

    for pattern in opportunity_patterns:
        if pattern in href or pattern in text:
            return True

    # Follow category/index/pagination pages so we don't get stuck on page 1
    category_patterns = [
        "category", "tag", "opportunities", "programs", "fellowships",
        "page/", "/page/", "?paged=", "load-more", "/page-",
    ]

    for pattern in category_patterns:
        if pattern in href:
            return True

    # Fallback: catch slug-style detail-page URLs that don't contain any of
    # the keywords above (e.g. "/global-ai-summit-2026" or
    # "/some-org-research-grant"). These are exactly the links a
    # keyword-only filter misses, which was a big chunk of the "shallow"
    # problem.
    path = urlparse(link["href"]).path.strip("/")
    segments = [s for s in path.split("/") if s]
    if segments:
        last_segment = segments[-1]
        looks_like_slug = (
            len(last_segment) > 12
            and "-" in last_segment
            and not last_segment.isdigit()
        )
        if looks_like_slug:
            return True

    return False

async def agentic_crawl(config: BrowsingConfig) -> List[Dict[str, Any]]:
    """Main agentic crawling loop."""
    opportunities = []
    urls_to_visit = STARTING_URLS.copy()
    
    logger.info(f"Starting agentic crawl with {config.max_fetches} fetch budget")
    logger.info(f"Focus tags: {TOP_TAGS}")
    
    while urls_to_visit and config.can_fetch():
        url = urls_to_visit.pop(0)
        
        page = fetch_page(url, config)
        
        if page.get("error"):
            continue
        
        # Try to extract opportunity data
        extracted = extract_opportunity_json(
            page["text"],
            page["url"],
            "agentic_crawler",
            check_title=True,
            field_tags=[]
        )
        
        if extracted:
            # Check if it matches our focus tags
            content = f"{extracted.get('title', '')} {extracted.get('description', '')} {extracted.get('field_tags', [])}"
            if any(tag.lower() in content.lower() for tag in TOP_TAGS):
                opportunities.append(extracted)
                config.record_fetch(url, "extract", f"Opportunity extracted: {extracted.get('title', 'Unknown')}")
            else:
                config.record_fetch(url, "extract", "Skipped - doesn't match focus tags")
        else:
            config.record_fetch(url, "extract", "Not an opportunity page")
        
        # Decide which links to follow
        relevant_links = [
            link for link in page.get("links", [])
            if should_follow_link(link, page["text"])
        ]
        
        # Add relevant links to visit queue (limit to avoid explosion)
        for link in relevant_links[:5]:  # Max 5 links per page
            if link["href"] not in config.visited_urls and link["href"] not in urls_to_visit:
                urls_to_visit.append(link["href"])
        
        logger.info(f"Added {len(relevant_links[:5])} links to queue. Queue size: {len(urls_to_visit)}")
    
    return opportunities

def main():
    """Run the agentic crawler and return results."""
    logger.info("=== Starting Agentic Background Crawler ===")
    
    # Create browsing config with fetch budget
    config = BrowsingConfig(max_fetches=50)  # 50 fetches per run
    
    # Run agentic crawl
    import asyncio
    opportunities = asyncio.run(agentic_crawl(config))
    
    # Upsert opportunities to database
    upserted_count = 0
    for opp in opportunities:
        success = upsert_opportunity(opp)
        if success:
            upserted_count += 1
    
    # Print agent log summary
    logger.info("=== Agent Path Summary ===")
    for log_entry in config.agent_log:
        logger.info(f"{log_entry['timestamp']} - {log_entry['action']} - {log_entry['url']}: {log_entry['result']}")
    
    logger.info(f"=== Crawl Complete ===")
    logger.info(f"Total fetches: {config.current_fetches}/{config.max_fetches}")
    logger.info(f"Opportunities extracted: {len(opportunities)}")
    logger.info(f"Opportunities upserted: {upserted_count}")
    
    # Save agent log to file for debugging
    try:
        with open("agent_log.json", "w") as f:
            import json
            json.dump(config.agent_log, f, indent=2)
        logger.info("Agent log saved to agent_log.json")
    except Exception as e:
        logger.warning(f"Could not save agent log: {e}")
    
    return opportunities  # Return for integration with main scraper

if __name__ == "__main__":
    main()
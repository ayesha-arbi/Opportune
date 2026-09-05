"""
Generic WordPress source adapter for opportunity aggregators.
Handles both WP REST API and RSS feed discovery methods.
"""
import logging
import requests
from typing import List, Dict, Any
from scraper.config import SourceConfig
from scraper.schema import OpportunityExtracted
from scraper.llm import extract_opportunity_json

logger = logging.getLogger("scraper.sources.wordpress")

def scrape_wordpress_source(config: SourceConfig) -> List[OpportunityExtracted]:
    """
    Generic WordPress source scraper using the config system.
    """
    logger.info(f"Scraping {config.display_name} from {config.base_url}...")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    results: List[OpportunityExtracted] = []
    
    try:
        if config.discovery_method == "wp_rest_api":
            results = _scrape_wp_rest_api(config, headers)
        elif config.discovery_method == "rss_feed":
            results = _scrape_rss_feed(config, headers)
        else:
            logger.error(f"Unsupported discovery method: {config.discovery_method}")
            return []
            
        logger.info(f"Successfully extracted {len(results)} opportunities from {config.display_name}")
        return results
        
    except Exception as e:
        logger.error(f"Error scraping {config.display_name}: {e}", exc_info=True)
        return []

def _scrape_wp_rest_api(config: SourceConfig, headers: Dict[str, str]) -> List[OpportunityExtracted]:
    """Scrape using WordPress REST API."""
    endpoint = f"{config.base_url}{config.discovery_endpoint}"
    logger.info(f"Fetching from WP REST API: {endpoint}")
    
    params = {
        "per_page": config.limit,
        "_fields": "id,title,link,content,categories,tags,date"
    }
    
    response = requests.get(endpoint, headers=headers, params=params, timeout=30)
    if response.status_code != 200:
        logger.error(f"Failed to fetch WP API: Status {response.status_code}")
        return []
    
    posts = response.json()
    results: List[OpportunityExtracted] = []
    
    for post in posts:
        # Category filtering
        if not _should_include_post(post, config):
            continue
            
        # Extract content
        title = post.get("title", {}).get("rendered", "")
        content = post.get("content", {}).get("rendered", "")
        link = post.get("link", "")
        
        # Combine title and content for extraction (title often has deadline info)
        full_text = f"{title}\n\n{content}"
        
        # Get categories for field_tags
        categories = post.get("categories", [])
        field_tags = _extract_field_tags(categories)
        
        # AI extraction
        extracted = extract_opportunity_json(
            full_text, 
            link, 
            config.name,
            check_title=config.check_title_for_deadline,
            field_tags=field_tags or []
        )
        
        if not extracted:
            continue
            
        # Override with structured data from API
        extracted["source_url"] = link
        extracted["source_name"] = config.display_name
        extracted["field_tags"] = field_tags
        
        # Set remote default
        if "is_remote" not in extracted or extracted["is_remote"] is None:
            extracted["is_remote"] = config.default_remote
            
        try:
            item = OpportunityExtracted(**extracted)
            results.append(item)
            logger.info(f"[{config.display_name}] Successfully extracted: {item.title}")
        except Exception as val_err:
            if "Deadline is in the past" in str(val_err):
                logger.info(f"[{config.display_name}] Skipping expired opportunity: {link}")
            else:
                logger.warning(f"[{config.display_name}] Validation failed for {link}: {val_err}")
    
    return results

def _scrape_rss_feed(config: SourceConfig, headers: Dict[str, str]) -> List[OpportunityExtracted]:
    """Scrape using RSS feed."""
    import feedparser
    
    feed_url = f"{config.base_url}{config.discovery_endpoint}"
    logger.info(f"Fetching from RSS feed: {feed_url}")
    
    feed = feedparser.parse(feed_url)
    
    if feed.bozo:
        logger.warning(f"RSS feed parsing warning: {feed.bozo}")
    
    results: List[OpportunityExtracted] = []
    
    for entry in feed.entries[:config.limit]:
        link = entry.get("link", "")
        title = entry.get("title", "")
        content = entry.get("description", "") or entry.get("content", [{}])[0].get("value", "")
        
        # Combine title and content
        full_text = f"{title}\n\n{content}"
        
        # Basic category filtering (RSS has limited category info)
        tags = [tag.term for tag in entry.get("tags", [])]
        if config.excluded_categories:
            if any(excluded.lower() in str(tags).lower() for excluded in config.excluded_categories):
                logger.debug(f"Skipping {link} - excluded by category filter")
                continue
        
        # AI extraction
        extracted = extract_opportunity_json(
            full_text,
            link,
            config.name,
            check_title=config.check_title_for_deadline,
            field_tags=tags or []
        )
        
        if not extracted:
            continue
            
        extracted["source_url"] = link
        extracted["source_name"] = config.display_name
        extracted["field_tags"] = tags
        
        if "is_remote" not in extracted or extracted["is_remote"] is None:
            extracted["is_remote"] = config.default_remote
            
        try:
            item = OpportunityExtracted(**extracted)
            results.append(item)
            logger.info(f"[{config.display_name}] Successfully extracted: {item.title}")
        except Exception as val_err:
            if "Deadline is in the past" in str(val_err):
                logger.info(f"[{config.display_name}] Skipping expired opportunity: {link}")
            else:
                logger.warning(f"[{config.display_name}] Validation failed for {link}: {val_err}")
    
    return results

def _should_include_post(post: Dict[str, Any], config: SourceConfig) -> bool:
    """Check if post should be included based on category filters."""
    categories = post.get("categories", [])
    
    # If no categories, include it (better to be inclusive)
    if not categories:
        return True
    
    # Check excluded categories
    if config.excluded_categories:
        for excluded in config.excluded_categories:
            if any(excluded.lower() in str(cat).lower() for cat in categories):
                logger.debug(f"Excluding post - matches excluded category: {excluded}")
                return False
    
    # If included categories specified, only include those
    if config.included_categories:
        if not any(inc.lower() in str(cat).lower() for inc in config.included_categories for cat in categories):
            logger.debug(f"Excluding post - doesn't match included categories")
            return False
    
    return True

def _extract_field_tags(categories: List[Any]) -> List[str]:
    """Extract field tags from category IDs/names."""
    # In WP API, categories can be IDs or objects. This is a simple extraction.
    tag_list = []
    for cat in categories:
        if isinstance(cat, str):
            tag_list.append(cat)
        elif isinstance(cat, dict):
            name = cat.get("name", "")
            if name:
                tag_list.append(name)
        elif isinstance(cat, int):
            # Could map ID to name if needed, but for now just use as is
            tag_list.append(str(cat))
    
    return tag_list

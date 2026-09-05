import os
import logging
import datetime
from typing import Optional, Dict, Any
from supabase import create_client, Client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scraper.db")

_client: Optional[Client] = None

def get_supabase_client() -> Client:
    global _client
    if _client is not None:
        return _client

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set")

    _client = create_client(url, key)
    return _client

def upsert_opportunity(data: Dict[str, Any]) -> bool:
    try:
        supabase = get_supabase_client()
        # Clean null values if needed or prepare payload
        payload = {
            "title": data["title"],
            "description": data.get("description"),
            "type": data.get("type", "other"),
            "field_tags": data.get("field_tags", []),
            "eligibility": data.get("eligibility"),
            "organizer": data.get("organizer"),
            "location": data.get("location"),
            "is_remote": data.get("is_remote", False),
            "deadline": data.get("deadline"),
            "start_date": data.get("start_date"),
            "end_date": data.get("end_date"),
            "prize_info": data.get("prize_info"),
            "source_url": data["source_url"],
            "source_name": data.get("source_name"),
            "application_url": data.get("application_url"),
            "is_active": True,
        }

        res = supabase.table("opportunities").upsert(
            payload,
            on_conflict="source_url"
        ).execute()

        logger.info(f"Successfully upserted opportunity: '{payload['title']}' ({payload['source_url']})")
        return True
    except Exception as e:
        logger.error(f"Failed to upsert opportunity '{data.get('title')}': {e}")
        return False

def deactivate_expired_opportunities() -> int:
    try:
        supabase = get_supabase_client()
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        # Deactivate opportunities whose deadline is in the past
        res = supabase.table("opportunities") \
            .update({"is_active": False}) \
            .eq("is_active", True) \
            .lt("deadline", now_iso) \
            .execute()

        count = len(res.data) if res.data else 0
        logger.info(f"Deactivated {count} expired opportunities.")
        return count
    except Exception as e:
        logger.error(f"Error deactivating expired opportunities: {e}")
        return 0

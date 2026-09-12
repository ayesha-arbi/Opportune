"""
Deduplication Agent - removes duplicate opportunities.
"""
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from scraper.agents.base import Agent, AgentMessage, MessageType
from scraper.deduplication import calculate_similarity_score, is_duplicate

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scraper.agents.deduplication")

class DeduplicationAgent(Agent):
    """Deduplicates opportunities using similarity scoring."""
    
    def __init__(self):
        super().__init__("deduplication_agent")
        self.opportunity_cache: list = []
        self.duplicates_found = 0
        self.uniques_found = 0
    
    def can_handle(self, message: AgentMessage) -> bool:
        return message.message_type == MessageType.DEDUPLICATE
    
    async def process(self, message: AgentMessage) -> Optional[AgentMessage]:
        """Check for duplicates and pass unique opportunities to storage."""
        opportunity = message.payload.get("opportunity")
        
        if not opportunity:
            logger.warning("No opportunity data in deduplication message")
            return None
        
        # Check if this is a duplicate
        duplicate_url = is_duplicate(opportunity, self.opportunity_cache)
        
        if duplicate_url:
            logger.info(f"Duplicate found: {opportunity.get('title')} (matches {duplicate_url})")
            self.duplicates_found += 1
            return None
        
        # Add to cache and pass to storage
        self.opportunity_cache.append(opportunity)
        self.uniques_found += 1
        logger.info(f"Unique opportunity: {opportunity.get('title')}")
        
        # In a full implementation, this would go to a storage agent
        # For now, we'll mark as complete
        return AgentMessage(
            message_type=MessageType.COMPLETE,
            sender=self.name,
            recipient="coordinator",
            payload={"opportunity": opportunity, "action": "store"},
            timestamp=datetime.now().timestamp(),
            correlation_id=message.correlation_id,
        )
    
    def clear_cache(self) -> None:
        """Clear the opportunity cache (useful for testing or periodic cleanup)."""
        self.opportunity_cache.clear()
        logger.info("Deduplication cache cleared")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get deduplication-specific statistics."""
        stats = super().get_stats()
        stats.update({
            "duplicates_found": self.duplicates_found,
            "uniques_found": self.uniques_found,
            "cache_size": len(self.opportunity_cache),
            "deduplication_rate": self.duplicates_found / max(1, self.duplicates_found + self.uniques_found),
        })
        return stats
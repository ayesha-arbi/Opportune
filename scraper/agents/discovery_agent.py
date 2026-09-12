"""
Discovery Agent - discovers new opportunities from sources.
"""
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from scraper.agents.base import Agent, AgentMessage, MessageType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scraper.agents.discovery")

class DiscoveryAgent(Agent):
    """Discovers opportunities by crawling sources using AI-directed navigation."""
    
    def __init__(self):
        super().__init__("discovery_agent")
        self.pages_crawled = 0
        self.opportunities_found = 0
        self.sources_crawled = 0
    
    def can_handle(self, message: AgentMessage) -> bool:
        return message.message_type == MessageType.DISCOVER
    
    async def process(self, message: AgentMessage) -> Optional[AgentMessage]:
        """Discover opportunities from configured sources."""
        source_name = message.payload.get("source_name")
        fetch_budget = message.payload.get("fetch_budget", 50)
        
        logger.info(f"Starting discovery for source: {source_name}")
        
        try:
            # For now, we'll use the existing sources directly
            # In a full implementation, this would use the agentic crawler
            from scraper.sources.devpost import scrape_devpost
            from scraper.sources.mlh import scrape_mlh
            from scraper.sources.wordpress import scrape_wordpress_source
            from scraper.config import SOURCES
            
            opportunities = []
            
            # Scrape all configured sources
            for source_key, config in SOURCES.items():
                logger.info(f"Scraping source: {config.display_name}")
                if source_key == "devpost":
                    opportunities.extend(scrape_devpost())
                elif source_key == "mlh":
                    opportunities.extend(scrape_mlh())
                else:
                    opportunities.extend(scrape_wordpress_source(config))
            
            self.sources_crawled += len(SOURCES)
            self.pages_crawled += len(opportunities)
            self.opportunities_found += len(opportunities)
            
            logger.info(f"Discovery complete: {len(opportunities)} opportunities found")
            
            # Return completion message with opportunities
            # The coordinator will handle distributing to validation agent
            return AgentMessage(
                message_type=MessageType.COMPLETE,
                sender=self.name,
                recipient="coordinator",
                payload={
                    "opportunities_count": len(opportunities),
                    "opportunities": [opp.model_dump() if hasattr(opp, 'model_dump') else opp for opp in opportunities],
                },
                timestamp=datetime.now().timestamp(),
                correlation_id=message.correlation_id,
            )
            
        except Exception as e:
            logger.error(f"Discovery error for {source_name}: {e}")
            return None
    
    def get_stats(self) -> Dict[str, Any]:
        """Get discovery-specific statistics."""
        stats = super().get_stats()
        stats.update({
            "pages_crawled": self.pages_crawled,
            "opportunities_found": self.opportunities_found,
            "sources_crawled": self.sources_crawled,
            "opportunities_per_source": self.opportunities_found / max(1, self.sources_crawled),
        })
        return stats
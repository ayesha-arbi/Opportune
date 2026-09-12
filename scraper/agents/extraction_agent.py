"""
Extraction Agent - extracts structured data from web pages.
"""
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from scraper.agents.base import Agent, AgentMessage, MessageType
from scraper.llm import extract_opportunity_json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scraper.agents.extraction")

class ExtractionAgent(Agent):
    """Extracts structured opportunity data from page content."""
    
    def __init__(self):
        super().__init__("extraction_agent", max_retries=2)  # Retry AI calls
        self.extractions_attempted = 0
        self.extractions_successful = 0
        self.extractions_failed = 0
    
    def can_handle(self, message: AgentMessage) -> bool:
        return message.message_type == MessageType.EXTRACT
    
    async def process(self, message: AgentMessage) -> Optional[AgentMessage]:
        """Extract opportunity data from page content."""
        page_text = message.payload.get("page_text")
        source_url = message.payload.get("source_url")
        source_name = message.payload.get("source_name")
        check_title = message.payload.get("check_title", False)
        field_tags = message.payload.get("field_tags", [])
        
        if not page_text or not source_url:
            logger.warning("Missing required fields in extraction message")
            return None
        
        self.extractions_attempted += 1
        
        try:
            # Use existing extraction logic
            extracted = extract_opportunity_json(
                page_text=page_text,
                source_url=source_url,
                source_name=source_name,
                check_title=check_title,
                field_tags=field_tags,
            )
            
            if not extracted:
                logger.info(f"Extraction returned null for {source_url}")
                self.extractions_failed += 1
                return None
            
            logger.info(f"Extraction successful: {extracted.get('title')}")
            self.extractions_successful += 1
            
            # Pass to validation agent
            return AgentMessage(
                message_type=MessageType.VALIDATE,
                sender=self.name,
                recipient="validation_agent",
                payload={"opportunity": extracted},
                timestamp=datetime.now().timestamp(),
                correlation_id=message.correlation_id,
            )
            
        except Exception as e:
            logger.error(f"Extraction error for {source_url}: {e}")
            self.extractions_failed += 1
            return None
    
    def get_stats(self) -> Dict[str, Any]:
        """Get extraction-specific statistics."""
        stats = super().get_stats()
        stats.update({
            "extractions_attempted": self.extractions_attempted,
            "extractions_successful": self.extractions_successful,
            "extractions_failed": self.extractions_failed,
            "success_rate": self.extractions_successful / max(1, self.extractions_attempted),
        })
        return stats
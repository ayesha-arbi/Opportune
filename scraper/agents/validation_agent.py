"""
Validation Agent - validates extracted opportunities.
"""
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from scraper.agents.base import Agent, AgentMessage, MessageType
from scraper.schema import OpportunityExtracted

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scraper.agents.validation")

class ValidationAgent(Agent):
    """Validates opportunity data against schema and business rules."""
    
    def __init__(self):
        super().__init__("validation_agent", max_retries=1)  # Less retries for validation
        self.validation_passed = 0
        self.validation_failed = 0
    
    def can_handle(self, message: AgentMessage) -> bool:
        return message.message_type == MessageType.VALIDATE
    
    async def process(self, message: AgentMessage) -> Optional[AgentMessage]:
        """Validate an opportunity and pass it to deduplication if valid."""
        opportunity_data = message.payload.get("opportunity")
        
        if not opportunity_data:
            logger.warning("No opportunity data in validation message")
            return None
        
        try:
            # Validate using Pydantic schema
            opportunity = OpportunityExtracted(**opportunity_data)
            
            # Additional business validation
            if not self._is_valid_deadline(opportunity):
                logger.info(f"Validation failed: expired deadline for {opportunity.title}")
                self.validation_failed += 1
                return None
            
            if not self._has_required_fields(opportunity):
                logger.info(f"Validation failed: missing required fields for {opportunity.title}")
                self.validation_failed += 1
                return None
            
            logger.info(f"Validation passed: {opportunity.title}")
            self.validation_passed += 1
            
            # Pass to deduplication agent
            return AgentMessage(
                message_type=MessageType.DEDUPLICATE,
                sender=self.name,
                recipient="deduplication_agent",
                payload={"opportunity": opportunity.model_dump()},
                timestamp=datetime.now().timestamp(),
                correlation_id=message.correlation_id,
            )
            
        except Exception as e:
            logger.error(f"Validation error: {e}")
            self.validation_failed += 1
            return None
    
    def _is_valid_deadline(self, opportunity: OpportunityExtracted) -> bool:
        """Check if deadline is not in the past."""
        if not opportunity.deadline:
            return True  # No deadline is acceptable
        
        try:
            if opportunity.deadline.endswith('Z'):
                deadline_dt = datetime.fromisoformat(opportunity.deadline[:-1])
            else:
                deadline_dt = datetime.fromisoformat(opportunity.deadline)
            
            # 1 day buffer for timezone issues
            now = datetime.now(datetime.timezone.utc)
            buffer = timedelta(days=1)
            
            return deadline_dt >= (now - buffer)
        except (ValueError, TypeError):
            return True  # If we can't parse, let it through
    
    def _has_required_fields(self, opportunity: OpportunityExtracted) -> bool:
        """Check if opportunity has required fields."""
        if not opportunity.title or not opportunity.source_url:
            return False
        
        if opportunity.type == "other" and not opportunity.deadline:
            return False
        
        return True
    
    def get_stats(self) -> Dict[str, Any]:
        """Get validation-specific statistics."""
        stats = super().get_stats()
        stats.update({
            "validation_passed": self.validation_passed,
            "validation_failed": self.validation_failed,
            "success_rate": self.validation_passed / max(1, self.validation_passed + self.validation_failed),
        })
        return stats
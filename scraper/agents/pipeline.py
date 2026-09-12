"""
Pipeline orchestrator - coordinates the multi-agent scraping pipeline.
"""
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any
from scraper.agents.base import AgentCoordinator, AgentMessage, MessageType
from scraper.agents.discovery_agent import DiscoveryAgent
from scraper.agents.extraction_agent import ExtractionAgent
from scraper.agents.validation_agent import ValidationAgent
from scraper.agents.deduplication_agent import DeduplicationAgent
from scraper.agents.monitoring import PipelineVisualizer, AlertManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scraper.pipeline")

class ScrapingPipeline:
    """Orchestrates the multi-agent scraping pipeline."""
    
    def __init__(self):
        self.coordinator = AgentCoordinator()
        self.visualizer = PipelineVisualizer()
        self.alert_manager = AlertManager()
        self._register_agents()
        self._print_agent_flow()
    
    def _register_agents(self):
        """Register all agents with the coordinator."""
        agents = [
            DiscoveryAgent(),
            ExtractionAgent(),
            ValidationAgent(),
            DeduplicationAgent(),
        ]
        
        for agent in agents:
            self.coordinator.register_agent(agent)
    
    def _print_agent_flow(self):
        """Print the agent flow diagram."""
        agent_sequence = ["Discovery Agent", "Extraction Agent", "Validation Agent", "Deduplication Agent"]
        self.visualizer.print_agent_flow(agent_sequence)
    
    async def run_discovery(self, source_name: str = "all", fetch_budget: int = 50) -> Dict[str, Any]:
        """Run the discovery pipeline."""
        logger.info("Starting multi-agent discovery pipeline...")
        
        # Send initial discovery message
        initial_message = AgentMessage(
            message_type=MessageType.DISCOVER,
            sender="coordinator",
            recipient="discovery_agent",
            payload={
                "source_name": source_name,
                "fetch_budget": fetch_budget,
            },
            timestamp=datetime.now().timestamp(),
            correlation_id=f"discovery_{datetime.now().isoformat()}",
        )
        
        try:
            # Send discovery message
            self.coordinator.send_message(initial_message)
            
            # Process messages until queue is empty
            while self.coordinator.message_broker or any(agent.message_queue for agent in self.coordinator.agents.values()):
                self.coordinator.deliver_messages()
                
                # Run agents with messages
                for agent in self.coordinator.agents.values():
                    if agent.message_queue:
                        message = agent.receive_message()
                        if message and agent.can_handle(message):
                            response = await agent.process_with_retry(message)
                            
                            # Handle response messages
                            if response:
                                # If discovery agent returned opportunities, distribute to validation
                                if response.message_type == MessageType.COMPLETE and "opportunities" in response.payload:
                                    opportunities = response.payload["opportunities"]
                                    logger.info(f"Distributing {len(opportunities)} opportunities to validation agent")
                                    
                                    for opp in opportunities:
                                        validation_msg = AgentMessage(
                                            message_type=MessageType.VALIDATE,
                                            sender="coordinator",
                                            recipient="validation_agent",
                                            payload={"opportunity": opp},
                                            timestamp=datetime.now().timestamp(),
                                            correlation_id=message.correlation_id,
                                        )
                                        self.coordinator.send_message(validation_msg)
                                else:
                                    self.coordinator.send_message(response)
                            
                            agent.processed_count += 1
            
            # Get statistics
            stats = self.coordinator.get_all_stats()
            
            # Check for alerts
            alerts = self.alert_manager.check_alerts(stats)
            self.alert_manager.print_alerts()
            
            # Print visualizations
            self.visualizer.print_pipeline_summary(stats)
            self.visualizer.print_pipeline_stats(stats)
            
            logger.info("Pipeline completed successfully")
            
            return {
                "success": True,
                "stats": stats,
                "alerts": alerts,
            }
            
        except Exception as e:
            logger.error(f"Pipeline failed: {e}")
            stats = self.coordinator.get_all_stats()
            
            # Still check for alerts even on failure
            alerts = self.alert_manager.check_alerts(stats)
            self.alert_manager.print_alerts()
            
            return {
                "success": False,
                "error": str(e),
                "stats": stats,
                "alerts": alerts,
            }
    
    def get_pipeline_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics from all agents."""
        return self.coordinator.get_all_stats()

async def main():
    """Main entry point for the multi-agent pipeline."""
    pipeline = ScrapingPipeline()
    
    # Run the pipeline
    result = await pipeline.run_discovery()
    
    if result["success"]:
        print("Pipeline completed successfully!")
        print("Statistics:")
        for agent_name, stats in result["stats"].items():
            print(f"  {agent_name}: {stats}")
    else:
        print(f"Pipeline failed: {result['error']}")

if __name__ == "__main__":
    asyncio.run(main())
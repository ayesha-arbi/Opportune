"""
Multi-agent pipeline architecture for opportunity discovery.
Each agent has a specific responsibility and communicates via messages.
"""
import logging
import asyncio
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scraper.agents")

class MessageType(Enum):
    """Types of messages between agents."""
    DISCOVER = "discover"
    EXTRACT = "extract"
    VALIDATE = "validate"
    DEDUPLICATE = "deduplicate"
    NOTIFICATION = "notification"
    ERROR = "error"
    COMPLETE = "complete"

@dataclass
class AgentMessage:
    """Message passed between agents."""
    message_type: MessageType
    sender: str
    recipient: str
    payload: Dict[str, Any]
    timestamp: float
    correlation_id: Optional[str] = None

class Agent(ABC):
    """Base class for all agents in the pipeline."""
    
    def __init__(self, name: str, max_retries: int = 3):
        self.name = name
        self.message_queue: list[AgentMessage] = []
        self.processed_count = 0
        self.error_count = 0
        self.retry_count = 0
        self.max_retries = max_retries
    
    @abstractmethod
    async def process(self, message: AgentMessage) -> Optional[AgentMessage]:
        """
        Process a message and optionally return a response message.
        Must be implemented by each agent.
        """
        pass
    
    @abstractmethod
    def can_handle(self, message: AgentMessage) -> bool:
        """
        Check if this agent can handle the given message type.
        """
        pass
    
    async def process_with_retry(self, message: AgentMessage) -> Optional[AgentMessage]:
        """Process a message with retry logic and exponential backoff."""
        last_error = None
        
        for attempt in range(self.max_retries + 1):
            try:
                return await self.process(message)
            except Exception as e:
                last_error = e
                if attempt < self.max_retries:
                    self.retry_count += 1
                    backoff_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                    logger.warning(f"[{self.name}] Attempt {attempt + 1} failed, retrying in {backoff_time}s: {e}")
                    await asyncio.sleep(backoff_time)
                else:
                    logger.error(f"[{self.name}] All {self.max_retries + 1} attempts failed: {e}")
                    self.error_count += 1
                    return None
    
    def send_message(self, message: AgentMessage) -> None:
        """Send a message to another agent (adds to queue)."""
        self.message_queue.append(message)
        logger.debug(f"[{self.name}] Queued message from {message.sender}: {message.message_type.value}")
    
    def receive_message(self) -> Optional[AgentMessage]:
        """Receive the next message from the queue."""
        if self.message_queue:
            return self.message_queue.pop(0)
        return None
    
    async def run(self) -> None:
        """Main run loop for the agent."""
        logger.info(f"[{self.name}] Agent starting...")
        
        while True:
            message = self.receive_message()
            if message is None:
                break
            
            try:
                if self.can_handle(message):
                    response = await self.process_with_retry(message)
                    if response:
                        # In a real implementation, this would send to a message broker
                        logger.info(f"[{self.name}] Sending response to {response.recipient}")
                    self.processed_count += 1
                else:
                    logger.warning(f"[{self.name}] Cannot handle message type: {message.message_type.value}")
            except Exception as e:
                self.error_count += 1
                logger.error(f"[{self.name}] Error processing message: {e}")
        
        logger.info(f"[{self.name}] Agent finished. Processed: {self.processed_count}, Errors: {self.error_count}, Retries: {self.retry_count}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get agent statistics."""
        return {
            "name": self.name,
            "processed_count": self.processed_count,
            "error_count": self.error_count,
            "retry_count": self.retry_count,
            "queue_length": len(self.message_queue),
        }

class AgentCoordinator:
    """Coordinates communication between agents."""
    
    def __init__(self):
        self.agents: Dict[str, Agent] = {}
        self.message_broker: list[AgentMessage] = []
    
    def register_agent(self, agent: Agent) -> None:
        """Register an agent with the coordinator."""
        self.agents[agent.name] = agent
        logger.info(f"Registered agent: {agent.name}")
    
    def send_message(self, message: AgentMessage) -> None:
        """Send a message through the message broker."""
        self.message_broker.append(message)
        logger.debug(f"Message sent from {message.sender} to {message.recipient}: {message.message_type.value}")
    
    def deliver_messages(self) -> None:
        """Deliver queued messages to their recipients."""
        for message in self.message_broker[:]:
            recipient = self.agents.get(message.recipient)
            if recipient:
                recipient.send_message(message)
                self.message_broker.remove(message)
            else:
                logger.warning(f"Recipient not found: {message.recipient}")
    
    async def run_pipeline(self, initial_message: AgentMessage) -> None:
        """Run the pipeline with an initial message."""
        logger.info("Starting pipeline execution...")
        
        # Send initial message
        self.send_message(initial_message)
        
        # Deliver and process messages
        while self.message_broker or any(agent.message_queue for agent in self.agents.values()):
            self.deliver_messages()
            
            # Run all agents
            for agent in self.agents.values():
                if agent.message_queue:
                    await agent.run()
        
        logger.info("Pipeline execution complete")
    
    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics from all agents."""
        return {name: agent.get_stats() for name, agent in self.agents.items()}
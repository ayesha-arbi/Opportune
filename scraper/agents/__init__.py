"""
Multi-agent package for opportunity discovery.
"""
from scraper.agents.base import Agent, AgentMessage, MessageType, AgentCoordinator
from scraper.agents.discovery_agent import DiscoveryAgent
from scraper.agents.extraction_agent import ExtractionAgent
from scraper.agents.validation_agent import ValidationAgent
from scraper.agents.deduplication_agent import DeduplicationAgent
from scraper.agents.pipeline import ScrapingPipeline
from scraper.agents.monitoring import PipelineVisualizer, AlertManager

__all__ = [
    "Agent",
    "AgentMessage",
    "MessageType",
    "AgentCoordinator",
    "DiscoveryAgent",
    "ExtractionAgent",
    "ValidationAgent",
    "DeduplicationAgent",
    "ScrapingPipeline",
    "PipelineVisualizer",
    "AlertManager",
]
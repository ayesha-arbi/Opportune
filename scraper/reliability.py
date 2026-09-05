"""
Source reliability scoring system.
Tracks which sources provide the best data and quality opportunities.
"""
import logging
from typing import Dict, Any, List
from datetime import datetime, timedelta
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scraper.reliability")

class SourceReliability(Enum):
    """Reliability categories for sources."""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    UNKNOWN = "unknown"

class SourceMetrics:
    """Metrics for tracking source reliability."""
    
    def __init__(self, source_name: str):
        self.source_name = source_name
        self.total_fetched = 0
        self.successful_extractions = 0
        self.failed_extractions = 0
        self.expired_opportunities = 0
        self.duplicates = 0
        self.last_fetch_time = None
        self.fetch_errors = 0
        self.avg_response_time = 0.0
        self.response_times = []
    
    def record_fetch(self, success: bool, response_time: float = 0.0):
        """Record a fetch attempt."""
        self.total_fetched += 1
        self.last_fetch_time = datetime.now()
        
        if success:
            self.response_times.append(response_time)
            if len(self.response_times) > 10:
                self.response_times.pop(0)
            self.avg_response_time = sum(self.response_times) / len(self.response_times)
        else:
            self.fetch_errors += 1
    
    def record_extraction(self, success: bool, is_expired: bool = False, is_duplicate: bool = False):
        """Record an extraction attempt."""
        if success:
            self.successful_extractions += 1
            if is_expired:
                self.expired_opportunities += 1
            if is_duplicate:
                self.duplicates += 1
        else:
            self.failed_extractions += 1
    
    def get_success_rate(self) -> float:
        """Calculate extraction success rate."""
        if self.total_fetched == 0:
            return 0.0
        return self.successful_extractions / self.total_fetched
    
    def get_freshness_rate(self) -> float:
        """Calculate rate of non-expired opportunities."""
        if self.successful_extractions == 0:
            return 0.0
        fresh = self.successful_extractions - self.expired_opportunities
        return fresh / self.successful_extractions
    
    def get_reliability_score(self) -> float:
        """
        Calculate overall reliability score (0-100).
        Based on success rate, freshness, and error rate.
        """
        if self.total_fetched == 0:
            return 50.0  # Neutral score for unknown sources
        
        success_rate = self.get_success_rate()
        freshness_rate = self.get_freshness_rate()
        error_rate = self.fetch_errors / self.total_fetched
        
        # Weighted score
        score = (success_rate * 0.5) + (freshness_rate * 0.3) + ((1 - error_rate) * 0.2)
        return round(score * 100, 1)
    
    def get_reliability_category(self) -> SourceReliability:
        """Get reliability category based on score."""
        score = self.get_reliability_score()
        
        if score >= 80:
            return SourceReliability.EXCELLENT
        elif score >= 60:
            return SourceReliability.GOOD
        elif score >= 40:
            return SourceReliability.FAIR
        elif score >= 20:
            return SourceReliability.POOR
        else:
            return SourceReliability.UNKNOWN
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage/display."""
        return {
            "source_name": self.source_name,
            "total_fetched": self.total_fetched,
            "successful_extractions": self.successful_extractions,
            "failed_extractions": self.failed_extractions,
            "expired_opportunities": self.expired_opportunities,
            "duplicates": self.duplicates,
            "fetch_errors": self.fetch_errors,
            "avg_response_time": round(self.avg_response_time, 2),
            "success_rate": round(self.get_success_rate() * 100, 1),
            "freshness_rate": round(self.get_freshness_rate() * 100, 1),
            "reliability_score": self.get_reliability_score(),
            "reliability_category": self.get_reliability_category().value,
            "last_fetch_time": self.last_fetch_time.isoformat() if self.last_fetch_time else None,
        }

# Global metrics storage
SOURCE_METRICS: Dict[str, SourceMetrics] = {}

def get_source_metrics(source_name: str) -> SourceMetrics:
    """Get or create metrics for a source."""
    if source_name not in SOURCE_METRICS:
        SOURCE_METRICS[source_name] = SourceMetrics(source_name)
    return SOURCE_METRICS[source_name]

def record_source_fetch(source_name: str, success: bool, response_time: float = 0.0):
    """Record a fetch attempt for a source."""
    metrics = get_source_metrics(source_name)
    metrics.record_fetch(success, response_time)
    logger.debug(f"Recorded fetch for {source_name}: success={success}, time={response_time}s")

def record_source_extraction(source_name: str, success: bool, is_expired: bool = False, is_duplicate: bool = False):
    """Record an extraction attempt for a source."""
    metrics = get_source_metrics(source_name)
    metrics.record_extraction(success, is_expired, is_duplicate)
    logger.debug(f"Recorded extraction for {source_name}: success={success}, expired={is_expired}, duplicate={is_duplicate}")

def get_all_source_metrics() -> List[Dict[str, Any]]:
    """Get metrics for all sources."""
    return [metrics.to_dict() for metrics in SOURCE_METRICS.values()]

def get_reliable_sources(min_score: float = 60.0) -> List[str]:
    """Get list of sources meeting minimum reliability score."""
    reliable = []
    for source_name, metrics in SOURCE_METRICS.items():
        if metrics.get_reliability_score() >= min_score:
            reliable.append(source_name)
    return reliable

def get_source_ranking() -> List[tuple[str, float]]:
    """Get sources ranked by reliability score."""
    rankings = [(name, metrics.get_reliability_score()) for name, metrics in SOURCE_METRICS.items()]
    return sorted(rankings, key=lambda x: x[1], reverse=True)

def should_prioritize_source(source_name: str) -> bool:
    """Determine if a source should be prioritized based on reliability."""
    metrics = get_source_metrics(source_name)
    category = metrics.get_reliability_category()
    
    # Prioritize excellent and good sources
    return category in [SourceReliability.EXCELLENT, SourceReliability.GOOD]

def print_source_report():
    """Print a report of all source metrics."""
    print("\n" + "="*60)
    print("SOURCE RELIABILITY REPORT")
    print("="*60)
    
    rankings = get_source_ranking()
    
    for i, (source_name, score) in enumerate(rankings, 1):
        metrics = SOURCE_METRICS[source_name]
        category = metrics.get_reliability_category().value.upper()
        
        print(f"\n{i}. {source_name}")
        print(f"   Score: {score}/100 ({category})")
        print(f"   Total Fetched: {metrics.total_fetched}")
        print(f"   Success Rate: {metrics.get_success_rate()*100:.1f}%")
        print(f"   Freshness Rate: {metrics.get_freshness_rate()*100:.1f}%")
        print(f"   Avg Response Time: {metrics.avg_response_time:.2f}s")
        print(f"   Expired: {metrics.expired_opportunities}")
        print(f"   Duplicates: {metrics.duplicates}")
        print(f"   Errors: {metrics.fetch_errors}")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    # Test the reliability scoring system
    print("Testing source reliability scoring...")
    
    # Simulate some activity
    record_source_fetch("Devpost", True, 1.2)
    record_source_extraction("Devpost", True, False, False)
    record_source_fetch("Devpost", True, 0.8)
    record_source_extraction("Devpost", True, False, True)
    
    record_source_fetch("MLH", True, 2.1)
    record_source_extraction("MLH", True, False, False)
    record_source_fetch("MLH", False, 0.0)
    
    record_source_fetch("Unknown Source", True, 5.0)
    record_source_extraction("Unknown Source", False, False, False)
    
    print_source_report()
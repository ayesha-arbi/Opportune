"""
Pipeline visualization and monitoring utilities.
"""
import logging
from typing import Dict, Any
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scraper.monitoring")

class PipelineVisualizer:
    """Visualizes pipeline execution and agent statistics."""
    
    @staticmethod
    def print_pipeline_stats(stats: Dict[str, Dict[str, Any]]) -> None:
        """Print formatted pipeline statistics."""
        print("\n" + "=" * 70)
        print("                    MULTI-AGENT PIPELINE STATS                  ")
        print("=" * 70)
        
        for agent_name, agent_stats in stats.items():
            print(f"\n{'─' * 70}")
            print(f"  {agent_name.upper()}")
            print(f"{'─' * 70}")
            
            for key, value in agent_stats.items():
                # Format key for display
                display_key = key.replace('_', ' ').title()
                
                # Format value based on type
                if isinstance(value, float):
                    print(f"  {display_key:<25}: {value:.2%}" if 'rate' in key or 'ratio' in key else f"  {display_key:<25}: {value:.2f}")
                elif isinstance(value, int):
                    print(f"  {display_key:<25}: {value}")
                else:
                    print(f"  {display_key:<25}: {value}")
        
        print(f"\n{'=' * 70}\n")
    
    @staticmethod
    def print_pipeline_summary(stats: Dict[str, Dict[str, Any]]) -> None:
        """Print a high-level summary of pipeline performance."""
        total_processed = sum(agent.get("processed_count", 0) for agent in stats.values())
        total_errors = sum(agent.get("error_count", 0) for agent in stats.values())
        total_retries = sum(agent.get("retry_count", 0) for agent in stats.values())
        
        success_rate = (total_processed - total_errors) / max(1, total_processed)
        
        print("\n" + "=" * 70)
        print("                    PIPELINE EXECUTION SUMMARY                  ")
        print("=" * 70)
        print(f"  Total Messages Processed:    {total_processed}")
        print(f"  Total Errors:                 {total_errors}")
        print(f"  Total Retries:                {total_retries}")
        print(f"  Overall Success Rate:          {success_rate:.2%}")
        print(f"  Timestamp:                    {datetime.now().isoformat()}")
        print("=" * 70 + "\n")
    
    @staticmethod
    def print_agent_flow(agent_sequence: list[str]) -> None:
        """Print the flow of agents in the pipeline."""
        print("\n" + "=" * 70)
        print("                      AGENT FLOW DIAGRAM                     ")
        print("=" * 70)
        
        for i, agent in enumerate(agent_sequence):
            if i == 0:
                print(f"  [{agent}]")
            elif i == len(agent_sequence) - 1:
                print(f"       ↓")
                print(f"  [{agent}]")
            else:
                print(f"       ↓")
                print(f"  [{agent}]")
        
        print("=" * 70 + "\n")

class AlertManager:
    """Manages alerts for pipeline issues."""
    
    def __init__(self):
        self.alerts: list[Dict[str, Any]] = []
        self.alert_thresholds = {
            "error_rate": 0.1,  # Alert if error rate > 10%
            "retry_rate": 0.2,  # Alert if retry rate > 20%
            "queue_backlog": 10,  # Alert if queue backlog > 10
        }
    
    def check_alerts(self, stats: Dict[str, Dict[str, Any]]) -> list[Dict[str, Any]]:
        """Check statistics against thresholds and generate alerts."""
        self.alerts.clear()
        
        for agent_name, agent_stats in stats.items():
            processed = agent_stats.get("processed_count", 0)
            errors = agent_stats.get("error_count", 0)
            retries = agent_stats.get("retry_count", 0)
            queue_length = agent_stats.get("queue_length", 0)
            
            if processed > 0:
                error_rate = errors / processed
                retry_rate = retries / processed
                
                if error_rate > self.alert_thresholds["error_rate"]:
                    self.alerts.append({
                        "level": "HIGH",
                        "agent": agent_name,
                        "type": "high_error_rate",
                        "message": f"{agent_name} has error rate of {error_rate:.2%} (threshold: {self.alert_thresholds['error_rate']:.0%})",
                        "timestamp": datetime.now().isoformat(),
                    })
                
                if retry_rate > self.alert_thresholds["retry_rate"]:
                    self.alerts.append({
                        "level": "MEDIUM",
                        "agent": agent_name,
                        "type": "high_retry_rate",
                        "message": f"{agent_name} has retry rate of {retry_rate:.2%} (threshold: {self.alert_thresholds['retry_rate']:.0%})",
                        "timestamp": datetime.now().isoformat(),
                    })
            
            if queue_length > self.alert_thresholds["queue_backlog"]:
                self.alerts.append({
                    "level": "MEDIUM",
                    "agent": agent_name,
                    "type": "queue_backlog",
                    "message": f"{agent_name} has queue backlog of {queue_length} (threshold: {self.alert_thresholds['queue_backlog']})",
                    "timestamp": datetime.now().isoformat(),
                })
        
        return self.alerts
    
    def print_alerts(self) -> None:
        """Print all active alerts."""
        if not self.alerts:
            print("\n✓ No alerts - pipeline running normally")
            return
        
        print("\n" + "=" * 70)
        print("                      PIPELINE ALERTS                          ")
        print("=" * 70)
        
        for alert in self.alerts:
            level_icon = "🔴" if alert["level"] == "HIGH" else "🟡"
            print(f"\n  {level_icon} [{alert['level']}] {alert['agent']}")
            print(f"  Type: {alert['type']}")
            print(f"  Message: {alert['message']}")
            print(f"  Time: {alert['timestamp']}")
        
        print("=" * 70 + "\n")
    
    def has_critical_alerts(self) -> bool:
        """Check if there are any high-priority alerts."""
        return any(alert["level"] == "HIGH" for alert in self.alerts)
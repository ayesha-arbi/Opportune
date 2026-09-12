import sys
import os
import logging
import asyncio
from typing import Dict, Any, List
from scraper.sources.devpost import scrape_devpost
from scraper.sources.mlh import scrape_mlh
from scraper.sources.wordpress import scrape_wordpress_source
from scraper.config import SOURCES
from scraper.db import upsert_opportunity, deactivate_expired_opportunities
from scraper.agentic_crawler import main as run_agentic_crawler

# Import multi-agent pipeline
try:
    from scraper.agents.pipeline import ScrapingPipeline
    AGENTS_AVAILABLE = True
except ImportError:
    AGENTS_AVAILABLE = False
    logging.warning("Multi-agent pipeline not available, using legacy pipeline")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("scraper.main")

def main():
    logger.info("=== Starting Opportune Scraper Pipeline ===")

    # Check which pipeline to use
    use_agents = os.environ.get("USE_MULTI_AGENT_PIPELINE", "false").lower() == "true"
    run_agentic = os.environ.get("RUN_AGENTIC_CRAWLER", "false").lower() == "true"

    if use_agents and AGENTS_AVAILABLE:
        logger.info("Using multi-agent pipeline")
        return asyncio.run(run_agent_pipeline())
    else:
        logger.info("Using legacy pipeline")
        return run_legacy_pipeline(run_agentic)

async def run_agent_pipeline():
    """Run the multi-agent pipeline."""
    pipeline = ScrapingPipeline()
    result = await pipeline.run_discovery()
    
    if result["success"]:
        logger.info("Multi-agent pipeline completed successfully")
        stats = result["stats"]
        
        # Print agent statistics
        print("\n" + "=" * 60)
        print("              MULTI-AGENT PIPELINE STATS              ")
        print("=" * 60)
        for agent_name, agent_stats in stats.items():
            print(f"\n{agent_name}:")
            for key, value in agent_stats.items():
                print(f"  {key}: {value}")
        print("=" * 60 + "\n")
        
        sys.exit(0)
    else:
        logger.error(f"Multi-agent pipeline failed: {result['error']}")
        sys.exit(1)

def run_legacy_pipeline(run_agentic):
    """Run the legacy scraping pipeline."""
    # WordPress-based aggregators (config-driven)
    corners_config = SOURCES["opportunities_corners"]
    circle_config = SOURCES["opportunities_circle"]
    scholarships_config = SOURCES["scholarships_positions"]
    youth_config = SOURCES["youth_opportunities"]
    fully_funded_config = SOURCES["fully_funded_scholarships"]

    def scrape_corners(limit=None):
        return scrape_wordpress_source(corners_config, limit=limit)

    def scrape_circle(limit=None):
        return scrape_wordpress_source(circle_config, limit=limit)

    def scrape_scholarships(limit=None):
        return scrape_wordpress_source(scholarships_config, limit=limit)

    def scrape_youth(limit=None):
        return scrape_wordpress_source(youth_config, limit=limit)

    def scrape_fully_funded(limit=None):
        return scrape_wordpress_source(fully_funded_config, limit=limit)

    sources = [
        {"name": "Devpost", "fn": scrape_devpost},
        {"name": "Major League Hacking", "fn": scrape_mlh},
        {"name": corners_config.display_name, "fn": scrape_corners},
        {"name": circle_config.display_name, "fn": scrape_circle},
        {"name": scholarships_config.display_name, "fn": scrape_scholarships},
        {"name": youth_config.display_name, "fn": scrape_youth},
        {"name": fully_funded_config.display_name, "fn": scrape_fully_funded},
    ]

    # Add agentic crawler if enabled
    if run_agentic:
        def run_agentic_wrapper(limit=None):
            opportunities = run_agentic_crawler()
            # Convert dict returns to OpportunityExtracted objects
            from scraper.schema import OpportunityExtracted
            return [OpportunityExtracted(**opp) for opp in opportunities]
        
        sources.append({"name": "Agentic Crawler", "fn": run_agentic_wrapper})

    summary: List[Dict[str, Any]] = []
    any_failures = False

    for source in sources:
        name = source["name"]
        logger.info(f"--- Running Scraper Source: {name} ---")
        try:
            items = source["fn"](limit=5)
            extracted_count = len(items)
            upserted_count = 0

            for item in items:
                success = upsert_opportunity(item.model_dump())
                if success:
                    upserted_count += 1

            status = "SUCCESS" if extracted_count > 0 else "NO_ITEMS"
            summary.append({
                "source": name,
                "extracted": extracted_count,
                "upserted": upserted_count,
                "status": status,
            })
            logger.info(f"Source {name} finished: Extracted {extracted_count}, Upserted {upserted_count}")

        except Exception as e:
            logger.error(f"Source {name} failed with error: {e}", exc_info=True)
            summary.append({
                "source": name,
                "extracted": 0,
                "upserted": 0,
                "status": f"FAILED: {e}",
            })
            any_failures = True

    # Run stale cleanup
    logger.info("--- Cleaning up expired opportunities ---")
    deactivated_count = deactivate_expired_opportunities()

    # Print Summary Table
    print("\n" + "=" * 60)
    print("                SCRAPER EXECUTION SUMMARY                ")
    print("=" * 60)
    print(f"{'Source':<25} | {'Extracted':<10} | {'Upserted':<10} | {'Status'}")
    print("-" * 60)
    for row in summary:
        print(f"{row['source']:<25} | {row['extracted']:<10} | {row['upserted']:<10} | {row['status']}")
    print("-" * 60)
    print(f"Expired opportunities deactivated: {deactivated_count}")
    print("=" * 60 + "\n")

    if any_failures:
        logger.error("One or more sources failed during execution.")
        sys.exit(1)
    else:
        logger.info("All scraper sources completed successfully.")
        sys.exit(0)

if __name__ == "__main__":
    main()
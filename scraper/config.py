"""
Source configuration for opportunity aggregators.
Adding new sources should only require adding a config entry here.
"""
from typing import Literal, List, Optional
from pydantic import BaseModel

class SourceConfig(BaseModel):
    """Configuration for a single opportunity source."""
    name: str  # Internal name (e.g., 'opportunities_corners')
    display_name: str  # Human-readable name (e.g., 'Opportunities Corners')
    base_url: str
    discovery_method: Literal['wp_rest_api', 'rss_feed', 'html_scrape']
    discovery_endpoint: Optional[str] = None  # e.g., '/wp-json/wp/v2/posts' or '/feed/'
    
    # Category filtering for sites that mix advice content with opportunities
    included_categories: Optional[List[str]] = None  # Only include these categories
    excluded_categories: Optional[List[str]] = None  # Exclude these categories
    
    # Maximum number of items to fetch per run
    limit: int = 10
    
    # Site-specific extraction hints
    check_title_for_deadline: bool = True  # Many aggregators put deadline info in titles
    default_remote: bool = False  # Don't assume remote for location-specific programs

# WordPress-based opportunity aggregators
OPPORTUNITIES_CORNERS = SourceConfig(
    name="opportunities_corners",
    display_name="Opportunities Corners",
    base_url="https://opportunitiescorners.com",
    discovery_method="wp_rest_api",
    discovery_endpoint="/wp-json/wp/v2/posts",
    excluded_categories=[
        "Scholarship Guidelines", 
        "Visa Guide", 
        "Blog",
        "How to",
        "Tips",
        "Guides"
    ],
    limit=10,
    check_title_for_deadline=True,
    default_remote=False,
)

OPPORTUNITIES_CIRCLE = SourceConfig(
    name="opportunities_circle", 
    display_name="Opportunities Circle",
    base_url="https://www.opportunitiescircle.com",
    discovery_method="wp_rest_api",
    discovery_endpoint="/wp-json/wp/v2/posts",
    excluded_categories=[
        "Blog",
        "Tips",
        "Guides", 
        "How to",
        "Study Abroad Tips"
    ],
    limit=10,
    check_title_for_deadline=True,
    default_remote=False,
)

# Additional opportunity aggregators
SCHOLARSHIPS_POSITIONS = SourceConfig(
    name="scholarships_positions",
    display_name="Scholarships Positions",
    base_url="https://www.scholarships-positions.com",
    discovery_method="wp_rest_api",
    discovery_endpoint="/wp-json/wp/v2/posts",
    excluded_categories=[
        "Blog",
        "Tips",
        "Guides",
        "News",
        "Articles"
    ],
    limit=10,
    check_title_for_deadline=True,
    default_remote=False,
)

YOUTHOPPORTUNITIES = SourceConfig(
    name="youth_opportunities",
    display_name="Youth Opportunities",
    base_url="https://www.youthopportunities.org",
    discovery_method="wp_rest_api",
    discovery_endpoint="/wp-json/wp/v2/posts",
    excluded_categories=[
        "Blog",
        "Tips",
        "Guides",
        "News"
    ],
    limit=10,
    check_title_for_deadline=True,
    default_remote=False,
)

FULLYFUNDEDSCHOLARSHIPS = SourceConfig(
    name="fully_funded_scholarships",
    display_name="Fully Funded Scholarships",
    base_url="https://www.fullyfundedscholarships.com",
    discovery_method="wp_rest_api",
    discovery_endpoint="/wp-json/wp/v2/posts",
    excluded_categories=[
        "Blog",
        "Tips",
        "Guides",
        "News"
    ],
    limit=10,
    check_title_for_deadline=True,
    default_remote=False,
)

# All available source configs
SOURCES: dict[str, SourceConfig] = {
    "opportunities_corners": OPPORTUNITIES_CORNERS,
    "opportunities_circle": OPPORTUNITIES_CIRCLE,
    "scholarships_positions": SCHOLARSHIPS_POSITIONS,
    "youth_opportunities": YOUTHOPPORTUNITIES,
    "fully_funded_scholarships": FULLYFUNDEDSCHOLARSHIPS,
}

def get_source_config(name: str) -> SourceConfig:
    """Get a source config by name."""
    if name not in SOURCES:
        raise ValueError(f"Unknown source: {name}. Available sources: {list(SOURCES.keys())}")
    return SOURCES[name]

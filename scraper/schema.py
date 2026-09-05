import datetime
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field, field_validator, model_validator

OpportunityType = Literal[
    "hackathon", "fellowship", "competition", "research", "grant", "other"
]

class OpportunityExtracted(BaseModel):
    title: str = Field(..., description="Title of the opportunity")
    description: Optional[str] = Field(None, description="Detailed description")
    type: OpportunityType = Field("hackathon", description="Category of opportunity")
    field_tags: List[str] = Field(default_factory=list, description="Tags like 'ai', 'web3', 'biology'")
    eligibility: Optional[Dict[str, Any]] = Field(None, description="Eligibility info e.g. {'edu_level': ['undergraduate']}")
    organizer: Optional[str] = Field(None, description="Organization hosting the opportunity")
    location: Optional[str] = Field(None, description="Physical location or city/country")
    is_remote: Optional[bool] = Field(False, description="Whether event is online/remote")
    deadline: Optional[str] = Field(None, description="ISO datetime deadline e.g. 2026-10-15T23:59:59Z")
    start_date: Optional[str] = Field(None, description="ISO datetime start date")
    end_date: Optional[str] = Field(None, description="ISO datetime end date")
    prize_info: Optional[str] = Field(None, description="Prizes or funding amount info")
    source_url: str = Field(..., description="Primary web page URL")
    source_name: Optional[str] = Field(None, description="Platform name e.g. 'Devpost', 'MLH'")
    application_url: Optional[str] = Field(None, description="Direct application link")

    @field_validator("deadline", "start_date", "end_date", mode="before")
    @classmethod
    def validate_date(cls, v: Any) -> Optional[str]:
        if not v or not isinstance(v, str):
            return None
        v_clean = v.strip()
        if not v_clean or v_clean.lower() in ("null", "none", "n/a", "tbd", "unknown"):
            return None
        # Verify it can be parsed or normalized
        try:
            # Handle standard ISO formats
            if v_clean.endswith("Z"):
                datetime.datetime.fromisoformat(v_clean[:-1])
            else:
                datetime.datetime.fromisoformat(v_clean)
            return v_clean
        except ValueError:
            # If not strict ISO, return None to prevent corrupting DB with bad date strings
            return None

    @model_validator(mode="after")
    def validate_deadline_not_expired(self) -> "OpportunityExtracted":
        """Reject opportunities with deadlines in the past."""
        if self.deadline:
            try:
                # Parse the deadline
                if self.deadline.endswith("Z"):
                    deadline_dt = datetime.datetime.fromisoformat(self.deadline[:-1])
                else:
                    deadline_dt = datetime.datetime.fromisoformat(self.deadline)
                
                # Check if deadline is in the past (with some buffer for timezone issues)
                now = datetime.datetime.now(datetime.timezone.utc)
                buffer = datetime.timedelta(days=1)  # 1 day buffer
                
                if deadline_dt < (now - buffer):
                    # Deadline is too far in the past, reject this opportunity
                    raise ValueError("Deadline is in the past")
            except (ValueError, TypeError):
                # If we can't parse the date, we'll let it through as null
                pass
        return self

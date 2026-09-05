"""
Deduplication utilities for opportunity matching.
Improves matching of similar opportunities from different sources.
"""
import re
from typing import Optional, Dict, Any
from datetime import datetime
from urllib.parse import urlparse

def normalize_opportunity(opp: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize opportunity data for better deduplication.
    Returns a dictionary with normalized fields for comparison.
    """
    normalized = {
        'title_normalized': normalize_text(opp.get('title', '')),
        'description_normalized': normalize_text(opp.get('description', '')),
        'organizer_normalized': normalize_text(opp.get('organizer', '')),
        'deadline_normalized': normalize_date(opp.get('deadline')),
        'type': opp.get('type'),
        'domain': extract_domain(opp.get('source_url', '')),
    }
    return normalized

def normalize_text(text: str) -> str:
    """
    Normalize text for comparison by removing special characters,
    extra spaces, and converting to lowercase.
    """
    if not text:
        return ""
    
    # Remove special characters except alphanumeric and spaces
    text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
    
    # Remove extra spaces
    text = re.sub(r'\s+', ' ', text)
    
    # Convert to lowercase
    text = text.lower().strip()
    
    return text

def normalize_date(date_str: Optional[str]) -> Optional[str]:
    """
    Normalize date to a standard format for comparison.
    Returns date in YYYY-MM-DD format or None if invalid.
    """
    if not date_str:
        return None
    
    try:
        # Try to parse the date
        if date_str.endswith('Z'):
            dt = datetime.fromisoformat(date_str[:-1])
        else:
            dt = datetime.fromisoformat(date_str)
        
        return dt.strftime('%Y-%m-%d')
    except (ValueError, TypeError):
        return None

def extract_domain(url: str) -> Optional[str]:
    """
    Extract domain from URL for comparison.
    """
    try:
        parsed = urlparse(url)
        return parsed.netloc.lower()
    except:
        return None

def calculate_similarity_score(opp1: Dict[str, Any], opp2: Dict[str, Any]) -> float:
    """
    Calculate similarity score between two opportunities.
    Returns a score between 0 (no similarity) and 1 (identical).
    """
    norm1 = normalize_opportunity(opp1)
    norm2 = normalize_opportunity(opp2)
    
    score = 0.0
    
    # Title similarity (most important)
    title_similarity = calculate_string_similarity(
        norm1['title_normalized'],
        norm2['title_normalized']
    )
    score += title_similarity * 0.5
    
    # Organizer similarity
    if norm1['organizer_normalized'] and norm2['organizer_normalized']:
        org_similarity = calculate_string_similarity(
            norm1['organizer_normalized'],
            norm2['organizer_normalized']
        )
        score += org_similarity * 0.2
    
    # Type match
    if norm1['type'] == norm2['type']:
        score += 0.1
    
    # Deadline similarity
    if norm1['deadline_normalized'] and norm2['deadline_normalized']:
        if norm1['deadline_normalized'] == norm2['deadline_normalized']:
            score += 0.1
    
    # Domain similarity (same domain is more likely to be duplicate)
    if norm1['domain'] and norm2['domain']:
        if norm1['domain'] == norm2['domain']:
            score += 0.1
    
    return min(score, 1.0)

def calculate_string_similarity(str1: str, str2: str) -> float:
    """
    Calculate similarity between two strings using token overlap.
    Returns a score between 0 and 1.
    """
    if not str1 or not str2:
        return 0.0
    
    tokens1 = set(str1.split())
    tokens2 = set(str2.split())
    
    if not tokens1 or not tokens2:
        return 0.0
    
    # Jaccard similarity
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    
    return len(intersection) / len(union) if union else 0.0

def is_duplicate(opp: Dict[str, Any], existing_opps: list, threshold: float = 0.7) -> Optional[str]:
    """
    Check if an opportunity is a duplicate of existing opportunities.
    Returns the source_url of the duplicate if found, None otherwise.
    """
    for existing in existing_opps:
        similarity = calculate_similarity_score(opp, existing)
        if similarity >= threshold:
            return existing.get('source_url')
    
    return None

def find_best_duplicate(opp: Dict[str, Any], existing_opps: list) -> Optional[Dict[str, Any]]:
    """
    Find the best matching duplicate from existing opportunities.
    Returns the opportunity with highest similarity score, or None if no duplicates found.
    """
    best_match = None
    best_score = 0.0
    
    for existing in existing_opps:
        similarity = calculate_similarity_score(opp, existing)
        if similarity > best_score:
            best_score = similarity
            best_match = existing
    
    # Only return if similarity is above threshold
    if best_score >= 0.7:
        return best_match
    
    return None
"""
report_service: Service for fetching and caching user reports from the backend.

This module handles retrieving the user's latest medical/health report from the
HealthSphere backend database, with built-in error handling and optional caching.
"""
import requests
import os
import logging
from typing import Dict, Optional, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class ReportCache:
    """Simple in-memory cache for user reports."""
    
    def __init__(self, ttl_minutes: int = 30):
        """
        Initialize the cache with a time-to-live.
        
        Args:
            ttl_minutes: How long to keep cached entries (default 30 minutes)
        """
        self.cache: Dict[str, tuple] = {}
        self.ttl = timedelta(minutes=ttl_minutes)
    
    def get(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a cached report if it exists and hasn't expired."""
        if user_id in self.cache:
            cached_report, timestamp = self.cache[user_id]
            if datetime.now() - timestamp < self.ttl:
                logger.debug(f"Cache hit for user {user_id}")
                return cached_report
            else:
                logger.debug(f"Cache expired for user {user_id}")
                del self.cache[user_id]
        return None
    
    def set(self, user_id: str, report: Dict[str, Any]) -> None:
        """Cache a report with current timestamp."""
        self.cache[user_id] = (report, datetime.now())
        logger.debug(f"Cached report for user {user_id}")
    
    def clear(self, user_id: Optional[str] = None) -> None:
        """Clear cache for a specific user or all users."""
        if user_id:
            self.cache.pop(user_id, None)
        else:
            self.cache.clear()


# Global cache instance
_report_cache = ReportCache()


def get_user_latest_report(
    user_id: str,
    backend_url: Optional[str] = None,
    timeout: int = 10,
    use_cache: bool = True
) -> Optional[Dict[str, Any]]:
    """
    Fetch the user's latest uploaded report from the backend.
    
    Args:
        user_id: The UUID of the user
        backend_url: Backend service URL (defaults to BACKEND_URL env var)
        timeout: Request timeout in seconds
        use_cache: Whether to use caching (default True)
    
    Returns:
        Dict with report data including 'processing_result', 'created_at', etc.
        Returns None if report not found or request fails.
    """
    if not user_id:
        logger.warning("get_user_latest_report: user_id is empty")
        return None
    
    # Check cache first
    if use_cache:
        cached = _report_cache.get(user_id)
        if cached is not None:
            return cached
    
    if backend_url is None:
        backend_url = os.getenv('BACKEND_URL', 'http://localhost:3001')
    
    try:
        # Attempt to fetch from /api/reports/latest/{user_id}
        url = f"{backend_url}/api/reports/latest/{user_id}"
        logger.info(f"Fetching latest report for user {user_id} from {url}")
        
        response = requests.get(url, timeout=timeout)
        
        if response.status_code == 200:
            report_data = response.json()
            
            if report_data:
                logger.info(f"Successfully retrieved report for user {user_id}")
                if use_cache:
                    _report_cache.set(user_id, report_data)
                return report_data
            else:
                logger.warning(f"Empty response for user {user_id}")
                return None
        
        elif response.status_code == 404:
            logger.warning(f"No report found for user {user_id} (404)")
            return None
        
        else:
            logger.error(f"Backend returned {response.status_code}: {response.text}")
            return None
    
    except requests.exceptions.Timeout:
        logger.error(f"Timeout fetching report for user {user_id}")
        return None
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error fetching report for user {user_id}: {e}")
        return None
    
    except Exception as e:
        logger.error(f"Unexpected error fetching report for user {user_id}: {e}")
        return None


def extract_report_summary(report_data: Dict[str, Any]) -> str:
    """
    Extract a readable summary from report data.
    
    Args:
        report_data: The report dictionary from backend
    
    Returns:
        Formatted string summary of the report
    """
    if not report_data:
        return ""
    
    summary_parts = []
    
    # Include the processing result
    if 'processing_result' in report_data:
        summary_parts.append(f"Report Analysis:\n{report_data['processing_result']}")
    
    # Include additional metadata if available
    if 'created_at' in report_data:
        summary_parts.append(f"Report Date: {report_data['created_at']}")
    
    if 'file_name' in report_data:
        summary_parts.append(f"Document: {report_data['file_name']}")
    
    if 'risk_metrics' in report_data:
        summary_parts.append(f"Risk Assessment: {report_data['risk_metrics']}")
    
    if 'recommendations' in report_data:
        summary_parts.append(f"Recommendations: {report_data['recommendations']}")
    
    return "\n".join(summary_parts)


def clear_report_cache(user_id: Optional[str] = None) -> None:
    """
    Clear the report cache for a specific user or all users.
    
    Args:
        user_id: If provided, clear only this user's cache. Otherwise clear all.
    """
    _report_cache.clear(user_id)
    logger.info(f"Cleared report cache for {user_id or 'all users'}")

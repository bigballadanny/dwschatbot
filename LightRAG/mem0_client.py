
"""
mem0 client for embedding storage and retrieval.
"""

import requests
import os
import logging
from typing import List, Dict, Any, Optional, Union
from LightRAG.utils import load_env

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Mem0Client:
    def __init__(self, base_url: str = None, api_key: str = None):
        # Load environment variables if they haven't been loaded yet
        load_env()
        
        self.base_url = base_url or os.getenv("MEM0_URL", "http://localhost:8000")
        self.api_key = api_key or os.getenv("MEM0_API_KEY")
        
        # Validate configuration
        if not self.base_url:
            logger.warning("MEM0_URL environment variable not set. Using default: http://localhost:8000")
        
        logger.info(f"Initialized Mem0Client with base URL: {self.base_url}")

    def _get_headers(self) -> dict:
        """Get request headers including API key if available."""
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def store_embedding(self, embedding: Dict[str, Any]) -> Dict[str, Any]:
        """
        Store an embedding in mem0.
        
        Args:
            embedding: Dictionary with text and metadata
        
        Returns:
            API response
        """
        url = f"{self.base_url}/embeddings"
        try:
            logger.debug(f"Storing embedding: {embedding.get('text', '')[:50]}...")
            resp = requests.post(url, json=embedding, headers=self._get_headers())
            resp.raise_for_status()
            
            result = resp.json()
            logger.debug(f"Successfully stored embedding with ID: {result.get('id', 'unknown')}")
            return result
        except requests.exceptions.RequestException as e:
            logger.error(f"Error storing embedding: {e}")
            raise

    def query_embeddings(self, query: str, keywords: Optional[List[str]] = None, 
                        filters: Optional[Dict[str, Any]] = None, max_retries: int = 3) -> List[Dict[str, Any]]:
        """
        Query embeddings using semantic search, optionally with keyword enhancement.
        
        Args:
            query: The query text for semantic search
            keywords: Optional list of keywords to enhance search
            filters: Optional metadata filters
            max_retries: Number of retries on failure
            
        Returns:
            List of matching results with scores
        """
        url = f"{self.base_url}/search"
        params = {"q": query}
        
        if keywords:
            params["keywords"] = ",".join(keywords)
        
        if filters:
            for key, value in filters.items():
                params[f"filter_{key}"] = value
        
        retries = 0
        while retries <= max_retries:
            try:
                logger.debug(f"Querying embeddings with: {query}")
                resp = requests.get(url, params=params, headers=self._get_headers())
                resp.raise_for_status()
                
                # Add score if not already present
                results = resp.json()
                if isinstance(results, list):
                    for idx, result in enumerate(results):
                        if isinstance(result, dict) and 'score' not in result:
                            # Higher index means lower relevance in typical API responses
                            results[idx]['score'] = 1.0 - (idx * 0.1)
                            
                logger.debug(f"Found {len(results)} matching embeddings")
                return results
            except requests.exceptions.RequestException as e:
                retries += 1
                logger.warning(f"Error querying embeddings (attempt {retries}): {e}")
                if retries > max_retries:
                    logger.error(f"Failed to query embeddings after {max_retries} attempts")
                    return []
            
    def get_document_types(self) -> List[str]:
        """
        Get list of available document types in the knowledge base.
        """
        url = f"{self.base_url}/document_types"
        try:
            logger.debug("Fetching document types")
            resp = requests.get(url, headers=self._get_headers())
            resp.raise_for_status()
            
            result = resp.json()
            logger.debug(f"Found {len(result)} document types")
            return result
        except requests.exceptions.RequestException as e:
            logger.warning(f"Error fetching document types: {e}")
            return []
            
    def healthcheck(self) -> bool:
        """
        Check if the mem0 service is available.
        
        Returns:
            True if the service is available, False otherwise
        """
        try:
            url = f"{self.base_url}/health"
            resp = requests.get(url, timeout=5, headers=self._get_headers())
            return resp.status_code == 200
        except requests.exceptions.RequestException:
            return False


"""
mem0 client for embedding storage and retrieval.
"""

import requests
import os
from typing import List, Dict, Any, Optional, Union

class Mem0Client:
    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.getenv("MEM0_URL", "http://localhost:8000")

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
            resp = requests.post(url, json=embedding)
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.RequestException as e:
            print(f"Error storing embedding: {e}")
            raise

    def query_embeddings(self, query: str, keywords: Optional[List[str]] = None, 
                        filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Query embeddings using semantic search, optionally with keyword enhancement.
        
        Args:
            query: The query text for semantic search
            keywords: Optional list of keywords to enhance search
            filters: Optional metadata filters
            
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
        
        try:
            resp = requests.get(url, params=params)
            resp.raise_for_status()
            
            # Add score if not already present
            results = resp.json()
            if isinstance(results, list):
                for idx, result in enumerate(results):
                    if isinstance(result, dict) and 'score' not in result:
                        # Higher index means lower relevance in typical API responses
                        results[idx]['score'] = 1.0 - (idx * 0.1)
                        
            return results
        except requests.exceptions.RequestException as e:
            print(f"Error querying embeddings: {e}")
            # Return empty list instead of raising to maintain robustness
            return []

    def get_document_types(self) -> List[str]:
        """
        Get list of available document types in the knowledge base.
        """
        url = f"{self.base_url}/document_types"
        try:
            resp = requests.get(url)
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.RequestException:
            return []

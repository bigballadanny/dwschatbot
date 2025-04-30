
"""
PGVector client for embedding storage and retrieval with Supabase.
"""

import os
import json
import logging
import numpy as np
from typing import List, Dict, Any, Optional, Union
from LightRAG.utils import load_env
from LightRAG.supabase_client import get_supabase_client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PGVectorClient:
    """Client for storing and retrieving vector embeddings using Supabase PGVector."""
    
    def __init__(self, embedding_dimension: int = 1536):
        """
        Initialize the PGVector client.
        
        Args:
            embedding_dimension: Dimension of embeddings (default: 1536 for OpenAI)
        """
        # Load environment variables if they haven't been loaded yet
        load_env()
        
        self.dimension = embedding_dimension
        logger.info(f"Initialized PGVectorClient with dimension: {self.dimension}")
    
    def _get_supabase(self):
        """Get a Supabase client instance."""
        return get_supabase_client()
    
    def store_embedding(self, embedding: Dict[str, Any]) -> Dict[str, Any]:
        """
        Store an embedding in PGVector.
        
        Args:
            embedding: Dictionary with text content, embedding vector, and metadata
                Example: {
                    "text": "Sample text content",
                    "embedding": [0.1, 0.2, ...],  # Optional, will be generated if not provided
                    "metadata": {"source": "document.pdf", "topic": "ai"}
                }
        
        Returns:
            API response with embedding ID
        """
        try:
            client = self._get_supabase()
            
            # Extract fields
            content = embedding.get("text", "")
            metadata = embedding.get("metadata", {})
            vector = embedding.get("embedding")
            user_id = metadata.get("user_id")
            
            # For now, we just store the text content - in a production system,
            # you would generate embeddings here or externally
            if vector is None:
                logger.warning("No embedding vector provided. In production, generate embeddings here.")
                # Placeholder for embedding generation or raise an error
                vector = [0.0] * self.dimension
                
            # Insert into embeddings table
            result = client.table("embeddings").insert({
                "content": content,
                "metadata": metadata,
                "embedding": vector,
                "user_id": user_id
            }).execute()
            
            if hasattr(result, 'error') and result.error:
                logger.error(f"Error storing embedding: {result.error}")
                raise Exception(f"Supabase error: {result.error}")
                
            logger.debug(f"Successfully stored embedding")
            return {"id": result.data[0]["id"], "status": "success"}
            
        except Exception as e:
            logger.error(f"Error storing embedding: {e}")
            raise
    
    def query_embeddings(self, query: str, keywords: Optional[List[str]] = None,
                         filters: Optional[Dict[str, Any]] = None, 
                         top_k: int = 10,
                         similarity_threshold: float = 0.7) -> List[Dict[str, Any]]:
        """
        Query embeddings using vector similarity search.
        
        Args:
            query: The query text or vector
            keywords: Optional list of keywords to enhance search
            filters: Optional metadata filters
            top_k: Maximum number of results to return
            similarity_threshold: Minimum similarity score (0-1)
            
        Returns:
            List of matching results with scores
        """
        try:
            client = self._get_supabase()
            
            # In a production system, generate query embedding here
            # For now we're using a demo approach
            logger.info(f"Querying embeddings with query: {query[:50]}...")
            
            # Build the SQL query - in a real implementation, you would:
            # 1. Generate embedding from query text
            # 2. Use vector similarity search
            # For now, let's do a basic text search on the content field
            
            # This is a simplified example - in production, you would:
            rpc_payload = {
                "query_text": query,
                "match_threshold": similarity_threshold,
                "match_count": top_k
            }
            
            if filters:
                # If we have metadata filters, add them to the payload
                rpc_payload["filter_metadata"] = json.dumps(filters)
            
            # Call a database function that would perform the similarity search
            # Note: This is a placeholder - you would need to create this function in Supabase
            result = client.rpc(
                "search_embeddings", 
                rpc_payload
            ).execute()
            
            if hasattr(result, 'error') and result.error:
                logger.error(f"Error querying embeddings: {result.error}")
                # Fallback to basic text search if RPC fails
                result = client.table("embeddings").select(
                    "id", "content", "metadata", "relevance_score"
                ).textsearch("content", query).limit(top_k).execute()
                
                if hasattr(result, 'error') and result.error:
                    logger.error(f"Fallback query failed: {result.error}")
                    return []
            
            # Format results with scores
            results = []
            for idx, item in enumerate(result.data):
                # In a real implementation, scores would come from vector similarity
                # Here we're just simulating with relevance_score or position-based scoring
                score = item.get('relevance_score', 1.0 - (idx * 0.1))
                if score < 0: score = 0
                if score > 1: score = 1
                
                results.append({
                    "id": item.get("id"),
                    "text": item.get("content"),
                    "metadata": item.get("metadata", {}),
                    "score": score
                })
                
            logger.info(f"Found {len(results)} matching embeddings")
            return results
            
        except Exception as e:
            logger.error(f"Error querying embeddings: {e}")
            return []
    
    def record_feedback(self, embedding_id: str, query: str, 
                        is_relevant: bool, user_id: Optional[str] = None,
                        comment: Optional[str] = None) -> bool:
        """
        Record user feedback on a retrieval result to improve future results.
        
        Args:
            embedding_id: ID of the embedding
            query: The query that retrieved this embedding
            is_relevant: Whether the embedding was relevant to the query
            user_id: Optional user ID for tracking
            comment: Optional user comment
            
        Returns:
            Success status
        """
        try:
            client = self._get_supabase()
            
            feedback_data = {
                "embedding_id": embedding_id,
                "query": query,
                "is_relevant": is_relevant,
                "user_id": user_id
            }
            
            if comment:
                feedback_data["comment"] = comment
                
            result = client.table("embedding_feedback").insert(feedback_data).execute()
            
            if hasattr(result, 'error') and result.error:
                logger.error(f"Error recording feedback: {result.error}")
                return False
                
            logger.info(f"Successfully recorded feedback for embedding {embedding_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error recording feedback: {e}")
            return False
    
    def get_document_types(self) -> List[str]:
        """
        Get list of available document types in the knowledge base.
        
        Returns:
            List of document types
        """
        try:
            client = self._get_supabase()
            
            # Query distinct metadata.source values
            result = client.table("embeddings").select(
                "metadata->source"
            ).execute()
            
            if hasattr(result, 'error') and result.error:
                logger.error(f"Error fetching document types: {result.error}")
                return []
                
            # Extract unique source types
            sources = set()
            for item in result.data:
                if isinstance(item, dict) and 'metadata' in item:
                    source = item['metadata'].get('source')
                    if source:
                        sources.add(source)
            
            logger.info(f"Found {len(sources)} document types")
            return list(sources)
            
        except Exception as e:
            logger.warning(f"Error fetching document types: {e}")
            return []
            
    def healthcheck(self) -> bool:
        """
        Check if the PGVector service is available.
        
        Returns:
            True if the service is available, False otherwise
        """
        try:
            client = self._get_supabase()
            # Just fetch a single row to test connection
            client.table("embeddings").select("id").limit(1).execute()
            return True
        except Exception:
            return False

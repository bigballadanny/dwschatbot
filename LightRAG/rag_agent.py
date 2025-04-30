
"""
LightRAG Agent: Core querying logic for the RAG system.
"""

from typing import List, Optional, Union, Dict, Any
from LightRAG.pgvector_client import PGVectorClient
import re

class QueryParam:
    """
    Parameters for controlling the RAG query behavior.
    """
    def __init__(
        self,
        mode: str = "hybrid",
        topic: Optional[str] = None,
        max_results: int = 5,
        threshold: float = 0.7,
        use_feedback: bool = True,
    ):
        """
        Initialize query parameters.
        
        Args:
            mode: Retrieval mode ("hybrid", "semantic", "keyword", "naive")
            topic: Optional topic filter
            max_results: Maximum number of results to return
            threshold: Minimum score threshold for results
            use_feedback: Whether to use feedback to improve results
        """
        self.mode = mode
        self.topic = topic
        self.max_results = max_results
        self.threshold = threshold
        self.use_feedback = use_feedback

class LightRAGAgent:
    """
    Agent for querying knowledge base and retrieving relevant information.
    """
    
    def __init__(self, knowledge_base=None):
        """
        Initialize the RAG agent with an optional custom knowledge base.
        If none provided, uses the default PGVector client.
        """
        self.knowledge_base = knowledge_base or PGVectorClient()
    
    async def query(
        self, 
        query_text: str, 
        param: Optional[QueryParam] = None,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Query the knowledge base using the provided text.
        
        Args:
            query_text: The query text to search for
            param: Query parameters to control behavior
            **kwargs: Additional keyword arguments
            
        Returns:
            List of relevant text passages with metadata
        """
        try:
            if not query_text.strip():
                return [{"text": "Please provide a valid query.", "score": 0.0, "source": "system"}]
            
            # Use default parameters if not provided
            if param is None:
                param = QueryParam()
            else:
                # Combine kwargs with param for backward compatibility
                for key, value in kwargs.items():
                    if hasattr(param, key):
                        setattr(param, key, value)
            
            # Extract keywords for hybrid search
            keywords = self._extract_keywords(query_text) if param.mode == "hybrid" else []
            
            # Prepare filters
            filters = {}
            if param.topic:
                filters["topic"] = param.topic
            
            # Query the knowledge base (PGVector)
            results = await self.knowledge_base.query_embeddings(
                query_text,
                keywords=keywords if param.mode == "hybrid" else None,
                filters=filters,
                top_k=param.max_results,
                mode=param.mode
            )
            
            # Extract text from results and format response
            formatted_results = []
            if results and isinstance(results, list):
                for result in results:
                    if isinstance(result, dict):
                        # Ensure we have at least the text field
                        if 'text' in result:
                            formatted_results.append({
                                'text': result['text'],
                                'score': result.get('score', 0.0),
                                'id': result.get('id'),
                                'topic': result.get('metadata', {}).get('topic', ''),
                                'source': result.get('source', 'knowledge_base')
                            })
                    elif isinstance(result, str):
                        formatted_results.append({
                            'text': result,
                            'score': 0.0,
                            'topic': '',
                            'source': 'knowledge_base'
                        })
            
            # Filter by threshold if specified
            if param.threshold > 0:
                formatted_results = [r for r in formatted_results if r.get('score', 0) >= param.threshold]
            
            # Return appropriate response
            if not formatted_results:
                if param.topic:
                    return [{
                        'text': f"No information found on '{query_text}' related to topic '{param.topic}'.",
                        'score': 0.0,
                        'source': 'system'
                    }]
                else:
                    return [{
                        'text': f"No information found on '{query_text}'.",
                        'score': 0.0,
                        'source': 'system'
                    }]
                    
            # Re-rank results based on relevance scores if available
            formatted_results = self._rerank_results(formatted_results)
                
            return formatted_results
            
        except Exception as e:
            print(f"Error in RAG query: {e}")
            return [{
                'text': f"Error processing query: {str(e)}",
                'score': 0.0,
                'source': 'error'
            }]
    
    def record_feedback(
        self, 
        result_id: str, 
        query: str, 
        is_relevant: bool, 
        user_id: Optional[str] = None,
        comment: Optional[str] = None
    ) -> bool:
        """
        Record user feedback on a retrieval result to improve future results.
        
        Args:
            result_id: ID of the retrieval result
            query: The query that produced this result
            is_relevant: Whether the result was relevant
            user_id: Optional user ID
            comment: Optional user comment
            
        Returns:
            Success status
        """
        try:
            return self.knowledge_base.record_feedback(
                embedding_id=result_id,
                query=query,
                is_relevant=is_relevant,
                user_id=user_id,
                comment=comment
            )
        except Exception as e:
            print(f"Error recording feedback: {e}")
            return False
    
    def _extract_keywords(self, text: str, max_keywords: int = 5) -> List[str]:
        """
        Extract potential keywords from the query for hybrid search.
        Using a simple approach for now, could be enhanced with NLP.
        """
        # Remove common stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 
                     'were', 'be', 'been', 'being', 'in', 'on', 'at', 'to', 'for', 
                     'with', 'by', 'about', 'like', 'through', 'over', 'before', 
                     'after', 'between', 'under', 'above', 'of', 'from'}
        
        # Split, clean, and filter words
        words = re.findall(r'\b\w+\b', text.lower())
        keywords = [word for word in words if word not in stop_words and len(word) > 2]
        
        # Return most relevant keywords (based on length for now)
        keywords.sort(key=len, reverse=True)
        return keywords[:max_keywords]
    
    def _rerank_results(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Re-rank results based on relevance scores and other factors.
        """
        # Sort by score in descending order
        return sorted(results, key=lambda x: x.get('score', 0.0), reverse=True)

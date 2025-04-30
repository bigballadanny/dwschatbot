
"""
LightRAG Agent: Core querying logic for the RAG system.
"""

from typing import List, Optional, Union, Dict, Any
from LightRAG.mem0_client import Mem0Client
import re

class LightRAGAgent:
    """
    Agent for querying knowledge base and retrieving relevant information.
    """
    
    def __init__(self, knowledge_base=None):
        """
        Initialize the RAG agent with an optional custom knowledge base.
        If none provided, uses the default mem0 client.
        """
        self.knowledge_base = knowledge_base or Mem0Client()
    
    def query(self, query_text: str, topic: Optional[str] = None, 
              max_results: int = 5, use_hybrid_search: bool = True) -> List[Dict[str, Any]]:
        """
        Query the knowledge base using the provided text.
        
        Args:
            query_text: The query text to search for
            topic: Optional topic filter to narrow down results
            max_results: Maximum number of results to return
            use_hybrid_search: Whether to use hybrid search (keyword + semantic)
            
        Returns:
            List of relevant text passages with metadata
        """
        try:
            if not query_text.strip():
                return [{"text": "Please provide a valid query.", "score": 0.0, "source": "system"}]
            
            # Extract keywords for hybrid search
            keywords = self._extract_keywords(query_text) if use_hybrid_search else []
            
            # Query the knowledge base (mem0 or custom implementation)
            results = self.knowledge_base.query_embeddings(
                query_text,
                keywords=keywords if use_hybrid_search else None
            )
            
            # Filter by topic if specified
            if topic and results:
                results = [r for r in results if 
                          isinstance(r, dict) and 
                          r.get('topic') == topic]
            
            # Extract text from results and format response
            formatted_results = []
            if results and isinstance(results, list):
                for result in results[:max_results]:
                    if isinstance(result, dict):
                        # Ensure we have at least the text field
                        if 'text' in result:
                            formatted_results.append({
                                'text': result['text'],
                                'score': result.get('score', 0.0),
                                'topic': result.get('topic', ''),
                                'source': result.get('source', 'knowledge_base')
                            })
                    elif isinstance(result, str):
                        formatted_results.append({
                            'text': result,
                            'score': 0.0,
                            'topic': '',
                            'source': 'knowledge_base'
                        })
            
            # Return appropriate response
            if not formatted_results:
                if topic:
                    return [{
                        'text': f"No information found on '{query_text}' related to topic '{topic}'.",
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

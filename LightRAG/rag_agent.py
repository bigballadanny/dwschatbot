
"""
LightRAG Agent: Core querying logic for the RAG system.
"""

from typing import List, Optional, Union
from LightRAG.mem0_client import Mem0Client

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
              max_results: int = 5) -> List[str]:
        """
        Query the knowledge base using the provided text.
        
        Args:
            query_text: The query text to search for
            topic: Optional topic filter to narrow down results
            max_results: Maximum number of results to return
            
        Returns:
            List of relevant text passages
        """
        try:
            if not query_text.strip():
                return ["Please provide a valid query."]
            
            # Query the knowledge base (mem0 or custom implementation)
            results = self.knowledge_base.query_embeddings(query_text)
            
            # Filter by topic if specified
            if topic and results:
                results = [r for r in results if 
                          isinstance(r, dict) and 
                          r.get('topic') == topic]
            
            # Extract text from results
            texts = []
            if results and isinstance(results, list):
                for result in results[:max_results]:
                    if isinstance(result, dict) and 'text' in result:
                        texts.append(result['text'])
                    elif isinstance(result, str):
                        texts.append(result)
            
            # Return appropriate response
            if not texts:
                if topic:
                    return [f"No information found on '{query_text}' related to topic '{topic}'."]
                else:
                    return [f"No information found on '{query_text}'."]
                    
            return texts
            
        except Exception as e:
            print(f"Error in RAG query: {e}")
            return [f"Error processing query: {str(e)}"]

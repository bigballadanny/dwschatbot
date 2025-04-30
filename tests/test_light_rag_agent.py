
import unittest
from unittest.mock import Mock, patch
from LightRAG.rag_agent import LightRAGAgent

class TestLightRAGAgent(unittest.TestCase):
    
    def setUp(self):
        # Create a mock knowledge base
        self.mock_kb = Mock()
        self.agent = LightRAGAgent(knowledge_base=self.mock_kb)
    
    def test_query_calls_knowledge_base(self):
        # Setup mock return value
        self.mock_kb.query_embeddings.return_value = [
            {"text": "Test response", "score": 0.9}
        ]
        
        # Call the method
        result = self.agent.query("test query")
        
        # Check the knowledge base was called correctly
        self.mock_kb.query_embeddings.assert_called_once()
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["text"], "Test response")
    
    def test_empty_query_returns_error_message(self):
        # Call with empty query
        result = self.agent.query("   ")
        
        # Should return an error message
        self.assertEqual(len(result), 1)
        self.assertTrue("valid query" in result[0]["text"])
        
        # Knowledge base should not be called
        self.mock_kb.query_embeddings.assert_not_called()
    
    def test_topic_filtering(self):
        # Setup mock to return multiple results
        self.mock_kb.query_embeddings.return_value = [
            {"text": "Finance result", "topic": "finance", "score": 0.9},
            {"text": "Marketing result", "topic": "marketing", "score": 0.8}
        ]
        
        # Query with finance topic filter
        result = self.agent.query("test query", topic="finance")
        
        # Should only get finance results
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["text"], "Finance result")
    
    def test_hybrid_search_sends_keywords(self):
        # Call with hybrid search enabled
        self.agent.query("what is acquisition strategy", use_hybrid_search=True)
        
        # Check that keywords were extracted and passed to knowledge base
        args, kwargs = self.mock_kb.query_embeddings.call_args
        self.assertIn('keywords', kwargs)
        self.assertTrue(isinstance(kwargs['keywords'], list))
        
        # Common words like "is" should be filtered out
        self.assertIn('what', kwargs['keywords'])
        self.assertIn('acquisition', kwargs['keywords'])
        self.assertIn('strategy', kwargs['keywords'])
    
    def test_reranking(self):
        # Setup mock to return results with scores in wrong order
        self.mock_kb.query_embeddings.return_value = [
            {"text": "Lower score", "score": 0.5},
            {"text": "Higher score", "score": 0.9}
        ]
        
        # Query should rerank results
        result = self.agent.query("test query")
        
        # First result should be the one with higher score
        self.assertEqual(result[0]["text"], "Higher score")
        self.assertEqual(result[1]["text"], "Lower score")

if __name__ == "__main__":
    unittest.main()

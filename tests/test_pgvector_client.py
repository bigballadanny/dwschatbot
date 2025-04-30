
"""
Unit tests for the PGVector client.
"""

import unittest
from unittest.mock import patch, Mock
from LightRAG.pgvector_client import PGVectorClient

class TestPGVectorClient(unittest.TestCase):
    
    def setUp(self):
        self.client = PGVectorClient(embedding_dimension=1536)
    
    @patch('LightRAG.pgvector_client.get_supabase_client')
    def test_store_embedding(self, mock_get_supabase):
        # Setup mock
        mock_supabase = Mock()
        mock_table = Mock()
        mock_execute = Mock()
        mock_execute.execute.return_value.data = [{"id": "test_id"}]
        mock_table.insert.return_value = mock_execute
        mock_supabase.table.return_value = mock_table
        mock_get_supabase.return_value = mock_supabase
        
        # Call method
        embedding = {
            "text": "test text", 
            "metadata": {"topic": "test"},
            "embedding": [0.1] * 1536
        }
        response = self.client.store_embedding(embedding)
        
        # Verify
        mock_supabase.table.assert_called_once_with("embeddings")
        mock_table.insert.assert_called_once()
        self.assertEqual(response["id"], "test_id")
    
    @patch('LightRAG.pgvector_client.get_supabase_client')
    def test_delete_embeddings_by_metadata(self, mock_get_supabase):
        # Setup mock
        mock_supabase = Mock()
        mock_table = Mock()
        mock_filter = Mock()
        mock_execute = Mock()
        mock_execute.execute.return_value.data = [{"id": "id1"}, {"id": "id2"}]
        mock_filter.delete.return_value = mock_execute
        mock_table.filter.return_value = mock_filter
        mock_supabase.table.return_value = mock_table
        mock_get_supabase.return_value = mock_supabase
        
        # Call method
        result = self.client.delete_embeddings_by_metadata({"transcript_id": "test_id"})
        
        # Verify
        mock_supabase.table.assert_called_once_with("embeddings")
        mock_table.filter.assert_called_once()
        mock_filter.delete.assert_called_once()
        self.assertTrue(result)
    
    @patch('LightRAG.pgvector_client.get_supabase_client')
    def test_query_embeddings_basic(self, mock_get_supabase):
        # Setup mock
        mock_supabase = Mock()
        mock_rpc = Mock()
        mock_execute = Mock()
        mock_execute.execute.return_value.data = [
            {"id": "id1", "content": "result1", "metadata": {"source": "test"}, "relevance_score": 0.9},
            {"id": "id2", "content": "result2", "metadata": {"source": "test"}, "relevance_score": 0.8}
        ]
        mock_rpc.execute.return_value = mock_execute
        mock_supabase.rpc.return_value = mock_rpc
        mock_get_supabase.return_value = mock_supabase
        
        # Call method
        results = self.client.query_embeddings("test query")
        
        # Verify
        mock_supabase.rpc.assert_called_once()
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["score"], 0.9)
    
    @patch('LightRAG.pgvector_client.get_supabase_client')
    def test_query_embeddings_with_feedback(self, mock_get_supabase):
        # Setup mock
        mock_supabase = Mock()
        mock_rpc = Mock()
        mock_execute = Mock()
        mock_execute.execute.return_value.data = [
            {"id": "id1", "content": "result1", "metadata": {"source": "test"}, "relevance_score": 0.6, "feedback_count": 5},
            {"id": "id2", "content": "result2", "metadata": {"source": "test"}, "relevance_score": 0.8, "feedback_count": 1}
        ]
        mock_rpc.execute.return_value = mock_execute
        mock_supabase.rpc.return_value = mock_rpc
        mock_get_supabase.return_value = mock_supabase
        
        # Call method
        results = self.client.query_embeddings("test query", use_feedback=True)
        
        # Verify
        self.assertEqual(len(results), 2)
        # First item should have score boosted by feedback (0.6 + 0.6*0.5 = 0.9)
        self.assertAlmostEqual(results[0]["score"], 0.9, places=1)
        
        # With feedback turned off, scores should remain unboosted
        results_no_feedback = self.client.query_embeddings("test query", use_feedback=False)
        self.assertEqual(results_no_feedback[0]["score"], 0.6)
    
    @patch('LightRAG.pgvector_client.get_supabase_client')
    def test_record_feedback(self, mock_get_supabase):
        # Setup mock
        mock_supabase = Mock()
        mock_table = Mock()
        mock_execute = Mock()
        mock_execute.execute.return_value.data = [{"id": "feedback_id"}]
        mock_table.insert.return_value = mock_execute
        mock_supabase.table.return_value = mock_table
        mock_get_supabase.return_value = mock_supabase
        
        # Call method
        success = self.client.record_feedback(
            embedding_id="test_id",
            query="test query",
            is_relevant=True,
            user_id="user1",
            comment="Great result"
        )
        
        # Verify
        mock_supabase.table.assert_called_once_with("embedding_feedback")
        mock_table.insert.assert_called_once()
        self.assertTrue(success)
    
    @patch('LightRAG.pgvector_client.get_supabase_client')
    def test_healthcheck(self, mock_get_supabase):
        # Setup mock
        mock_supabase = Mock()
        mock_table = Mock()
        mock_select = Mock()
        mock_limit = Mock()
        mock_limit.execute.return_value = {}
        mock_select.limit.return_value = mock_limit
        mock_table.select.return_value = mock_select
        mock_supabase.table.return_value = mock_table
        mock_get_supabase.return_value = mock_supabase
        
        # Call method
        result = self.client.healthcheck()
        
        # Verify
        mock_supabase.table.assert_called_once_with("embeddings")
        mock_table.select.assert_called_once_with("id")
        self.assertTrue(result)

if __name__ == "__main__":
    unittest.main()


import unittest
from unittest.mock import patch, Mock
from LightRAG.mem0_client import Mem0Client

class TestMem0Client(unittest.TestCase):
    
    def setUp(self):
        self.client = Mem0Client(base_url="http://test-url")
    
    @patch('requests.post')
    def test_store_embedding(self, mock_post):
        # Setup mock
        mock_response = Mock()
        mock_response.json.return_value = {"id": "test_id", "status": "success"}
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response
        
        # Call method
        embedding = {"text": "test text", "metadata": {"topic": "test"}}
        response = self.client.store_embedding(embedding)
        
        # Verify
        mock_post.assert_called_once_with("http://test-url/embeddings", json=embedding)
        self.assertEqual(response["id"], "test_id")
    
    @patch('requests.get')
    def test_query_embeddings_basic(self, mock_get):
        # Setup mock
        mock_response = Mock()
        mock_response.json.return_value = [
            {"text": "result1", "score": 0.9},
            {"text": "result2", "score": 0.8}
        ]
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        # Call method
        results = self.client.query_embeddings("test query")
        
        # Verify
        mock_get.assert_called_once()
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["score"], 0.9)
    
    @patch('requests.get')
    def test_query_embeddings_with_keywords(self, mock_get):
        # Setup mock
        mock_response = Mock()
        mock_response.json.return_value = [{"text": "result"}]
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        # Call method with keywords
        keywords = ["key1", "key2"]
        self.client.query_embeddings("test", keywords=keywords)
        
        # Verify keywords were passed correctly
        args, kwargs = mock_get.call_args
        self.assertEqual(kwargs["params"]["keywords"], "key1,key2")
    
    @patch('requests.get')
    def test_query_embeddings_error_handling(self, mock_get):
        # Setup mock to raise exception
        mock_get.side_effect = Exception("Test error")
        
        # Call should not raise but return empty list
        results = self.client.query_embeddings("test")
        self.assertEqual(results, [])
    
    @patch('requests.get')
    def test_get_document_types(self, mock_get):
        # Setup mock
        mock_response = Mock()
        mock_response.json.return_value = ["type1", "type2"]
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        # Call method
        types = self.client.get_document_types()
        
        # Verify
        self.assertEqual(types, ["type1", "type2"])
        mock_get.assert_called_once_with("http://test-url/document_types")

if __name__ == "__main__":
    unittest.main()


"""
Tests for environment configuration and service availability.
"""

import unittest
from unittest.mock import patch, MagicMock
import os
from LightRAG.utils import load_env, validate_services
from LightRAG.mem0_client import Mem0Client
from LightRAG.supabase_client import get_supabase_client

class TestEnvironment(unittest.TestCase):
    
    def test_load_env(self):
        """Test that load_env can be called without errors."""
        try:
            load_env()
            # If we get here, no exceptions were raised
            self.assertTrue(True)
        except Exception as e:
            self.fail(f"load_env raised exception {e}")
    
    def test_validate_services(self):
        """Test service validation function."""
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://test.supabase.co", 
            "SUPABASE_KEY": "test-key",
            "MEM0_URL": "http://localhost:8000",
            "MEM0_API_KEY": "test-api-key"
        }):
            services = validate_services()
            self.assertTrue(all(services.values()))
    
    @patch('requests.get')
    def test_mem0_healthcheck(self, mock_get):
        """Test mem0 healthcheck function."""
        # Mock the response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_get.return_value = mock_response
        
        # Test healthcheck
        mem0 = Mem0Client(base_url="http://test.mem0.local")
        self.assertTrue(mem0.healthcheck())
        
        # Verify the call
        mock_get.assert_called_once_with(
            "http://test.mem0.local/health", 
            timeout=5, 
            headers={'Content-Type': 'application/json'}
        )
        
    @patch('requests.get')
    def test_mem0_api_key_in_headers(self, mock_get):
        """Test that API key is included in headers when provided."""
        # Mock the response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = []
        mock_get.return_value = mock_response
        
        # Test with API key
        mem0 = Mem0Client(base_url="http://test.mem0.local", api_key="test-api-key")
        mem0.query_embeddings("test query")
        
        # Verify API key in headers
        headers = mock_get.call_args[1]['headers']
        self.assertEqual(headers['Authorization'], "Bearer test-api-key")

if __name__ == "__main__":
    unittest.main()


"""
Tests for the PGVector client integration with Supabase.
"""

import pytest
import os
import uuid
from unittest.mock import patch, MagicMock
from LightRAG.pgvector_client import PGVectorClient
from LightRAG.utils import load_env

# Mock environment variables for testing
@pytest.fixture(autouse=True)
def mock_env_vars(monkeypatch):
    """Setup mock environment variables for testing."""
    monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "test-key")

# Mock Supabase client
@pytest.fixture
def mock_supabase():
    """Create a mock Supabase client."""
    mock = MagicMock()
    mock.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{'id': str(uuid.uuid4())}]
    )
    mock.table.return_value.select.return_value.execute.return_value = MagicMock(
        data=[{'id': str(uuid.uuid4()), 'content': 'Test content', 'metadata': {'source': 'test'}}]
    )
    return mock

@pytest.fixture
def pgvector_client():
    """Create a PGVector client instance."""
    return PGVectorClient()

@patch('LightRAG.pgvector_client.get_supabase_client')
def test_store_embedding(mock_get_supabase, pgvector_client, mock_supabase):
    """Test storing an embedding."""
    mock_get_supabase.return_value = mock_supabase
    
    result = pgvector_client.store_embedding({
        "text": "Test embedding content",
        "metadata": {"source": "test_doc.pdf"}
    })
    
    # Check that insert was called
    mock_supabase.table.assert_called_once_with("embeddings")
    mock_supabase.table().insert.assert_called_once()
    
    # Check returned id
    assert "id" in result
    assert result["status"] == "success"

@patch('LightRAG.pgvector_client.get_supabase_client')
def test_query_embeddings(mock_get_supabase, pgvector_client, mock_supabase):
    """Test querying embeddings."""
    mock_get_supabase.return_value = mock_supabase
    
    results = pgvector_client.query_embeddings(
        query="Test query",
        filters={"topic": "test"},
        top_k=5
    )
    
    # Verify the rpc call was made
    mock_supabase.rpc.assert_called_once()
    assert len(results) > 0

@patch('LightRAG.pgvector_client.get_supabase_client')
def test_record_feedback(mock_get_supabase, pgvector_client, mock_supabase):
    """Test recording feedback for embeddings."""
    mock_get_supabase.return_value = mock_supabase
    
    embedding_id = str(uuid.uuid4())
    success = pgvector_client.record_feedback(
        embedding_id=embedding_id,
        query="Test query",
        is_relevant=True,
        user_id="test-user"
    )
    
    assert success is True
    # Verify insert was called on the embedding_feedback table
    mock_supabase.table.assert_called_with("embedding_feedback")
    mock_supabase.table().insert.assert_called_once()

@patch('LightRAG.pgvector_client.get_supabase_client')
def test_delete_embeddings_by_metadata(mock_get_supabase, pgvector_client, mock_supabase):
    """Test deleting embeddings by metadata filter."""
    mock_get_supabase.return_value = mock_supabase
    
    success = pgvector_client.delete_embeddings_by_metadata({
        "transcript_id": "test-transcript"
    })
    
    assert success is True
    # Verify filter and delete were called
    mock_supabase.table.assert_called_with("embeddings")
    mock_supabase.table().filter.assert_called_once()
    mock_supabase.table().filter().delete.assert_called_once()


"""
Integration tests for the transcript ingestion pipeline.
"""

import pytest
import os
import tempfile
import uuid
from unittest.mock import patch, MagicMock
from LightRAG.ingest_pipeline import ingest_transcript, rechunk_transcript
from LightRAG.supabase_client import get_supabase_client

# Mock environment variables
@pytest.fixture(autouse=True)
def mock_env_vars(monkeypatch):
    """Setup mock environment variables for testing."""
    monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "test-key")

@pytest.fixture
def mock_supabase():
    """Create a mock Supabase client."""
    mock = MagicMock()
    # Configure file upload mock
    mock.storage.from_.return_value.upload.return_value = {"Key": "test-file.txt"}
    
    # Configure transcript data
    mock.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{
            "id": str(uuid.uuid4()),
            "content": "Test transcript content",
            "user_id": "test-user",
            "tags": ["test"],
            "file_path": "test-file.txt"
        }]
    )
    
    # Configure insert response
    mock.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": str(uuid.uuid4())}]
    )
    
    return mock

@patch('LightRAG.ingest_pipeline.get_supabase_client')
@patch('LightRAG.ingest_pipeline.upload_file')
@patch('LightRAG.ingest_pipeline.insert_metadata')
@patch('LightRAG.ingest_pipeline.PGVectorClient')
def test_ingest_transcript(mock_pgvector_class, mock_insert_metadata, 
                          mock_upload_file, mock_get_supabase, mock_supabase):
    """Test ingesting a transcript file."""
    # Create a temporary file for testing
    with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
        f.write("This is a test transcript. It has multiple sentences. This is for testing.")
    
    # Configure mock objects
    mock_get_supabase.return_value = mock_supabase
    mock_pgvector = MagicMock()
    mock_pgvector_class.return_value = mock_pgvector
    
    try:
        # Call the function under test
        transcript_id = ingest_transcript(
            file_path=f.name,
            topic="test",
            user_id="test-user"
        )
        
        # Verify the transcript ID was returned
        assert transcript_id is not None
        
        # Verify upload was called
        mock_upload_file.assert_called_once()
        
        # Verify metadata insertion was called
        mock_insert_metadata.assert_called_once()
        
        # Verify embedding storage was called
        assert mock_pgvector.store_embedding.call_count > 0
        
    finally:
        # Clean up the temporary file
        os.unlink(f.name)

@patch('LightRAG.ingest_pipeline.get_supabase_client')
@patch('LightRAG.ingest_pipeline.PGVectorClient')
def test_rechunk_transcript(mock_pgvector_class, mock_get_supabase, mock_supabase):
    """Test re-chunking an existing transcript."""
    # Setup mock objects
    mock_get_supabase.return_value = mock_supabase
    mock_pgvector = MagicMock()
    mock_pgvector_class.return_value = mock_pgvector
    
    # Execute the function under test
    transcript_id = str(uuid.uuid4())
    success = rechunk_transcript(
        transcript_id=transcript_id,
        chunk_size=3,
        chunk_overlap=1
    )
    
    # Verify success
    assert success is True
    
    # Verify old embeddings were deleted
    mock_pgvector.delete_embeddings_by_metadata.assert_called_once_with(
        {"transcript_id": transcript_id}
    )
    
    # Verify new embeddings were created
    assert mock_pgvector.store_embedding.call_count > 0
    
    # Verify transcript record was updated
    mock_supabase.table.return_value.update.assert_called_once()

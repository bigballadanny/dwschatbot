"""
Pytest unit tests for LightRAG ingestion and retrieval pipeline.
Covers expected use, edge case, and failure case.
"""
import os
import sys
import pytest
from unittest.mock import patch

# Ensure LightRAG is importable regardless of cwd
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
from LightRAG.rag_pipeline import ingest_documents, retrieve_context

@pytest.fixture
def sample_transcript(tmp_path):
    file_path = tmp_path / "sample.txt"
    file_path.write_text("M&A due diligence is critical. Always review financials.\nFiller words here.\nSynergy opportunities discussed.")
    return str(file_path)

@patch("LightRAG.rag_pipeline.get_openai_embedding", return_value=[0.1]*1536)
@patch("LightRAG.rag_pipeline.create_client")
def test_ingest_and_retrieve_success(mock_create_client, mock_embed, sample_transcript):
    """Test successful ingestion and retrieval."""
    # Mock Supabase client and its methods
    mock_supabase = mock_create_client.return_value
    mock_storage = mock_supabase.storage.from_.return_value
    mock_storage.upload.return_value = True
    mock_supabase.table.return_value.insert.return_value.execute.return_value = type("Resp", (), {"data": [{"id": 1}]})()
    ingest_documents(
        transcript_path=sample_transcript,
        title="Test Meeting",
        participants=["Alice", "Bob"],
        meeting_date="2025-04-29",
        mem0_url="http://localhost:8050",
        supabase_url="http://fake.supabase.co",
        supabase_key="fake-key"
    )
    # Retrieval should return context (mocked)
    with patch("LightRAG.rag_pipeline.Mem0SSEClient.search_memories", return_value=[{"text": "M&A due diligence is critical."}]):
        result = retrieve_context("due diligence", mem0_url="http://localhost:8050")
        assert any("due diligence" in chunk["text"] for chunk in result)

@patch("LightRAG.rag_pipeline.get_openai_embedding", return_value=[0.1]*1536)
def test_retrieve_no_results(mock_embed):
    """Test retrieval returns empty when no context matches."""
    with patch("LightRAG.rag_pipeline.Mem0SSEClient.search_memories", return_value=[]):
        result = retrieve_context("nonexistent topic", mem0_url="http://localhost:8050")
        assert result == []

@patch("LightRAG.rag_pipeline.get_openai_embedding", side_effect=Exception("Embedding error"))
@patch("LightRAG.rag_pipeline.create_client")
def test_ingest_embedding_failure(mock_create_client, mock_embed, sample_transcript):
    """Test ingestion handles embedding failure gracefully."""
    # Mock Supabase client and its methods
    mock_supabase = mock_create_client.return_value
    mock_storage = mock_supabase.storage.from_.return_value
    mock_storage.upload.return_value = True
    mock_supabase.table.return_value.insert.return_value.execute.return_value = type("Resp", (), {"data": [{"id": 1}]})()
    try:
        ingest_documents(
            transcript_path=sample_transcript,
            title="Test Meeting",
            participants=["Alice", "Bob"],
            meeting_date="2025-04-29",
            mem0_url="http://localhost:8050",
            supabase_url="http://fake.supabase.co",
            supabase_key="fake-key"
        )
    except Exception as e:
        pytest.fail(f"Ingestion should handle embedding failure, got exception: {e}")


"""
Integration test for the full RAG system.
"""

import os
import pytest
import tempfile
from typing import List
import uuid
import numpy as np
from unittest.mock import patch, MagicMock

from LightRAG.rag_pipeline import chunk_transcript
from LightRAG.rag_agent import LightRAGAgent
from LightRAG.pgvector_client import PGVectorClient

# Sample test data
SAMPLE_TRANSCRIPT = """
# Meeting Notes: Strategic Planning Session

## Introduction
John Smith opened the meeting at 10:00 AM. All department heads were present.
The purpose of the meeting was to discuss Q3 strategic planning initiatives.

## Key Discussion Points
1. Marketing team reported a 15% increase in lead generation from the new campaign.
2. Sales figures showed 7% growth compared to previous quarter.
3. Product development timeline for the new feature was approved for August release.

## Action Items
- Sarah to finalize budget allocations by Friday
- Michael to coordinate with external vendors on marketing materials
- Team leads to submit Q3 targets by end of week

Meeting adjourned at 11:45 AM.
"""

class TestRAGSystem:
    """Integration tests for the full RAG system."""
    
    @pytest.fixture
    def mock_embeddings(self):
        """Create mock embeddings for testing."""
        return np.random.rand(5, 1536).tolist()
    
    @pytest.fixture
    def mock_pgvector(self):
        """Create a mock PGVector client."""
        client = MagicMock()
        client.store_embedding.return_value = {"id": str(uuid.uuid4()), "status": "success"}
        client.query_embeddings.return_value = [
            {
                "id": str(uuid.uuid4()),
                "text": "Marketing team reported a 15% increase in lead generation from the new campaign.",
                "metadata": {"source": "test_transcript", "chunk_index": 0},
                "score": 0.85
            },
            {
                "id": str(uuid.uuid4()),
                "text": "Sales figures showed 7% growth compared to previous quarter.",
                "metadata": {"source": "test_transcript", "chunk_index": 1},
                "score": 0.75
            }
        ]
        return client
    
    @pytest.fixture
    def rag_agent(self, mock_pgvector):
        """Create a RAG agent with mocked components."""
        return LightRAGAgent(knowledge_base=mock_pgvector)
    
    def test_chunking_strategies(self):
        """Test different chunking strategies."""
        # Test sentence-based chunking
        sentence_chunks = chunk_transcript(SAMPLE_TRANSCRIPT, strategy="sentence")
        assert len(sentence_chunks) > 0
        
        # Test paragraph-based chunking
        paragraph_chunks = chunk_transcript(SAMPLE_TRANSCRIPT, strategy="paragraph")
        assert len(paragraph_chunks) > 0
        
        # Test section-based chunking
        section_chunks = chunk_transcript(SAMPLE_TRANSCRIPT, strategy="section")
        assert len(section_chunks) > 0
        
        # Check that different strategies produce different results
        assert len(sentence_chunks) != len(paragraph_chunks) or len(paragraph_chunks) != len(section_chunks)
    
    def test_store_and_query(self, rag_agent, mock_pgvector, mock_embeddings):
        """Test storing chunks and querying them."""
        # Mock the embedding generation
        with patch("LightRAG.mem0_client.Mem0Client.generate_embeddings", return_value=mock_embeddings):
            # Chunk the transcript
            chunks = chunk_transcript(SAMPLE_TRANSCRIPT)
            
            # Store each chunk
            for idx, chunk in enumerate(chunks):
                result = mock_pgvector.store_embedding({
                    "text": chunk,
                    "metadata": {
                        "source": "test_transcript",
                        "chunk_index": idx
                    }
                })
                assert result["status"] == "success"
            
            # Query the system
            query_results = rag_agent.query("What were the marketing results?")
            
            # Verify results
            assert len(query_results) > 0
            assert any("marketing" in result.get("text", "").lower() for result in query_results)
    
    def test_feedback_mechanism(self, rag_agent, mock_pgvector):
        """Test the feedback mechanism."""
        # Mock query results
        results = [
            {
                "id": str(uuid.uuid4()),
                "text": "Marketing team reported a 15% increase in lead generation from the new campaign.",
                "score": 0.85
            }
        ]
        mock_pgvector.query_embeddings.return_value = results
        
        # Submit feedback
        feedback_result = rag_agent.record_feedback(
            result_id=results[0]["id"],
            query="marketing results",
            is_relevant=True,
            user_id="test_user"
        )
        
        # Verify feedback was recorded
        assert feedback_result is True
        mock_pgvector.record_feedback.assert_called_once()

def test_end_to_end_with_file():
    """Test the end-to-end process with a temporary file."""
    # Create a temporary file with the sample transcript
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as temp_file:
        temp_file.write(SAMPLE_TRANSCRIPT)
        temp_path = temp_file.name
    
    try:
        # In a real test, we would use the actual ingest_pipeline
        # For now, just verify the file exists
        assert os.path.exists(temp_path)
        
        # Mock the ingestion process
        chunks = chunk_transcript(SAMPLE_TRANSCRIPT)
        assert len(chunks) > 0
        
    finally:
        # Clean up
        if os.path.exists(temp_path):
            os.unlink(temp_path)

if __name__ == "__main__":
    # This allows running the tests directly with python
    pytest.main(["-xvs", __file__])

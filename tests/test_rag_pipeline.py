
"""
Unit tests for the RAG pipeline ingestion and chunking.
"""

import pytest
from LightRAG.rag_pipeline import chunk_transcript

def test_chunk_transcript_basic():
    """
    Test that a transcript is chunked into expected number of chunks.
    """
    transcript = "Sentence one. Sentence two. Sentence three. Sentence four."
    chunks = chunk_transcript(transcript, chunk_size=2)
    assert len(chunks) == 2
    assert chunks[0] == "Sentence one. Sentence two."
    assert chunks[1] == "Sentence three. Sentence four."

def test_chunk_transcript_edge_case():
    """
    Test chunking with fewer sentences than chunk size.
    """
    transcript = "Only one sentence."
    chunks = chunk_transcript(transcript, chunk_size=5)
    assert len(chunks) == 1
    assert chunks[0] == "Only one sentence."

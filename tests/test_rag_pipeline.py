
"""
Unit tests for the RAG pipeline ingestion and chunking.
"""

import pytest
from LightRAG.rag_pipeline import chunk_transcript, analyze_chunking_quality, estimate_embedding_tokens

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

def test_chunk_transcript_overlap():
    """
    Test chunking with overlap.
    """
    transcript = "One. Two. Three. Four. Five. Six."
    chunks = chunk_transcript(transcript, chunk_size=3, overlap=1)
    assert len(chunks) == 3
    assert chunks[0] == "One. Two. Three."
    assert chunks[1] == "Three. Four. Five."
    assert chunks[2] == "Five. Six."

def test_chunk_transcript_max_size():
    """
    Test chunking respects maximum chunk size.
    """
    # Create a long sentence that exceeds max_chars_per_chunk
    long_sentence = "This is " + "very " * 500 + "long."
    chunks = chunk_transcript(long_sentence, max_chars_per_chunk=100)
    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk) <= 100

def test_chunk_transcript_no_text():
    """
    Test chunking with empty text.
    """
    chunks = chunk_transcript("")
    assert len(chunks) == 0
    
    chunks = chunk_transcript(None)
    assert len(chunks) == 0

def test_analyze_chunking_quality():
    """
    Test chunking quality analysis.
    """
    chunks = ["Short chunk.", "This is a medium sized chunk with more content.", "A" * 1000]
    analysis = analyze_chunking_quality(chunks)
    
    assert analysis["chunk_count"] == 3
    assert analysis["min_chunk_length"] == len(chunks[0])
    assert analysis["max_chunk_length"] == len(chunks[2])
    assert len(analysis["possible_issues"]) > 0  # Should detect high variability

def test_estimate_embedding_tokens():
    """
    Test token usage estimation.
    """
    chunks = ["This is chunk one.", "This is chunk two.", "This is chunk three."]
    total_chars = sum(len(chunk) for chunk in chunks)
    
    estimate = estimate_embedding_tokens(chunks)
    
    assert estimate["chunk_count"] == 3
    assert estimate["total_characters"] == total_chars
    assert estimate["estimated_tokens"] == int(total_chars * 0.25)
    assert estimate["estimated_cost_usd"] > 0

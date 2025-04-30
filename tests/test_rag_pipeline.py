
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

def test_hierarchical_chunking():
    """
    Test hierarchical chunking strategy.
    """
    # Create a multi-paragraph text with clear structure
    transcript = """
    # Introduction
    This is the first paragraph of introduction.
    This continues the introduction with important context.

    ## Section 1
    This is the first section with details.
    The section continues with more information.

    ## Section 2
    Another important section with key details.
    More sentences that elaborate on section 2.
    """
    
    # First test standard chunking
    standard_chunks = chunk_transcript(transcript, chunk_size=2)
    
    # Verify we have chunks
    assert len(standard_chunks) > 0
    
    # Now test hierarchical chunking by paragraph
    paragraphs = transcript.split("\n\n")
    paragraph_chunks = []
    
    for para in paragraphs:
        if para.strip():
            para_chunks = chunk_transcript(para.strip(), chunk_size=1)
            paragraph_chunks.extend(para_chunks)
    
    # Verify paragraph chunking produced different results
    # (Note: this is an example of how we might test different chunking strategies)
    assert len(paragraph_chunks) != len(standard_chunks)

def test_rechunking_consistency():
    """
    Test that rechunking with the same parameters produces consistent results.
    """
    transcript = "One. Two. Three. Four. Five. Six. Seven. Eight. Nine. Ten."
    
    # Initial chunking
    original_chunks = chunk_transcript(transcript, chunk_size=3, overlap=1)
    
    # Simulate rechunking
    rechunked = chunk_transcript(transcript, chunk_size=3, overlap=1)
    
    # Chunks should be identical
    assert len(original_chunks) == len(rechunked)
    for i, chunk in enumerate(original_chunks):
        assert chunk == rechunked[i]

def test_sentence_boundary_respect():
    """
    Test that chunking respects sentence boundaries.
    """
    transcript = "This is a sentence with Mr. Smith. This is another one with Dr. Jones."
    chunks = chunk_transcript(transcript, chunk_size=1)
    
    # Should properly handle abbreviations and not split at Mr. or Dr.
    assert len(chunks) == 2
    assert "Mr. Smith" in chunks[0]
    assert "Dr. Jones" in chunks[1]

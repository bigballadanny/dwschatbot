
"""
RAG Pipeline: Core functions for processing and chunking transcripts.
"""

import re
import textwrap
from typing import List, Optional, Union, Dict, Any

def chunk_transcript(
    transcript: str, 
    chunk_size: int = 5, 
    overlap: int = 1,
    max_chars_per_chunk: int = 2000  # Char limit to prevent too-large chunks
) -> List[str]:
    """
    Split transcript into overlapping chunks of sentences.
    
    Args:
        transcript: The full text transcript
        chunk_size: Number of sentences per chunk
        overlap: Number of sentences to overlap between chunks
        max_chars_per_chunk: Maximum characters per chunk
    
    Returns:
        List of chunked text
    """
    if not transcript or not isinstance(transcript, str):
        return []
    
    # Better sentence splitting with consideration for common abbreviations
    # This regex handles: end of sentence (., !, ?) followed by space and capital letter,
    # but avoids splitting on common abbreviations (Mr., Dr., etc.)
    # The negative lookbehind (?<!Mr|Dr|Mrs|Ms|Prof|Gen|Col|Maj|St|Sr|Jr|Ph\.D) prevents splits after common titles
    pattern = r'(?<!Mr|Dr|Mrs|Ms|Prof|Gen|Col|Maj|St|Sr|Jr|Ph\.D)(?<=[.!?])\s+(?=[A-Z])'
    
    sentences = re.split(pattern, transcript.strip())
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if not sentences:
        # If no sentences were detected, fall back to paragraph-based chunking
        paragraphs = transcript.split("\n\n")
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
        if paragraphs:
            # Break long paragraphs into smaller pieces
            sentences = []
            for para in paragraphs:
                if len(para) > max_chars_per_chunk:
                    # Use textwrap to create chunks within sensible line length
                    para_chunks = textwrap.wrap(para, width=max_chars_per_chunk)
                    sentences.extend(para_chunks)
                else:
                    sentences.append(para)
        else:
            # Last resort: just return the transcript as a single chunk
            return [transcript] if transcript else []
    
    # Create overlapping chunks
    chunks = []
    i = 0
    
    while i < len(sentences):
        # Determine how many sentences to include in this chunk
        current_chunk_size = min(chunk_size, len(sentences) - i)
        chunk_sentences = sentences[i:i + current_chunk_size]
        
        # Check if the combined chunk exceeds max size
        combined_chunk = " ".join(chunk_sentences)
        
        if len(combined_chunk) <= max_chars_per_chunk:
            chunks.append(combined_chunk)
        else:
            # If chunk is too large, split it further
            split_chunks = textwrap.wrap(combined_chunk, width=max_chars_per_chunk)
            chunks.extend(split_chunks)
        
        # Move forward with overlap
        i += max(1, chunk_size - overlap)
    
    return chunks


def analyze_chunking_quality(chunks: List[str]) -> Dict[str, Any]:
    """
    Analyze the quality of the chunking.
    
    Args:
        chunks: List of text chunks
        
    Returns:
        Dictionary with analysis metrics
    """
    if not chunks:
        return {
            "chunk_count": 0,
            "avg_chunk_length": 0,
            "min_chunk_length": 0,
            "max_chunk_length": 0,
            "std_dev": 0,
            "possible_issues": ["No chunks provided"]
        }
    
    # Calculate length statistics
    lengths = [len(chunk) for chunk in chunks]
    avg_length = sum(lengths) / len(lengths)
    min_length = min(lengths)
    max_length = max(lengths)
    
    # Calculate standard deviation
    variance = sum((length - avg_length) ** 2 for length in lengths) / len(lengths)
    std_dev = variance ** 0.5
    
    # Identify potential issues
    issues = []
    
    if min_length < 50:
        issues.append(f"Very short chunks detected (min: {min_length} chars)")
    
    if max_length > 3000:
        issues.append(f"Very long chunks detected (max: {max_length} chars)")
    
    if std_dev / avg_length > 0.5:
        issues.append(f"High variability in chunk sizes (std dev: {std_dev:.2f})")
    
    return {
        "chunk_count": len(chunks),
        "avg_chunk_length": avg_length,
        "min_chunk_length": min_length,
        "max_chunk_length": max_length,
        "std_dev": std_dev,
        "possible_issues": issues if issues else ["No issues detected"]
    }

def estimate_embedding_tokens(chunks: List[str], tokens_per_char: float = 0.25) -> Dict[str, Any]:
    """
    Estimate token usage for embedding the chunks.
    
    Args:
        chunks: List of text chunks
        tokens_per_char: Estimated tokens per character (default: 0.25)
        
    Returns:
        Dictionary with token estimates and cost estimates
    """
    total_chars = sum(len(chunk) for chunk in chunks)
    estimated_tokens = int(total_chars * tokens_per_char)
    
    # Estimate cost (based on OpenAI's ada-002 pricing: $0.0001 / 1K tokens)
    estimated_cost = (estimated_tokens / 1000) * 0.0001
    
    return {
        "chunk_count": len(chunks),
        "total_characters": total_chars,
        "estimated_tokens": estimated_tokens,
        "estimated_cost_usd": estimated_cost,
    }

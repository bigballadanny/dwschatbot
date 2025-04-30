
"""
RAG Pipeline: Core functions for processing and chunking transcripts.
"""

import re
from typing import List, Optional, Union

def chunk_transcript(
    transcript: str, 
    chunk_size: int = 5, 
    overlap: int = 1
) -> List[str]:
    """
    Split transcript into overlapping chunks of sentences.
    
    Args:
        transcript: The full text transcript
        chunk_size: Number of sentences per chunk
        overlap: Number of sentences to overlap between chunks
    
    Returns:
        List of chunked text
    """
    if not transcript or not isinstance(transcript, str):
        return []
        
    # Simple sentence splitting (can be enhanced with NLP libraries)
    sentences = re.split(r'(?<=[.!?])\s+', transcript.strip())
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if not sentences:
        return [transcript] if transcript else []
    
    # Create overlapping chunks
    chunks = []
    i = 0
    while i < len(sentences):
        chunk = " ".join(sentences[i:i + chunk_size])
        chunks.append(chunk)
        i += max(1, chunk_size - overlap)  # Move forward, with overlap
    
    return chunks

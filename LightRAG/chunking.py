
"""
Transcript chunking module: Specialized chunking strategies for different document types.
"""

import re
import textwrap
from typing import List, Optional, Dict, Any

def chunk_by_sentence(
    text: str, 
    chunk_size: int = 5, 
    overlap: int = 1,
    max_chars_per_chunk: int = 2000
) -> List[str]:
    """
    Split text into chunks by sentence with configurable overlap.
    
    Args:
        text: Text to chunk
        chunk_size: Number of sentences per chunk
        overlap: Number of sentences to overlap between chunks
        max_chars_per_chunk: Maximum characters per chunk
        
    Returns:
        List of text chunks
    """
    if not text or not isinstance(text, str):
        return []
    
    # Better sentence splitting with consideration for common abbreviations
    pattern = r'(?<!Mr|Dr|Mrs|Ms|Prof|Gen|Col|Maj|St|Sr|Jr|Ph\.D)(?<=[.!?])\s+(?=[A-Z])'
    
    sentences = re.split(pattern, text.strip())
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if not sentences:
        # Fall back to paragraph-based chunking
        paragraphs = text.split("\n\n")
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
        if paragraphs:
            # Break long paragraphs into smaller pieces
            sentences = []
            for para in paragraphs:
                if len(para) > max_chars_per_chunk:
                    para_chunks = textwrap.wrap(para, width=max_chars_per_chunk)
                    sentences.extend(para_chunks)
                else:
                    sentences.append(para)
        else:
            # Last resort: just return the text as a single chunk
            return [text] if text else []
    
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

def chunk_by_paragraph(
    text: str,
    max_chars_per_chunk: int = 2000
) -> List[str]:
    """
    Split text into chunks by paragraph.
    
    Args:
        text: Text to chunk
        max_chars_per_chunk: Maximum characters per chunk
        
    Returns:
        List of text chunks
    """
    if not text or not isinstance(text, str):
        return []
    
    # Split by double newline (paragraph)
    paragraphs = text.split("\n\n")
    paragraphs = [p.strip() for p in paragraphs if p.strip()]
    
    # Process paragraphs
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        # If paragraph alone exceeds limit, split it
        if len(para) > max_chars_per_chunk:
            # First, add any accumulated chunk
            if current_chunk:
                chunks.append(current_chunk)
                current_chunk = ""
            
            # Then split the long paragraph
            para_chunks = textwrap.wrap(para, width=max_chars_per_chunk)
            chunks.extend(para_chunks)
        # If adding this paragraph would exceed limit
        elif len(current_chunk) + len(para) + 2 > max_chars_per_chunk:
            chunks.append(current_chunk)
            current_chunk = para
        # Otherwise add to current chunk
        else:
            if current_chunk:
                current_chunk += "\n\n" + para
            else:
                current_chunk = para
    
    # Add final chunk if exists
    if current_chunk:
        chunks.append(current_chunk)
    
    return chunks

def chunk_by_section(
    text: str,
    section_markers: List[str] = ['#', '##', '###', 'Section', 'Chapter'],
    max_chars_per_chunk: int = 2000
) -> List[str]:
    """
    Split text into chunks by section headers.
    
    Args:
        text: Text to chunk
        section_markers: Patterns that indicate section starts
        max_chars_per_chunk: Maximum characters per chunk
        
    Returns:
        List of text chunks
    """
    if not text or not isinstance(text, str):
        return []
    
    # Build regex pattern for section headers
    pattern_parts = [rf'^{re.escape(marker)}[\s:]' for marker in section_markers]
    pattern = '|'.join(pattern_parts)
    
    # Split text by section markers
    lines = text.split('\n')
    sections = []
    current_section = []
    
    for line in lines:
        if re.match(pattern, line):
            # Save previous section if exists
            if current_section:
                sections.append('\n'.join(current_section))
                current_section = []
        
        # Add line to current section
        current_section.append(line)
    
    # Add final section
    if current_section:
        sections.append('\n'.join(current_section))
    
    # Process sections to respect max_chars_per_chunk
    chunks = []
    for section in sections:
        if len(section) <= max_chars_per_chunk:
            chunks.append(section)
        else:
            # If section is too long, split by sentences
            sentence_chunks = chunk_by_sentence(
                section, 
                max_chars_per_chunk=max_chars_per_chunk
            )
            chunks.extend(sentence_chunks)
    
    return chunks

def chunk_transcript(
    transcript: str, 
    chunk_size: int = 5, 
    overlap: int = 1,
    max_chars_per_chunk: int = 2000,
    strategy: str = 'sentence'
) -> List[str]:
    """
    Split transcript into chunks using the specified strategy.
    
    Args:
        transcript: The full text transcript
        chunk_size: Number of sentences per chunk (for sentence strategy)
        overlap: Number of sentences to overlap between chunks (for sentence strategy)
        max_chars_per_chunk: Maximum characters per chunk
        strategy: Chunking strategy ('sentence', 'paragraph', 'section')
    
    Returns:
        List of chunked text
    """
    if not transcript or not isinstance(transcript, str):
        return []
    
    # Select chunking strategy
    if strategy == 'paragraph':
        return chunk_by_paragraph(transcript, max_chars_per_chunk)
    elif strategy == 'section':
        return chunk_by_section(transcript, max_chars_per_chunk=max_chars_per_chunk)
    else:  # Default to sentence
        return chunk_by_sentence(transcript, chunk_size, overlap, max_chars_per_chunk)

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

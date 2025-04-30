
"""
Enhanced chunking module with support for various chunking strategies.
"""

import re
from typing import List, Dict, Any, Optional, Union
import numpy as np

def chunk_transcript(
    text: str, 
    chunk_size: int = 5,
    overlap: int = 1, 
    strategy: str = "sentence",
    max_chars_per_chunk: int = 2000
) -> List[str]:
    """
    Chunk a transcript text into smaller pieces using specified strategy.
    
    Args:
        text: The transcript text to chunk
        chunk_size: Number of units (sentences, paragraphs) per chunk
        overlap: Number of overlapping units between chunks
        strategy: Chunking strategy ('sentence', 'paragraph', 'section')
        max_chars_per_chunk: Maximum characters allowed per chunk
        
    Returns:
        List of text chunks
    """
    if not text:
        return []
    
    chunks = []
    
    if strategy == "sentence":
        # Split by sentences (with handling for abbreviations like Mr., Dr., etc.)
        sentences = split_into_sentences(text)
        
        # Create chunks of sentences with overlap
        for i in range(0, len(sentences), chunk_size - overlap):
            chunk = " ".join(sentences[i:i + chunk_size])
            
            # Apply maximum length constraint
            if len(chunk) > max_chars_per_chunk:
                sub_chunks = split_by_max_length(chunk, max_chars_per_chunk)
                chunks.extend(sub_chunks)
            else:
                chunks.append(chunk)
                
    elif strategy == "paragraph":
        # Split by paragraphs (double newlines)
        paragraphs = re.split(r'\n\s*\n', text)
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
        
        for i in range(0, len(paragraphs), chunk_size - overlap):
            chunk = "\n\n".join(paragraphs[i:i + chunk_size])
            
            # Apply maximum length constraint
            if len(chunk) > max_chars_per_chunk:
                sub_chunks = split_by_max_length(chunk, max_chars_per_chunk)
                chunks.extend(sub_chunks)
            else:
                chunks.append(chunk)
                
    elif strategy == "section":
        # Split by markdown-style section headers
        sections = re.split(r'(?m)^#+\s+', text)
        sections = [s.strip() for s in sections if s.strip()]
        
        for i in range(0, len(sections), chunk_size - overlap):
            chunk = "\n\n".join(sections[i:i + chunk_size])
            
            # Apply maximum length constraint
            if len(chunk) > max_chars_per_chunk:
                sub_chunks = split_by_max_length(chunk, max_chars_per_chunk)
                chunks.extend(sub_chunks)
            else:
                chunks.append(chunk)
                
    elif strategy == "semantic":
        # Semantic chunking using text structure and coherence
        # In a full implementation, this would involve more sophisticated NLP
        # For now, we'll use a combination of sentence and paragraph approaches
        
        # First split by paragraphs
        paragraphs = re.split(r'\n\s*\n', text)
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
        
        current_chunk = ""
        current_topic = ""
        
        for para in paragraphs:
            # Simple topic detection (first sentence as topic)
            sentences = split_into_sentences(para)
            if sentences:
                potential_topic = sentences[0]
                
                # If we detect a topic shift or chunk is getting too large, start a new chunk
                if (current_chunk and 
                    (len(current_chunk) + len(para) > max_chars_per_chunk or
                     calculate_semantic_similarity(current_topic, potential_topic) < 0.5)):
                    chunks.append(current_chunk)
                    current_chunk = para
                    current_topic = potential_topic
                else:
                    if current_chunk:
                        current_chunk += "\n\n" + para
                    else:
                        current_chunk = para
                        current_topic = potential_topic
        
        # Add the last chunk if not empty
        if current_chunk:
            chunks.append(current_chunk)
    
    # Apply final size check to ensure no chunk exceeds max length
    result = []
    for chunk in chunks:
        if len(chunk) <= max_chars_per_chunk:
            result.append(chunk)
        else:
            result.extend(split_by_max_length(chunk, max_chars_per_chunk))
    
    return result

def split_into_sentences(text: str) -> List[str]:
    """
    Split text into sentences, handling edge cases like abbreviations.
    """
    # Handle common abbreviations to avoid incorrect splits
    text = re.sub(r'(?<=[A-Za-z])\.(?=[A-Z][a-z])', '. ', text)
    text = re.sub(r'(?<=[A-Za-z])\.(?=\s+[A-Z])', '. ', text)
    
    # Preserve common abbreviations
    text = re.sub(r'(?<=[Mm]r)\.(?=\s)', '<<DOT>>', text)
    text = re.sub(r'(?<=[Dd]r)\.(?=\s)', '<<DOT>>', text)
    text = re.sub(r'(?<=[Mm]rs)\.(?=\s)', '<<DOT>>', text)
    text = re.sub(r'(?<=[Mm]s)\.(?=\s)', '<<DOT>>', text)
    text = re.sub(r'(?<=[A-Za-z])\.(?=[A-Za-z])', '<<DOT>>', text)  # Abbreviations like U.S.A
    
    # Split on sentence boundaries
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    # Restore abbreviations
    sentences = [s.replace('<<DOT>>', '.') for s in sentences]
    
    # Remove empty sentences
    return [s.strip() for s in sentences if s.strip()]

def split_by_max_length(text: str, max_length: int) -> List[str]:
    """
    Split text by maximum length, trying to preserve sentence boundaries.
    """
    if len(text) <= max_length:
        return [text]
    
    chunks = []
    sentences = split_into_sentences(text)
    current_chunk = ""
    
    for sentence in sentences:
        if len(current_chunk) + len(sentence) + 1 <= max_length:
            if current_chunk:
                current_chunk += " " + sentence
            else:
                current_chunk = sentence
        else:
            if current_chunk:
                chunks.append(current_chunk)
            
            # If a single sentence exceeds max_length, split it further
            if len(sentence) > max_length:
                words = sentence.split()
                current_chunk = ""
                
                for word in words:
                    if len(current_chunk) + len(word) + 1 <= max_length:
                        if current_chunk:
                            current_chunk += " " + word
                        else:
                            current_chunk = word
                    else:
                        chunks.append(current_chunk)
                        current_chunk = word
            else:
                current_chunk = sentence
    
    if current_chunk:
        chunks.append(current_chunk)
    
    return chunks

def calculate_semantic_similarity(text1: str, text2: str) -> float:
    """
    Calculate semantic similarity between two text strings.
    
    In a production implementation, this would use embeddings.
    This is a simplified version that uses keyword overlap.
    """
    if not text1 or not text2:
        return 0.0
        
    # Simple keyword-based similarity
    words1 = set(re.findall(r'\b\w+\b', text1.lower()))
    words2 = set(re.findall(r'\b\w+\b', text2.lower()))
    
    # Remove common stop words
    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were'}
    words1 = words1 - stop_words
    words2 = words2 - stop_words
    
    if not words1 or not words2:
        return 0.0
    
    # Calculate Jaccard similarity
    intersection = len(words1.intersection(words2))
    union = len(words1.union(words2))
    
    return intersection / union if union > 0 else 0.0

def analyze_chunking_quality(chunks: List[str]) -> Dict[str, Any]:
    """
    Analyze the quality of text chunking.
    
    Args:
        chunks: List of text chunks
        
    Returns:
        Dictionary with quality metrics
    """
    if not chunks:
        return {
            "chunk_count": 0,
            "avg_chunk_length": 0,
            "min_chunk_length": 0,
            "max_chunk_length": 0,
            "chunk_length_std": 0,
            "possible_issues": ["No chunks found"]
        }
    
    chunk_lengths = [len(chunk) for chunk in chunks]
    avg_length = sum(chunk_lengths) / len(chunks)
    
    analysis = {
        "chunk_count": len(chunks),
        "avg_chunk_length": avg_length,
        "min_chunk_length": min(chunk_lengths),
        "max_chunk_length": max(chunk_lengths),
        "chunk_length_std": float(np.std(chunk_lengths)),
        "possible_issues": []
    }
    
    # Check for potential issues
    if analysis["chunk_length_std"] / avg_length > 0.5:
        analysis["possible_issues"].append("High variability in chunk lengths")
        
    if min(chunk_lengths) < avg_length * 0.3:
        analysis["possible_issues"].append("Some chunks are very small")
        
    if max(chunk_lengths) > 2000:
        analysis["possible_issues"].append("Some chunks exceed recommended size (>2000 chars)")
        
    if len(chunks) < 2:
        analysis["possible_issues"].append("Too few chunks for effective retrieval")
        
    return analysis

def estimate_embedding_tokens(chunks: List[str]) -> Dict[str, Any]:
    """
    Estimate token usage and costs for embedding generation.
    
    Args:
        chunks: List of text chunks
        
    Returns:
        Dictionary with token estimates and costs
    """
    # Approximate tokens (assuming ~4 chars per token on average)
    total_chars = sum(len(chunk) for chunk in chunks)
    estimated_tokens = int(total_chars * 0.25)  # 0.25 tokens per character is a rough approximation
    
    # Cost estimate (based on OpenAI ada-002 pricing ~$0.0001 per 1k tokens)
    # This is a placeholder and should be updated based on actual pricing
    cost_per_1k_tokens = 0.0001
    estimated_cost = (estimated_tokens / 1000) * cost_per_1k_tokens
    
    return {
        "chunk_count": len(chunks),
        "total_characters": total_chars,
        "estimated_tokens": estimated_tokens,
        "estimated_cost_usd": estimated_cost
    }

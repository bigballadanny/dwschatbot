
"""
Visualization utilities for analyzing and debugging the RAG system.
"""

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional
from LightRAG.chunking import analyze_chunking_quality

def plot_chunk_distribution(chunks: List[str], title: str = "Chunk Size Distribution") -> None:
    """
    Plot the distribution of chunk sizes.
    
    Args:
        chunks: List of text chunks
        title: Plot title
    """
    if not chunks:
        print("No chunks provided to visualize.")
        return
        
    lengths = [len(chunk) for chunk in chunks]
    
    plt.figure(figsize=(12, 6))
    plt.hist(lengths, bins=20, alpha=0.7, color='skyblue')
    plt.axvline(x=np.mean(lengths), color='r', linestyle='--', label=f'Mean: {np.mean(lengths):.2f}')
    plt.title(title)
    plt.xlabel('Chunk Size (characters)')
    plt.ylabel('Frequency')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.show()
    
def compare_chunking_strategies(
    text: str, 
    strategies: List[str] = ['sentence', 'paragraph', 'section'],
    chunk_size: int = 5,
    overlap: int = 1
) -> pd.DataFrame:
    """
    Compare different chunking strategies on the same text.
    
    Args:
        text: Text to chunk
        strategies: List of chunking strategies to compare
        chunk_size: Number of sentences per chunk (for sentence strategy)
        overlap: Overlap size (for sentence strategy)
        
    Returns:
        DataFrame with comparison metrics
    """
    from LightRAG.chunking import chunk_transcript
    
    results = []
    
    for strategy in strategies:
        chunks = chunk_transcript(text, chunk_size=chunk_size, overlap=overlap, strategy=strategy)
        metrics = analyze_chunking_quality(chunks)
        
        results.append({
            'Strategy': strategy,
            'Chunk Count': metrics['chunk_count'],
            'Avg Length': round(metrics['avg_chunk_length'], 2),
            'Min Length': metrics['min_chunk_length'],
            'Max Length': metrics['max_chunk_length'],
            'Std Dev': round(metrics['std_dev'], 2),
            'Issues': '; '.join(metrics['possible_issues'])
        })
    
    return pd.DataFrame(results)

def visualize_chunk_overlap(
    chunks: List[str], 
    highlight_terms: Optional[List[str]] = None
) -> None:
    """
    Visualize the content overlap between consecutive chunks.
    
    Args:
        chunks: List of text chunks
        highlight_terms: Optional list of terms to highlight
    """
    if not chunks or len(chunks) < 2:
        print("Need at least 2 chunks to visualize overlap.")
        return
    
    from difflib import SequenceMatcher
    
    def find_overlap(a, b):
        """Find the overlapping text between two strings."""
        matcher = SequenceMatcher(None, a, b)
        matches = []
        for i, j, n in matcher.get_matching_blocks():
            if n >= 20:  # Only show significant overlaps
                matches.append((i, j, n))
        return matches
    
    plt.figure(figsize=(14, len(chunks) * 1.2))
    
    for i in range(len(chunks) - 1):
        overlap = find_overlap(chunks[i], chunks[i+1])
        
        plt.subplot(len(chunks) - 1, 1, i + 1)
        
        # Show chunk data
        plt.text(0.01, 0.7, f"Chunk {i} ({len(chunks[i])} chars)", 
                fontsize=11, fontweight='bold')
        plt.text(0.01, 0.4, f"Chunk {i+1} ({len(chunks[i+1])} chars)", 
                fontsize=11, fontweight='bold')
        
        # Show overlap info
        total_overlap = sum(n for _, _, n in overlap)
        plt.text(0.5, 0.9, f"Overlap: {total_overlap} chars ({total_overlap/len(chunks[i]):.1%} of chunk {i})", 
                fontsize=10, ha='center')
        
        plt.axis('off')
        
    plt.tight_layout()
    plt.show()

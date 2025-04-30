
"""
Visualization module for LightRAG: Tools for visualizing chunking and RAG results.
"""

from typing import List, Dict, Any, Optional
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from collections import Counter
import re

def plot_chunk_distribution(chunks: List[str], save_path: Optional[str] = None, title: str = "Chunk Length Distribution"):
    """
    Plot the distribution of chunk lengths.
    
    Args:
        chunks: List of text chunks
        save_path: Optional path to save the figure
        title: Title for the plot
    """
    if not chunks:
        return
    
    # Calculate chunk lengths
    lengths = [len(chunk) for chunk in chunks]
    
    # Create figure
    plt.figure(figsize=(10, 6))
    
    # Plot histogram
    plt.hist(lengths, bins=20, alpha=0.7, color='skyblue', edgecolor='black')
    
    # Add statistics
    plt.axvline(np.mean(lengths), color='red', linestyle='dashed', linewidth=1, label=f'Mean: {np.mean(lengths):.1f}')
    plt.axvline(np.median(lengths), color='green', linestyle='dashed', linewidth=1, label=f'Median: {np.median(lengths):.1f}')
    
    # Add labels and title
    plt.xlabel('Chunk Length (characters)')
    plt.ylabel('Frequency')
    plt.title(title)
    plt.grid(True, alpha=0.3)
    plt.legend()
    
    # Save or show
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
    else:
        plt.show()
    
    plt.close()

def plot_chunk_overlap(original_text: str, chunks: List[str], save_path: Optional[str] = None):
    """
    Visualize the overlap between chunks in the original text.
    
    Args:
        original_text: The original text that was chunked
        chunks: List of text chunks
        save_path: Optional path to save the figure
    """
    if not chunks or not original_text:
        return
    
    # Create a matrix to track positions of text
    text_length = len(original_text)
    chunk_positions = np.zeros((len(chunks), text_length))
    
    # Mark positions for each chunk
    for i, chunk in enumerate(chunks):
        # Find all occurrences of chunk in original text
        for match in re.finditer(re.escape(chunk), original_text):
            start, end = match.span()
            chunk_positions[i, start:end] = 1
    
    # Calculate overlap density
    overlap_density = chunk_positions.sum(axis=0)
    
    # Create figure
    plt.figure(figsize=(12, 8))
    
    # Plot overlap density
    plt.plot(overlap_density, color='blue', alpha=0.7)
    
    # Add labels and title
    plt.xlabel('Text Position (characters)')
    plt.ylabel('Overlap Count')
    plt.title('Chunk Overlap Visualization')
    
    # Add annotations
    plt.text(0.02, 0.95, f'Total chunks: {len(chunks)}', transform=plt.gca().transAxes)
    plt.text(0.02, 0.90, f'Max overlap: {int(overlap_density.max())}', transform=plt.gca().transAxes)
    
    # Highlight areas with high overlap
    high_overlap = np.where(overlap_density > 1)[0]
    if len(high_overlap) > 0:
        plt.fill_between(range(text_length), 0, overlap_density, where=overlap_density > 1, 
                         color='red', alpha=0.3, label='Overlapping regions')
        plt.legend()
    
    # Save or show
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
    else:
        plt.show()
    
    plt.close()

def plot_chunk_heatmap(chunks: List[str], analysis: Dict[str, Any], save_path: Optional[str] = None):
    """
    Create a heatmap visualization of chunk properties.
    
    Args:
        chunks: List of text chunks
        analysis: Dictionary with analysis metrics
        save_path: Optional path to save the figure
    """
    if not chunks:
        return
    
    # Extract metrics for each chunk
    lengths = [len(chunk) for chunk in chunks]
    sentences = [len(re.findall(r'[.!?]+', chunk)) for chunk in chunks]
    words = [len(chunk.split()) for chunk in chunks]
    
    # Create data for heatmap
    data = np.column_stack([lengths, sentences, words])
    
    # Normalize data for better visualization
    data_normalized = data / data.max(axis=0)
    
    # Create figure
    plt.figure(figsize=(12, 8))
    
    # Create heatmap
    sns.heatmap(data_normalized, 
                cmap='viridis',
                xticklabels=['Length', 'Sentences', 'Words'],
                yticklabels=[f'Chunk {i+1}' for i in range(len(chunks))],
                cbar_kws={'label': 'Normalized Value'})
    
    # Add title with analysis summary
    plt.title(f'Chunk Properties Heatmap\n'
              f'Avg Length: {analysis["avg_chunk_length"]:.1f} | '
              f'Min: {analysis["min_chunk_length"]} | '
              f'Max: {analysis["max_chunk_length"]} | '
              f'StdDev: {analysis["std_dev"]:.1f}')
    
    # Save or show
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
    else:
        plt.show()
    
    plt.close()

def plot_search_results(query: str, results: List[Dict[str, Any]], save_path: Optional[str] = None):
    """
    Visualize search results relevance.
    
    Args:
        query: The query text
        results: List of search results with text and score fields
        save_path: Optional path to save the figure
    """
    if not results:
        return
    
    # Extract scores and truncate texts for display
    scores = [result.get('score', 0) for result in results]
    texts = [result.get('text', '')[:50] + '...' for result in results]
    
    # Sort by score
    sorted_indices = np.argsort(scores)[::-1]
    scores = [scores[i] for i in sorted_indices]
    texts = [texts[i] for i in sorted_indices]
    
    # Create figure
    plt.figure(figsize=(12, 8))
    
    # Plot horizontal bar chart
    y_pos = np.arange(len(scores))
    plt.barh(y_pos, scores, align='center', alpha=0.7, color='skyblue')
    plt.yticks(y_pos, texts)
    
    # Add labels and title
    plt.xlabel('Relevance Score')
    plt.title(f'Search Results for Query: "{query}"')
    
    # Adjust layout
    plt.tight_layout()
    
    # Save or show
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
    else:
        plt.show()
    
    plt.close()

def plot_feedback_impact(before_scores: List[float], after_scores: List[float], save_path: Optional[str] = None):
    """
    Visualize the impact of feedback on search results.
    
    Args:
        before_scores: List of relevance scores before feedback
        after_scores: List of relevance scores after feedback
        save_path: Optional path to save the figure
    """
    if not before_scores or not after_scores:
        return
    
    # Create figure
    plt.figure(figsize=(10, 6))
    
    # Plot scores
    x = np.arange(len(before_scores))
    width = 0.35
    
    plt.bar(x - width/2, before_scores, width, label='Before Feedback', color='lightblue')
    plt.bar(x + width/2, after_scores, width, label='After Feedback', color='lightgreen')
    
    # Add labels and title
    plt.xlabel('Result Index')
    plt.ylabel('Relevance Score')
    plt.title('Impact of Feedback on Search Results')
    plt.xticks(x)
    plt.legend()
    
    # Add improvement statistics
    avg_improvement = np.mean(np.array(after_scores) - np.array(before_scores))
    plt.text(0.02, 0.95, f'Average Score Improvement: {avg_improvement:.3f}', 
             transform=plt.gca().transAxes)
    
    # Save or show
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
    else:
        plt.show()
    
    plt.close()

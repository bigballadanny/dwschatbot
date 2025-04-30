
"""
Command line tool for testing and evaluating chunking strategies.
"""

import argparse
import json
import sys
import os
from typing import List, Dict, Any
import matplotlib.pyplot as plt
import numpy as np

from LightRAG.chunking import (
    chunk_transcript, 
    analyze_chunking_quality,
    estimate_embedding_tokens
)

def visualize_chunking(chunks: List[str], output_file: str = None):
    """
    Visualize chunk lengths and distribution.
    
    Args:
        chunks: List of text chunks
        output_file: Optional file path to save the visualization
    """
    # Get chunk lengths
    chunk_lengths = [len(chunk) for chunk in chunks]
    
    # Create figure with two subplots
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    
    # Plot histogram of chunk lengths
    ax1.hist(chunk_lengths, bins=20, alpha=0.7, color='royalblue')
    ax1.set_title('Distribution of Chunk Lengths')
    ax1.set_xlabel('Characters per Chunk')
    ax1.set_ylabel('Frequency')
    
    # Add mean and median lines
    mean_length = np.mean(chunk_lengths)
    median_length = np.median(chunk_lengths)
    ax1.axvline(mean_length, color='red', linestyle='dashed', linewidth=1, label=f'Mean: {mean_length:.1f}')
    ax1.axvline(median_length, color='green', linestyle='dashed', linewidth=1, label=f'Median: {median_length:.1f}')
    ax1.legend()
    
    # Plot chunk lengths as bar chart
    chunk_indices = list(range(1, len(chunks) + 1))
    ax2.bar(chunk_indices, chunk_lengths, color='salmon')
    ax2.set_title('Chunk Lengths')
    ax2.set_xlabel('Chunk Index')
    ax2.set_ylabel('Characters')
    ax2.set_xticks(chunk_indices[::max(1, len(chunks) // 10)])  # Show only some tick marks
    
    # Draw horizontal line for the mean
    ax2.axhline(mean_length, color='red', linestyle='dashed', linewidth=1)
    
    plt.tight_layout()
    
    if output_file:
        plt.savefig(output_file)
        print(f"Visualization saved to {output_file}")
    else:
        plt.show()
    
    plt.close()

def compare_strategies(
    text: str, 
    strategies: List[str] = ["sentence", "paragraph", "section", "semantic"],
    output_file: str = None
):
    """
    Compare different chunking strategies on the same text.
    
    Args:
        text: Input text to chunk
        strategies: List of chunking strategies to compare
        output_file: Optional file path to save the comparison results
    """
    results = {}
    
    for strategy in strategies:
        # Chunk text using the strategy
        chunks = chunk_transcript(text, strategy=strategy)
        
        # Analyze chunking quality
        analysis = analyze_chunking_quality(chunks)
        
        # Estimate token usage
        token_estimate = estimate_embedding_tokens(chunks)
        
        # Store results
        results[strategy] = {
            "chunk_count": len(chunks),
            "avg_chunk_length": analysis["avg_chunk_length"],
            "min_chunk_length": analysis["min_chunk_length"],
            "max_chunk_length": analysis["max_chunk_length"],
            "chunk_length_std": analysis["chunk_length_std"],
            "estimated_tokens": token_estimate["estimated_tokens"],
            "estimated_cost_usd": token_estimate["estimated_cost_usd"],
            "issues": analysis["possible_issues"]
        }
    
    # Print comparison table
    print("\nChunking Strategy Comparison:")
    print("-" * 80)
    print(f"{'Strategy':<12} {'Chunks':<8} {'Avg Len':<10} {'Min Len':<10} {'Max Len':<10} {'Std Dev':<10} {'Est. Tokens':<12} {'Issues'}")
    print("-" * 80)
    
    for strategy, data in results.items():
        issue_count = len(data["issues"])
        print(f"{strategy:<12} {data['chunk_count']:<8} {data['avg_chunk_length']:<10.1f} "
              f"{data['min_chunk_length']:<10} {data['max_chunk_length']:<10} "
              f"{data['chunk_length_std']:<10.1f} {data['estimated_tokens']:<12} "
              f"{issue_count} {'issue' if issue_count == 1 else 'issues'}")
    
    print("-" * 80)
    
    # Save results if output file specified
    if output_file:
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nComparison results saved to {output_file}")
    
    return results

def main():
    """Main entry point for the chunking tools CLI."""
    parser = argparse.ArgumentParser(description='LightRAG Chunking Tools')
    
    # Create subparsers for different commands
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Chunk command
    chunk_parser = subparsers.add_parser('chunk', help='Chunk a text file')
    chunk_parser.add_argument('input_file', help='Input text file to chunk')
    chunk_parser.add_argument('--strategy', '-s', default='sentence', choices=['sentence', 'paragraph', 'section', 'semantic'], 
                             help='Chunking strategy to use')
    chunk_parser.add_argument('--chunk-size', '-c', type=int, default=5, 
                             help='Number of units per chunk')
    chunk_parser.add_argument('--overlap', '-o', type=int, default=1, 
                             help='Number of overlapping units between chunks')
    chunk_parser.add_argument('--max-chars', '-m', type=int, default=2000, 
                             help='Maximum characters per chunk')
    chunk_parser.add_argument('--output', '-out', help='Output file for the chunks')
    chunk_parser.add_argument('--visualize', '-v', action='store_true', 
                             help='Visualize chunking results')
    
    # Compare command
    compare_parser = subparsers.add_parser('compare', help='Compare chunking strategies')
    compare_parser.add_argument('input_file', help='Input text file to chunk')
    compare_parser.add_argument('--strategies', '-s', nargs='+', 
                              default=['sentence', 'paragraph', 'section', 'semantic'],
                              help='Chunking strategies to compare')
    compare_parser.add_argument('--output', '-out', help='Output file for comparison results')
    compare_parser.add_argument('--visualize', '-v', action='store_true', 
                              help='Visualize comparison results')
    
    # Analyze command
    analyze_parser = subparsers.add_parser('analyze', help='Analyze existing chunks')
    analyze_parser.add_argument('input_file', help='JSON file containing chunks')
    analyze_parser.add_argument('--visualize', '-v', action='store_true', 
                              help='Visualize chunking results')
    
    # Parse arguments
    args = parser.parse_args()
    
    # If no command is provided, show help
    if not args.command:
        parser.print_help()
        sys.exit(1)
        
    # Handle commands
    if args.command == 'chunk':
        # Read input file
        with open(args.input_file, 'r', encoding='utf-8') as f:
            text = f.read()
        
        # Chunk the text
        chunks = chunk_transcript(
            text, 
            chunk_size=args.chunk_size,
            overlap=args.overlap,
            strategy=args.strategy,
            max_chars_per_chunk=args.max_chars
        )
        
        # Analyze chunks
        analysis = analyze_chunking_quality(chunks)
        token_estimate = estimate_embedding_tokens(chunks)
        
        # Print analysis
        print(f"\nChunking Results ({args.strategy} strategy):")
        print(f"- Chunk count: {len(chunks)}")
        print(f"- Average chunk length: {analysis['avg_chunk_length']:.1f} characters")
        print(f"- Min chunk length: {analysis['min_chunk_length']} characters")
        print(f"- Max chunk length: {analysis['max_chunk_length']} characters")
        print(f"- Standard deviation: {analysis['chunk_length_std']:.1f} characters")
        print(f"- Estimated tokens: {token_estimate['estimated_tokens']}")
        print(f"- Estimated cost: ${token_estimate['estimated_cost_usd']:.6f} USD")
        
        if analysis['possible_issues']:
            print("\nPossible issues:")
            for issue in analysis['possible_issues']:
                print(f"- {issue}")
        
        # Save chunks if output file specified
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump({
                    "chunks": chunks,
                    "analysis": analysis,
                    "token_estimate": token_estimate
                }, f, indent=2)
            print(f"\nChunks saved to {args.output}")
        
        # Visualize if requested
        if args.visualize:
            try:
                visualize_chunking(chunks)
            except ImportError:
                print("\nVisualization requires matplotlib. Install it with 'pip install matplotlib'.")
    
    elif args.command == 'compare':
        # Read input file
        with open(args.input_file, 'r', encoding='utf-8') as f:
            text = f.read()
        
        # Compare chunking strategies
        results = compare_strategies(text, args.strategies, args.output)
        
        # Visualize if requested
        if args.visualize:
            try:
                import matplotlib.pyplot as plt
                import numpy as np
                
                # Create comparison visualization
                strategies = list(results.keys())
                chunk_counts = [results[s]["chunk_count"] for s in strategies]
                avg_lengths = [results[s]["avg_chunk_length"] for s in strategies]
                
                fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 6))
                
                # Chunk count comparison
                ax1.bar(strategies, chunk_counts, color='royalblue')
                ax1.set_title('Number of Chunks by Strategy')
                ax1.set_ylabel('Chunk Count')
                ax1.set_ylim(bottom=0)
                
                # Average length comparison
                ax2.bar(strategies, avg_lengths, color='salmon')
                ax2.set_title('Average Chunk Length by Strategy')
                ax2.set_ylabel('Characters')
                ax2.set_ylim(bottom=0)
                
                plt.tight_layout()
                plt.show()
            except ImportError:
                print("\nVisualization requires matplotlib. Install it with 'pip install matplotlib'.")
    
    elif args.command == 'analyze':
        try:
            # Read input file with chunks
            with open(args.input_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Extract chunks based on file structure
            if isinstance(data, list):
                chunks = data
            elif isinstance(data, dict) and 'chunks' in data:
                chunks = data['chunks']
            else:
                print("Error: Input file must contain a list of chunks or a dictionary with a 'chunks' field.")
                sys.exit(1)
            
            # Validate chunks
            if not all(isinstance(chunk, str) for chunk in chunks):
                print("Error: All chunks must be strings.")
                sys.exit(1)
            
            # Analyze chunks
            analysis = analyze_chunking_quality(chunks)
            token_estimate = estimate_embedding_tokens(chunks)
            
            # Print analysis
            print(f"\nChunk Analysis:")
            print(f"- Chunk count: {len(chunks)}")
            print(f"- Average chunk length: {analysis['avg_chunk_length']:.1f} characters")
            print(f"- Min chunk length: {analysis['min_chunk_length']} characters")
            print(f"- Max chunk length: {analysis['max_chunk_length']} characters")
            print(f"- Standard deviation: {analysis['chunk_length_std']:.1f} characters")
            print(f"- Estimated tokens: {token_estimate['estimated_tokens']}")
            print(f"- Estimated cost: ${token_estimate['estimated_cost_usd']:.6f} USD")
            
            if analysis['possible_issues']:
                print("\nPossible issues:")
                for issue in analysis['possible_issues']:
                    print(f"- {issue}")
            
            # Visualize if requested
            if args.visualize:
                try:
                    visualize_chunking(chunks)
                except ImportError:
                    print("\nVisualization requires matplotlib. Install it with 'pip install matplotlib'.")
        except json.JSONDecodeError:
            print("Error: Input file is not valid JSON.")
            sys.exit(1)
            
if __name__ == "__main__":
    main()

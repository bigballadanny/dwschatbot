
"""
Command-line tools for testing and analyzing chunking strategies.
"""

import argparse
import os
import sys
import pandas as pd
from typing import List, Dict, Any
from LightRAG.chunking import (
    chunk_transcript, 
    analyze_chunking_quality, 
    estimate_embedding_tokens
)
from LightRAG.visualization import (
    plot_chunk_distribution,
    compare_chunking_strategies,
    visualize_chunk_overlap
)
from LightRAG.utils import load_env

def main():
    """Main entry point for the chunking tools CLI."""
    parser = argparse.ArgumentParser(
        description="LightRAG Chunking Analysis Tools",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Analyze command
    analyze_parser = subparsers.add_parser(
        "analyze", 
        help="Analyze a text file using different chunking strategies"
    )
    analyze_parser.add_argument(
        "file", 
        help="Path to text file to analyze"
    )
    analyze_parser.add_argument(
        "--strategies", 
        nargs="+", 
        default=["sentence", "paragraph", "section"],
        help="Chunking strategies to analyze"
    )
    analyze_parser.add_argument(
        "--chunk-size", 
        type=int, 
        default=5,
        help="Sentences per chunk (for sentence strategy)"
    )
    analyze_parser.add_argument(
        "--overlap", 
        type=int, 
        default=1,
        help="Overlap size (for sentence strategy)"
    )
    analyze_parser.add_argument(
        "--visualize", 
        action="store_true",
        help="Generate visualizations"
    )
    
    # Rechunk command
    rechunk_parser = subparsers.add_parser(
        "rechunk", 
        help="Re-chunk an existing transcript"
    )
    rechunk_parser.add_argument(
        "transcript_id", 
        help="ID of transcript to rechunk"
    )
    rechunk_parser.add_argument(
        "--strategy", 
        default="sentence",
        choices=["sentence", "paragraph", "section"],
        help="Chunking strategy to use"
    )
    rechunk_parser.add_argument(
        "--chunk-size", 
        type=int, 
        default=5,
        help="Sentences per chunk (for sentence strategy)"
    )
    rechunk_parser.add_argument(
        "--overlap", 
        type=int, 
        default=1,
        help="Overlap size (for sentence strategy)"
    )
    
    # Process arguments
    args = parser.parse_args()
    
    # Load environment variables
    load_env()
    
    if args.command == "analyze":
        analyze_text_file(
            args.file,
            args.strategies,
            args.chunk_size,
            args.overlap,
            args.visualize
        )
    elif args.command == "rechunk":
        from LightRAG.ingest_pipeline import rechunk_transcript
        
        success = rechunk_transcript(
            args.transcript_id,
            args.chunk_size,
            args.overlap,
            args.strategy
        )
        
        if success:
            print(f"Successfully re-chunked transcript {args.transcript_id}")
        else:
            print(f"Failed to re-chunk transcript {args.transcript_id}")
            sys.exit(1)
    else:
        parser.print_help()

def analyze_text_file(
    file_path: str,
    strategies: List[str],
    chunk_size: int,
    overlap: int,
    visualize: bool
) -> None:
    """
    Analyze a text file using different chunking strategies.
    
    Args:
        file_path: Path to text file
        strategies: List of chunking strategies to analyze
        chunk_size: Sentences per chunk (for sentence strategy)
        overlap: Overlap size (for sentence strategy)
        visualize: Whether to generate visualizations
    """
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        sys.exit(1)
        
    # Read the file
    with open(file_path, 'r') as f:
        text = f.read()
        
    # Compare chunking strategies
    print(f"Analyzing file: {file_path}")
    print(f"File size: {len(text)} characters")
    
    comparison = compare_chunking_strategies(
        text,
        strategies,
        chunk_size,
        overlap
    )
    
    # Display comparison results
    print("\nChunking Strategy Comparison:")
    print(comparison.to_string(index=False))
    
    # Generate visualizations if requested
    if visualize:
        try:
            import matplotlib.pyplot as plt
            
            print("\nGenerating visualizations...")
            
            for strategy in strategies:
                chunks = chunk_transcript(
                    text, 
                    chunk_size=chunk_size, 
                    overlap=overlap, 
                    strategy=strategy
                )
                
                plot_chunk_distribution(chunks, f"{strategy.title()} Chunking Distribution")
                
                if len(chunks) > 1:
                    visualize_chunk_overlap(chunks[:10])  # Visualize first 10 chunks for clarity
            
            plt.show()
            
        except ImportError:
            print("\nVisualization requires matplotlib. Please install it with:")
            print("pip install matplotlib")
    
    # Show token usage estimates
    print("\nToken Usage Estimates:")
    
    for strategy in strategies:
        chunks = chunk_transcript(
            text, 
            chunk_size=chunk_size, 
            overlap=overlap, 
            strategy=strategy
        )
        
        estimate = estimate_embedding_tokens(chunks)
        
        print(f"\n{strategy.title()} Strategy:")
        print(f"  Chunk count: {estimate['chunk_count']}")
        print(f"  Total characters: {estimate['total_characters']}")
        print(f"  Estimated tokens: {estimate['estimated_tokens']}")
        print(f"  Estimated cost: ${estimate['estimated_cost_usd']:.6f}")

if __name__ == "__main__":
    main()

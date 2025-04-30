
"""
Tests for the chunking visualization functionality.
"""

import os
import pytest
import tempfile
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for CI environments
import matplotlib.pyplot as plt

from LightRAG.chunking import chunk_transcript, analyze_chunking_quality
from LightRAG.visualization import plot_chunk_distribution, plot_chunk_overlap, plot_chunk_heatmap

# Sample text for testing
SAMPLE_TEXT = """
The quick brown fox jumps over the lazy dog. This is a second sentence.
This is a third sentence with more content for testing chunking.

This is a new paragraph. It has a few sentences as well.
We want to visualize how the chunking algorithm works.

# This is a section header
This is content under a section header. The chunking algorithm should 
recognize this as a potential section boundary.

## Subsection
More content in a subsection. Testing if the chunking works as expected.
"""

class TestChunkingVisualization:
    """Tests for the chunking visualization functionality."""
    
    def test_plot_chunk_distribution(self):
        """Test chunk distribution visualization."""
        # Generate chunks
        chunks = chunk_transcript(SAMPLE_TEXT, strategy="sentence", chunk_size=2, overlap=1)
        
        # Create a temporary file for the plot
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp_file:
            try:
                # Plot and save
                plot_chunk_distribution(chunks, save_path=temp_file.name)
                
                # Verify file was created
                assert os.path.exists(temp_file.name)
                assert os.path.getsize(temp_file.name) > 0
            finally:
                # Clean up
                plt.close()
                if os.path.exists(temp_file.name):
                    os.unlink(temp_file.name)

    def test_plot_chunk_overlap(self):
        """Test chunk overlap visualization."""
        # Generate chunks with overlap
        chunks = chunk_transcript(SAMPLE_TEXT, strategy="sentence", chunk_size=3, overlap=1)
        
        # Create a temporary file for the plot
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp_file:
            try:
                # Plot and save
                plot_chunk_overlap(SAMPLE_TEXT, chunks, save_path=temp_file.name)
                
                # Verify file was created
                assert os.path.exists(temp_file.name)
                assert os.path.getsize(temp_file.name) > 0
            finally:
                # Clean up
                plt.close()
                if os.path.exists(temp_file.name):
                    os.unlink(temp_file.name)

    def test_plot_chunk_heatmap(self):
        """Test chunk heatmap visualization."""
        # Generate chunks
        chunks = chunk_transcript(SAMPLE_TEXT, strategy="paragraph")
        
        # Generate chunk analysis
        analysis = analyze_chunking_quality(chunks)
        
        # Create a temporary file for the plot
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp_file:
            try:
                # Plot and save
                plot_chunk_heatmap(chunks, analysis, save_path=temp_file.name)
                
                # Verify file was created
                assert os.path.exists(temp_file.name)
                assert os.path.getsize(temp_file.name) > 0
            finally:
                # Clean up
                plt.close()
                if os.path.exists(temp_file.name):
                    os.unlink(temp_file.name)
    
    def test_multiple_chunking_strategies_comparison(self):
        """Test comparing multiple chunking strategies."""
        # Generate chunks with different strategies
        sentence_chunks = chunk_transcript(SAMPLE_TEXT, strategy="sentence")
        paragraph_chunks = chunk_transcript(SAMPLE_TEXT, strategy="paragraph")
        section_chunks = chunk_transcript(SAMPLE_TEXT, strategy="section")
        
        # Create a figure with subplots
        fig, axs = plt.subplots(3, 1, figsize=(10, 15))
        
        # Create a temporary file for the plot
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp_file:
            try:
                # Plot chunk lengths for each strategy
                strategies = ["Sentence", "Paragraph", "Section"]
                chunks_list = [sentence_chunks, paragraph_chunks, section_chunks]
                
                for i, (strategy, chunks) in enumerate(zip(strategies, chunks_list)):
                    lengths = [len(chunk) for chunk in chunks]
                    axs[i].bar(range(len(chunks)), lengths)
                    axs[i].set_title(f"{strategy} Chunking - {len(chunks)} chunks")
                    axs[i].set_xlabel("Chunk Index")
                    axs[i].set_ylabel("Length (chars)")
                
                plt.tight_layout()
                plt.savefig(temp_file.name)
                
                # Verify file was created
                assert os.path.exists(temp_file.name)
                assert os.path.getsize(temp_file.name) > 0
            finally:
                # Clean up
                plt.close()
                if os.path.exists(temp_file.name):
                    os.unlink(temp_file.name)

if __name__ == "__main__":
    # This allows running the tests directly with python
    pytest.main(["-xvs", __file__])

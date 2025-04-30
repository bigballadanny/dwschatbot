
"""
RAG Pipeline: Handles transcript ingestion, chunking, embedding, and storage.
"""

from typing import List

def chunk_transcript(transcript: str, chunk_size: int = 2) -> List[str]:
    """
    Split a transcript into chunks for embedding.

    Args:
        transcript (str): The full transcript text.
        chunk_size (int): Number of sentences per chunk.

    Returns:
        List[str]: List of transcript chunks.
    """
    sentences = transcript.split('.')
    sentences = [s.strip() for s in sentences if s.strip()]
    chunks = []
    for i in range(0, len(sentences), chunk_size):
        chunk = '. '.join(sentences[i:i+chunk_size]) + '.'
        chunks.append(chunk)
    return chunks

# Additional ingestion and embedding logic would go here.

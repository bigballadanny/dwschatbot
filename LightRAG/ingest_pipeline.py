
"""
Pipeline to upload transcript, store metadata, chunk & embed, and store embeddings.
"""

import os
from LightRAG.rag_pipeline import chunk_transcript
from LightRAG.supabase_client import upload_file, insert_metadata
from LightRAG.mem0_client import Mem0Client

def ingest_transcript(file_path: str, bucket: str, table: str, topic: str = None):
    # Upload file to Supabase Storage
    dest_path = os.path.basename(file_path)
    upload_file(bucket, file_path, dest_path)

    # Insert metadata
    metadata = {"filename": dest_path, "topic": topic}
    insert_metadata(table, metadata)

    # Chunk and embed
    with open(file_path, "r") as f:
        transcript = f.read()
    chunks = chunk_transcript(transcript)
    mem0 = Mem0Client()
    for chunk in chunks:
        embedding = {"text": chunk, "topic": topic}
        mem0.store_embedding(embedding)


"""
Pipeline to upload transcript, store metadata, chunk & embed, and store embeddings.
"""

import os
import logging
import uuid
from datetime import datetime
from LightRAG.rag_pipeline import chunk_transcript
from LightRAG.supabase_client import upload_file, insert_metadata, get_supabase_client
from LightRAG.pgvector_client import PGVectorClient
from LightRAG.utils import load_env

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def ingest_transcript(file_path: str, bucket: str = "transcripts", table: str = "transcripts", topic: str = None, user_id: str = None):
    """
    Ingest a transcript file: upload to storage, store metadata, and create embeddings.
    
    Args:
        file_path: Path to the transcript file
        bucket: Supabase storage bucket name
        table: Supabase table name (default: "transcripts")
        topic: Optional topic classifier for the transcript
        user_id: Optional user ID to associate with the transcript
    """
    # Ensure environment variables are loaded
    load_env()
    
    logger.info(f"Starting ingestion for file: {file_path}")
    
    try:
        # Generate a unique ID for this transcript
        transcript_id = str(uuid.uuid4())
        dest_path = os.path.basename(file_path)
        
        # Upload file to Supabase Storage
        logger.info(f"Uploading file to {bucket}/{dest_path}")
        upload_file(bucket, file_path, dest_path)
        
        # Extract transcript content
        with open(file_path, "r") as f:
            transcript_content = f.read()
            
        # Create transcript title from filename
        title = os.path.splitext(os.path.basename(file_path))[0].replace("_", " ").title()
        
        # Insert metadata to the transcripts table
        logger.info(f"Storing metadata in {table} table")
        metadata = {
            "id": transcript_id,
            "title": title, 
            "content": transcript_content,
            "file_path": dest_path,
            "tags": [topic] if topic else None,
            "is_processed": False,
            "is_summarized": False,
            "created_at": datetime.now().isoformat(),
            "user_id": user_id
        }
        
        insert_metadata(table, metadata)
        
        # Chunk and embed
        logger.info("Chunking transcript and creating embeddings")
        chunks = chunk_transcript(transcript_content)
        
        pgvector = PGVectorClient()
        chunk_count = 0
        for chunk in chunks:
            embedding = {
                "text": chunk, 
                "metadata": {
                    "transcript_id": transcript_id,
                    "topic": topic,
                    "source": dest_path,
                    "user_id": user_id
                }
            }
            pgvector.store_embedding(embedding)
            chunk_count += 1
        
        # Update transcript record to mark as processed
        logger.info(f"Created {chunk_count} embeddings")
        supabase = get_supabase_client()
        supabase.table(table).update({"is_processed": True}).eq("id", transcript_id).execute()
        
        logger.info(f"Successfully ingested transcript: {dest_path}")
        return transcript_id
    
    except Exception as e:
        logger.error(f"Error during ingestion: {str(e)}")
        raise

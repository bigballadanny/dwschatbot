
"""
Pipeline to upload transcript, store metadata, chunk & embed, and store embeddings.
"""

import os
import logging
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from LightRAG.chunking import chunk_transcript, analyze_chunking_quality
from LightRAG.supabase_client import upload_file, insert_metadata, get_supabase_client
from LightRAG.pgvector_client import PGVectorClient
from LightRAG.utils import load_env

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def ingest_transcript(file_path: str, bucket: str = "transcripts", table: str = "transcripts", 
                     topic: str = None, user_id: str = None, 
                     chunk_size: int = 5, chunk_overlap: int = 1,
                     chunking_strategy: str = 'sentence') -> str:
    """
    Ingest a transcript file: upload to storage, store metadata, chunk and create embeddings.
    
    Args:
        file_path: Path to the transcript file
        bucket: Supabase storage bucket name
        table: Supabase table name (default: "transcripts")
        topic: Optional topic classifier for the transcript
        user_id: Optional user ID to associate with the transcript
        chunk_size: Number of sentences per chunk
        chunk_overlap: Number of sentences to overlap between chunks
        chunking_strategy: Strategy to use for chunking ('sentence', 'paragraph', 'section')
        
    Returns:
        String transcript ID
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
            "user_id": user_id,
            "source": topic or "other"
        }
        
        insert_metadata(table, metadata)
        
        # Chunk transcript with configurable parameters
        logger.info(f"Chunking transcript with strategy={chunking_strategy}, size={chunk_size}, overlap={chunk_overlap}")
        chunks = chunk_transcript(
            transcript_content, 
            chunk_size=chunk_size, 
            overlap=chunk_overlap,
            strategy=chunking_strategy
        )
        
        # Log chunking quality metrics
        quality_metrics = analyze_chunking_quality(chunks)
        logger.info(f"Chunking quality: {quality_metrics}")
        if quality_metrics['possible_issues'] and quality_metrics['possible_issues'][0] != "No issues detected":
            logger.warning(f"Chunking issues: {quality_metrics['possible_issues']}")
        
        # Store chunks in PGVector
        pgvector = PGVectorClient()
        chunk_count = 0
        for i, chunk in enumerate(chunks):
            embedding = {
                "text": chunk, 
                "metadata": {
                    "transcript_id": transcript_id,
                    "topic": topic,
                    "source": dest_path,
                    "chunk_index": i,
                    "chunk_count": len(chunks),
                    "chunking_strategy": chunking_strategy,
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

def rechunk_transcript(transcript_id: str, chunk_size: int = 5, chunk_overlap: int = 1,
                     chunking_strategy: str = 'sentence') -> bool:
    """
    Re-chunk an existing transcript with new chunking parameters.
    
    This function retrieves the transcript content, deletes old embeddings,
    and creates new chunks with the specified parameters.
    
    Args:
        transcript_id: ID of the transcript to re-chunk
        chunk_size: New number of sentences per chunk
        chunk_overlap: New number of sentences to overlap between chunks
        chunking_strategy: Strategy to use for chunking ('sentence', 'paragraph', 'section')
        
    Returns:
        Boolean success status
    """
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        
        # First, retrieve the transcript content
        logger.info(f"Retrieving transcript {transcript_id} for re-chunking")
        result = supabase.table("transcripts").select("content", "title", "user_id", "tags", "file_path").eq("id", transcript_id).execute()
        
        if not result.data or len(result.data) == 0:
            logger.error(f"Transcript not found: {transcript_id}")
            return False
        
        transcript = result.data[0]
        content = transcript.get("content")
        user_id = transcript.get("user_id")
        topic = transcript.get("tags")[0] if transcript.get("tags") else None
        dest_path = transcript.get("file_path")
        
        if not content:
            logger.error(f"Empty content for transcript: {transcript_id}")
            return False
        
        # Delete existing embeddings for this transcript
        pgvector = PGVectorClient()
        logger.info(f"Removing old embeddings for transcript: {transcript_id}")
        pgvector.delete_embeddings_by_metadata({"transcript_id": transcript_id})
        
        # Create new chunks with the updated parameters
        logger.info(f"Re-chunking transcript with strategy={chunking_strategy}, size={chunk_size}, overlap={chunk_overlap}")
        chunks = chunk_transcript(
            content, 
            chunk_size=chunk_size, 
            overlap=chunk_overlap,
            strategy=chunking_strategy
        )
        
        # Log chunking quality metrics
        quality_metrics = analyze_chunking_quality(chunks)
        logger.info(f"New chunking quality: {quality_metrics}")
        
        # Store new chunks in PGVector
        chunk_count = 0
        for i, chunk in enumerate(chunks):
            embedding = {
                "text": chunk, 
                "metadata": {
                    "transcript_id": transcript_id,
                    "topic": topic,
                    "source": dest_path,
                    "chunk_index": i,
                    "chunk_count": len(chunks),
                    "chunking_strategy": chunking_strategy,
                    "user_id": user_id,
                    "rechunked": True
                }
            }
            pgvector.store_embedding(embedding)
            chunk_count += 1
        
        # Update the transcript record
        logger.info(f"Created {chunk_count} new embeddings")
        supabase.table("transcripts").update({
            "updated_at": datetime.now().isoformat(),
            "is_processed": True
        }).eq("id", transcript_id).execute()
        
        return True
        
    except Exception as e:
        logger.error(f"Error during re-chunking: {str(e)}")
        return False

def batch_rechunk_transcripts(chunk_size: int = 5, chunk_overlap: int = 1,
                           chunking_strategy: str = 'sentence') -> Dict[str, Any]:
    """
    Re-chunk all existing transcripts with new chunking parameters.
    
    Args:
        chunk_size: New number of sentences per chunk
        chunk_overlap: New number of sentences to overlap between chunks
        chunking_strategy: Strategy to use for chunking ('sentence', 'paragraph', 'section')
        
    Returns:
        Dictionary with success and failure counts
    """
    supabase = get_supabase_client()
    result = supabase.table("transcripts").select("id").execute()
    
    if not result.data:
        return {"success": 0, "failure": 0, "total": 0}
    
    transcript_ids = [t["id"] for t in result.data]
    success_count = 0
    failure_count = 0
    
    for transcript_id in transcript_ids:
        success = rechunk_transcript(
            transcript_id, 
            chunk_size, 
            chunk_overlap,
            chunking_strategy
        )
        if success:
            success_count += 1
        else:
            failure_count += 1
            
    return {
        "success": success_count,
        "failure": failure_count,
        "total": len(transcript_ids)
    }

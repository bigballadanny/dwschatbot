
"""
Pipeline to upload transcript, store metadata, chunk & embed, and store embeddings.
"""

import os
import logging
import uuid
from datetime import datetime
import hashlib
import tempfile
import requests
from typing import List, Dict, Any, Optional
from LightRAG.chunking import chunk_transcript, analyze_chunking_quality
from LightRAG.supabase_client import upload_file, insert_metadata, get_supabase_client, get_transcripts, generate_public_url
from LightRAG.pgvector_client import PGVectorClient
from LightRAG.utils import load_env

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def calculate_file_hash(file_path: str) -> str:
    """
    Calculate SHA-256 hash of a file.
    
    Args:
        file_path: Path to the file
        
    Returns:
        Hash of the file as a hex string
    """
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def calculate_content_hash(content: str) -> str:
    """
    Calculate SHA-256 hash of text content.
    
    Args:
        content: Text content to hash
        
    Returns:
        Hash of the content as a hex string
    """
    return hashlib.sha256(content.encode('utf-8')).hexdigest()

def download_from_supabase(bucket: str, file_path: str) -> str:
    """
    Download a file from Supabase Storage to a local temporary file.
    
    Args:
        bucket: Storage bucket name
        file_path: Path to the file in the bucket
        
    Returns:
        Path to the local temporary file
    """
    client = get_supabase_client()
    public_url = generate_public_url(bucket, file_path)
    
    try:
        # Create a temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file_path)[1])
        temp_file_path = temp_file.name
        temp_file.close()
        
        # Download the file using requests to the temporary location
        response = requests.get(public_url, stream=True)
        response.raise_for_status()
        
        with open(temp_file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                
        logger.info(f"Downloaded {public_url} to {temp_file_path}")
        return temp_file_path
    except Exception as e:
        logger.error(f"Error downloading file from Supabase: {str(e)}")
        raise

def check_duplicate_content(content: str) -> Optional[str]:
    """
    Check if content already exists in the transcripts table.
    
    Args:
        content: Content to check for duplicates
        
    Returns:
        ID of the duplicate transcript if found, None otherwise
    """
    content_hash = calculate_content_hash(content)
    client = get_supabase_client()
    
    try:
        # Check for existing content with the same hash
        # Note: This assumes we store content_hash in the metadata
        result = client.table("transcripts").select("id").eq("metadata->content_hash", content_hash).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]["id"]
        return None
    except Exception as e:
        logger.warning(f"Error checking for duplicate content: {str(e)}")
        return None

def ingest_transcript(file_path: str, bucket: str = "transcripts", table: str = "transcripts", 
                     topic: str = None, user_id: str = None, 
                     chunk_size: int = 5, chunk_overlap: int = 1,
                     chunking_strategy: str = 'sentence',
                     check_duplicates: bool = True) -> str:
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
        check_duplicates: Whether to check for duplicate content
        
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
        
        # Upload file to Supabase Storage if it's a local file (not a URL)
        if not file_path.startswith(('http://', 'https://')):
            logger.info(f"Uploading file to {bucket}/{dest_path}")
            upload_file(bucket, file_path, dest_path)
        else:
            # If it's a URL, assume it's already in storage
            dest_path = file_path.split('/')[-1]
            logger.info(f"File already in storage: {dest_path}")
            
        # Extract transcript content
        with open(file_path, "r") as f:
            transcript_content = f.read()
            
        # Check for duplicates if requested
        if check_duplicates:
            content_hash = calculate_content_hash(transcript_content)
            duplicate_id = check_duplicate_content(transcript_content)
            
            if duplicate_id:
                logger.info(f"Duplicate content found with ID: {duplicate_id}")
                return duplicate_id
        else:
            content_hash = None
                
        # Create transcript title from filename
        title = os.path.splitext(os.path.basename(file_path))[0].replace("_", " ").title()
        
        # Prepare metadata with content hash
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
            "source": topic or "other",
            "metadata": {
                "content_hash": content_hash,
                "original_filename": os.path.basename(file_path)
            } if content_hash else {
                "original_filename": os.path.basename(file_path)
            }
        }
        
        # Insert metadata to the transcripts table
        logger.info(f"Storing metadata in {table} table")
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

def process_existing_transcript(transcript_id: str, bucket: str = "transcripts",
                             chunk_size: int = 5, chunk_overlap: int = 1,
                             chunking_strategy: str = 'sentence') -> bool:
    """
    Process an already uploaded transcript from Supabase storage.
    
    Args:
        transcript_id: ID of the transcript to process
        bucket: Storage bucket name
        chunk_size: Number of sentences per chunk
        chunk_overlap: Number of sentences to overlap between chunks
        chunking_strategy: Strategy to use for chunking
        
    Returns:
        Boolean success status
    """
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        
        # Fetch transcript data
        result = supabase.table("transcripts").select("*").eq("id", transcript_id).execute()
        
        if not result.data or len(result.data) == 0:
            logger.error(f"Transcript not found: {transcript_id}")
            return False
        
        transcript = result.data[0]
        
        # Skip if already processed
        if transcript.get("is_processed"):
            logger.info(f"Transcript {transcript_id} already processed, skipping")
            return True
            
        # Download file from Supabase storage to temporary location
        file_path = transcript.get("file_path")
        content = transcript.get("content")
        
        # If we have content, we can process directly
        if content:
            logger.info(f"Processing transcript {transcript_id} with existing content")
            
            # Chunk transcript with configurable parameters
            chunks = chunk_transcript(
                content, 
                chunk_size=chunk_size, 
                overlap=chunk_overlap,
                strategy=chunking_strategy
            )
            
            # Log chunking quality metrics
            quality_metrics = analyze_chunking_quality(chunks)
            logger.info(f"Chunking quality: {quality_metrics}")
            
            # Store chunks in PGVector
            pgvector = PGVectorClient()
            chunk_count = 0
            for i, chunk in enumerate(chunks):
                embedding = {
                    "text": chunk, 
                    "metadata": {
                        "transcript_id": transcript_id,
                        "topic": transcript.get("tags")[0] if transcript.get("tags") else None,
                        "source": file_path,
                        "chunk_index": i,
                        "chunk_count": len(chunks),
                        "chunking_strategy": chunking_strategy,
                        "user_id": transcript.get("user_id")
                    }
                }
                pgvector.store_embedding(embedding)
                chunk_count += 1
            
            # Update transcript record to mark as processed
            logger.info(f"Created {chunk_count} embeddings")
            supabase.table("transcripts").update({"is_processed": True}).eq("id", transcript_id).execute()
            
            return True
        
        # If we don't have content but have a file_path, download and process
        elif file_path:
            # Download file from storage
            logger.info(f"Downloading transcript {transcript_id} from storage: {file_path}")
            local_path = download_from_supabase(bucket, file_path)
            try:
                # Read content
                with open(local_path, "r") as f:
                    content = f.read()
                    
                # Update transcript content
                supabase.table("transcripts").update({"content": content}).eq("id", transcript_id).execute()
                
                # Process the transcript now that we have content
                chunks = chunk_transcript(
                    content, 
                    chunk_size=chunk_size, 
                    overlap=chunk_overlap,
                    strategy=chunking_strategy
                )
                
                # Store chunks in PGVector
                pgvector = PGVectorClient()
                chunk_count = 0
                for i, chunk in enumerate(chunks):
                    embedding = {
                        "text": chunk, 
                        "metadata": {
                            "transcript_id": transcript_id,
                            "topic": transcript.get("tags")[0] if transcript.get("tags") else None,
                            "source": file_path,
                            "chunk_index": i,
                            "chunk_count": len(chunks),
                            "chunking_strategy": chunking_strategy,
                            "user_id": transcript.get("user_id")
                        }
                    }
                    pgvector.store_embedding(embedding)
                    chunk_count += 1
                
                # Update transcript record to mark as processed
                logger.info(f"Created {chunk_count} embeddings")
                supabase.table("transcripts").update({"is_processed": True}).eq("id", transcript_id).execute()
                
                return True
            finally:
                # Clean up temporary file
                if os.path.exists(local_path):
                    os.unlink(local_path)
        else:
            logger.error(f"Transcript {transcript_id} has no content or file_path")
            return False
    
    except Exception as e:
        logger.error(f"Error processing existing transcript {transcript_id}: {str(e)}")
        return False

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


"""
Supabase client for file upload and metadata storage.
"""

from supabase import create_client, Client
import os
import logging
from typing import Dict, Any, Optional
from LightRAG.utils import load_env

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_supabase_client() -> Client:
    """
    Get a configured Supabase client.
    
    Returns:
        Supabase Client instance
    
    Raises:
        ValueError: If required environment variables are not set
    """
    # Ensure environment variables are loaded
    load_env()
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        logger.error("SUPABASE_URL and SUPABASE_KEY must be set as environment variables.")
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set as environment variables.")
    
    logger.debug(f"Creating Supabase client with URL: {url}")
    return create_client(url, key)

def upload_file(bucket: str, file_path: str, dest_path: str) -> Dict[str, Any]:
    """
    Upload a file to Supabase Storage.
    
    Args:
        bucket: Storage bucket name
        file_path: Path to the file to upload
        dest_path: Destination path in the bucket
    
    Returns:
        Upload response from Supabase
    """
    client = get_supabase_client()
    
    try:
        logger.info(f"Uploading {file_path} to {bucket}/{dest_path}")
        with open(file_path, "rb") as f:
            res = client.storage.from_(bucket).upload(dest_path, f)
        logger.info(f"Upload successful: {dest_path}")
        return res
    except Exception as e:
        logger.error(f"Error uploading file to Supabase Storage: {str(e)}")
        raise

def insert_metadata(table: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
    """
    Insert metadata into Supabase database.
    
    Args:
        table: Table name
        metadata: Dictionary of metadata to insert
    
    Returns:
        Insert response from Supabase
    """
    client = get_supabase_client()
    
    try:
        logger.info(f"Inserting metadata into {table} table")
        res = client.table(table).insert(metadata).execute()
        if hasattr(res, 'error') and res.error:
            logger.error(f"Error inserting metadata: {res.error}")
            raise Exception(f"Supabase error: {res.error}")
        logger.info(f"Metadata inserted successfully")
        return res
    except Exception as e:
        logger.error(f"Error inserting metadata into Supabase: {str(e)}")
        raise

def get_transcripts(limit: int = 100, topic: Optional[str] = None) -> Dict[str, Any]:
    """
    Get transcripts from the database, optionally filtered by topic.
    
    Args:
        limit: Maximum number of transcripts to return
        topic: Optional topic to filter by
    
    Returns:
        Query response from Supabase
    """
    client = get_supabase_client()
    
    try:
        query = client.table("transcripts").select("*").limit(limit)
        
        if topic:
            # Filter by topic if provided (assuming tags is an array containing the topic)
            query = query.contains('tags', [topic])
            
        res = query.execute()
        return res
    except Exception as e:
        logger.error(f"Error fetching transcripts from Supabase: {str(e)}")
        return {"data": [], "error": str(e)}

def healthcheck() -> bool:
    """
    Check if the Supabase service is available.
    
    Returns:
        True if the service is available, False otherwise
    """
    try:
        client = get_supabase_client()
        # Just fetch a single row from any table to test connection
        client.table("transcripts").select("id").limit(1).execute()
        return True
    except Exception:
        return False

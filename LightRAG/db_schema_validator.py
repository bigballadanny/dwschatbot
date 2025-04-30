
"""
Database schema validator for ensuring database compatibility.
"""

import sys
import logging
from typing import Dict, Any, List
from LightRAG.supabase_client import get_supabase_client
from LightRAG.utils import load_env

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def validate_transcripts_table():
    """
    Validate that the transcripts table exists and has the expected columns.
    
    Returns:
        Tuple of (bool, str): True if valid, False if not; and a message
    """
    load_env()
    client = get_supabase_client()
    
    try:
        # Check if transcripts table exists
        res = client.table("transcripts").select("*").limit(1).execute()
        
        # If we get here, the table exists, now check columns
        required_columns = [
            "id", "title", "content", "file_path", "tags", 
            "is_processed", "is_summarized", "user_id"
        ]
        
        # Fetch column info using pg_catalog (note: this assumes admin access)
        # If this doesn't work, we'd fall back to inferring from a sample row
        schema_query = """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'transcripts'
        """
        
        db_response = client.rpc("execute_sql", {"sql": schema_query}).execute()
        
        if hasattr(db_response, 'error') and db_response.error:
            # Fall back to inferring from a sample row
            if len(res.data) > 0:
                available_columns = list(res.data[0].keys())
            else:
                return False, "Couldn't validate transcripts table schema - no rows available"
        else:
            available_columns = [row['column_name'] for row in db_response.data]
        
        missing_columns = [col for col in required_columns if col not in available_columns]
        
        if missing_columns:
            return False, f"Missing required columns in transcripts table: {', '.join(missing_columns)}"
        
        return True, "Transcripts table schema is valid"
    
    except Exception as e:
        return False, f"Error validating transcripts table: {str(e)}"

def list_available_tables():
    """
    List all available tables in the Supabase database.
    
    Returns:
        List of table names
    """
    load_env()
    client = get_supabase_client()
    
    try:
        db_response = client.rpc("execute_sql", {
            "sql": """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            """
        }).execute()
        
        if hasattr(db_response, 'error') and db_response.error:
            logger.error(f"Error listing tables: {db_response.error}")
            return []
            
        return [row['table_name'] for row in db_response.data]
    except Exception as e:
        logger.error(f"Error listing tables: {str(e)}")
        return []

def main():
    """Command-line interface for schema validation."""
    load_env()
    
    print("🔍 Validating database schema...")
    
    # List available tables
    tables = list_available_tables()
    print(f"\nAvailable tables: {', '.join(tables) if tables else 'None found'}")
    
    # Validate transcripts table
    is_valid, message = validate_transcripts_table()
    
    if is_valid:
        print("\n✅ Transcripts table validation successful!")
    else:
        print(f"\n❌ Transcripts table validation failed: {message}")
        print("\nMake sure your Supabase database has the expected schema and you have the correct access permissions.")

if __name__ == "__main__":
    main()

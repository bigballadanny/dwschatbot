
#!/usr/bin/env python3
"""
Standalone script to process a transcript file.
This can be invoked by serverless functions or run directly.
"""

import sys
import os
import json
import argparse
import logging
from datetime import datetime
from LightRAG.ingest_pipeline import process_existing_transcript
from LightRAG.utils import load_env

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def process_file_from_args():
    """Process a file based on command line arguments."""
    parser = argparse.ArgumentParser(description="Process a transcript file already in storage.")
    parser.add_argument("--transcript-id", required=True, help="ID of the transcript to process")
    parser.add_argument("--chunk-size", type=int, default=5, help="Number of sentences per chunk")
    parser.add_argument("--chunk-overlap", type=int, default=1, help="Number of sentences to overlap")
    parser.add_argument("--chunking-strategy", default="sentence", choices=["sentence", "paragraph", "section"], 
                      help="Strategy for chunking")
    
    args = parser.parse_args()
    
    # Ensure environment variables are loaded
    load_env()
    
    # Process the transcript
    success = process_existing_transcript(
        args.transcript_id,
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap,
        chunking_strategy=args.chunking_strategy
    )
    
    return {
        "success": success,
        "transcript_id": args.transcript_id,
        "timestamp": datetime.now().isoformat()
    }

def process_file_from_event(event):
    """Process a file based on an event payload (for serverless function)."""
    try:
        # Extract parameters from event
        transcript_id = event.get("transcript_id")
        chunk_size = event.get("chunk_size", 5)
        chunk_overlap = event.get("chunk_overlap", 1)
        chunking_strategy = event.get("chunking_strategy", "sentence")
        
        if not transcript_id:
            logger.error("Missing required parameter: transcript_id")
            return {
                "success": False,
                "error": "Missing required parameter: transcript_id"
            }
            
        # Ensure environment variables are loaded
        load_env()
        
        # Process the transcript
        success = process_existing_transcript(
            transcript_id,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            chunking_strategy=chunking_strategy
        )
        
        return {
            "success": success,
            "transcript_id": transcript_id,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

if __name__ == "__main__":
    # Check if being run as a script or as a module
    if len(sys.argv) > 1:
        # Run from command line
        result = process_file_from_args()
        print(json.dumps(result, indent=2))
    else:
        # Being imported as a module
        logger.info("This script can be run directly or imported as a module")

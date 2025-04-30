
"""
Utility functions for the LightRAG system.
"""

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

def load_env(env_path: Optional[Path] = None) -> None:
    """
    Load environment variables from .env file.
    
    Args:
        env_path: Optional path to .env file. If None, will look in current directory.
    """
    # Try to load from provided path, then current dir, then parent dir
    if env_path and env_path.exists():
        load_dotenv(env_path)
    elif Path('.env').exists():
        load_dotenv()
    elif Path('../.env').exists():
        load_dotenv('../.env')
    
    # Validate critical environment variables
    validate_services()

def validate_services() -> dict:
    """
    Validate that all required services have their environment variables set.
    
    Returns:
        Dictionary with service status (True if available, False if not)
    """
    services = {
        'supabase': bool(os.getenv('SUPABASE_URL') and os.getenv('SUPABASE_KEY')),
        'mem0': bool(os.getenv('MEM0_URL')),
        'mem0_api_key': bool(os.getenv('MEM0_API_KEY')),
    }
    
    missing = [svc for svc, status in services.items() if not status]
    if missing:
        print(f"WARNING: Missing environment variables for: {', '.join(missing)}")
    
    return services

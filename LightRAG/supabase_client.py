
"""
Supabase client for file upload and metadata storage.
"""

from supabase import create_client, Client
import os

def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set as environment variables.")
    return create_client(url, key)

def upload_file(bucket: str, file_path: str, dest_path: str):
    client = get_supabase_client()
    with open(file_path, "rb") as f:
        res = client.storage().from_(bucket).upload(dest_path, f)
    return res

def insert_metadata(table: str, metadata: dict):
    client = get_supabase_client()
    res = client.table(table).insert(metadata).execute()
    return res

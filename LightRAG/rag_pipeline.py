"""
Main pipeline for LightRAG: document ingestion, retrieval, and chatbot integration.
"""

import requests
import logging
from typing import List

# Configure logger
logger = logging.getLogger("LightRAG.rag_pipeline")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter('[%(asctime)s] %(levelname)s - %(message)s')
handler.setFormatter(formatter)
if not logger.hasHandlers():
    logger.addHandler(handler)

MEM0_URL = "http://localhost:8050"  # mem0 MCP endpoint (host port 8050)

from .mem0_sse_client import Mem0SSEClient

from supabase import create_client, Client
import os

# ... (existing imports and logger config)


def ingest_documents(
    transcript_path: str,
    title: str,
    participants: list[str],
    meeting_date: str,
    mem0_url: str = MEM0_URL,
    supabase_url: str = "",
    supabase_key: str = ""
) -> None:
    """
    Ingest a transcript into Supabase Storage and metadata DB, chunk and embed it, and store chunks+embeddings in mem0 (Supabase backend).

    Args:
        transcript_path (str): Path to the transcript file.
        title (str): Meeting title.
        participants (list[str]): List of participants.
        meeting_date (str): Date of meeting (ISO format).
        mem0_url (str): mem0 MCP endpoint URL.
        supabase_url (str): Supabase API URL.
        supabase_key (str): Supabase service key.
    """
    # --- 1. Initialize Supabase client ---
    supabase: Client = create_client(supabase_url, supabase_key)

    # --- 2. Upload transcript file to Supabase Storage ---
    # TODO: Set your bucket name here
    BUCKET_NAME = "transcripts"
    file_name = os.path.basename(transcript_path)
    with open(transcript_path, "rb") as f:
        file_data = f.read()
    upload_response = supabase.storage.from_(BUCKET_NAME).upload(file_name, file_data, upsert=True)
    if not upload_response:
        logger.error("Failed to upload transcript to Supabase Storage.")
        return
    file_url = f"{BUCKET_NAME}/{file_name}"

    # --- 3. Store transcript metadata in Supabase ---
    # TODO: Set your table name here
    TABLE_NAME = "transcripts"
    metadata = {
        "title": title,
        "date": meeting_date,
        "participants": participants,
        "file_url": file_url,
        # Add more fields as needed
    }
    insert_response = supabase.table(TABLE_NAME).insert(metadata).execute()
    if not insert_response or not insert_response.data:
        logger.error("Failed to insert transcript metadata into Supabase.")
        return
    transcript_id = insert_response.data[0]["id"]

    # --- 4. Read transcript text ---
    with open(transcript_path, "r", encoding="utf-8") as f:
        transcript_text = f.read()

    # --- 5. Chunk transcript (simple split, replace with better chunker as needed) ---
    chunk_size = 1000  # tokens/chars, configurable
    overlap = 200      # tokens/chars, configurable
    chunks = []
    for i in range(0, len(transcript_text), chunk_size - overlap):
        chunk = transcript_text[i:i+chunk_size]
        if chunk:
            chunks.append(chunk)

    # --- 6. Embed each chunk (replace with your embedding model) ---
    embedded_chunks = []
    for chunk in chunks:
        try:
            embedding = get_openai_embedding(chunk)
            if embedding:
                embedded_chunks.append((chunk, embedding))
            else:
                logger.warning(f"Skipping chunk due to embedding failure.")
        except Exception as e:
            logger.error(f"Error embedding chunk: {e}")
            logger.warning(f"Skipping chunk due to embedding exception.")

    # --- 7. Store each chunk+embedding in mem0 (Supabase backend) ---
    try:
        client = Mem0SSEClient(mem0_url)
        for idx, (chunk, embedding) in enumerate(embedded_chunks):
            memory = {
                "text": chunk,
                "embedding": embedding,
                "transcript_id": transcript_id,
                "chunk_index": idx,
                "title": title,
                "participants": participants,
                "meeting_date": meeting_date,
                "file_url": file_url
            }
            # TODO: Update save_memory to support embedding+metadata if supported by mem0
            result = client.save_memory(chunk)
            logger.info(f"Ingested chunk {idx}: {result}")
    except Exception as e:
        logger.error("Error ingesting transcript chunks to mem0 via SSE: %s", e, exc_info=True)

    logger.info("Ingestion complete for transcript: %s", transcript_path)


def get_openai_embedding(text: str):
    """
    Get the embedding for a text chunk using OpenAI's text-embedding-3-small model.
    Reads the API key from the OPENAI_API_KEY environment variable.
    Returns None on failure.
    """
    import openai
    openai.api_key = os.getenv("OPENAI_API_KEY")
    try:
        response = openai.embeddings.create(
            input=text,
            model="text-embedding-3-small"
        )
        embedding = response.data[0].embedding
        return embedding
    except Exception as e:
        logger.error(f"OpenAI embedding error: {e}")
        return None

def get_openai_query_embedding(query: str) -> list[float]:
    """
    Embed the user query using OpenAI's text-embedding-3-small model.
    Returns a list of floats (embedding vector).
    """
    import openai
    openai.api_key = os.getenv("OPENAI_API_KEY")
    try:
        response = openai.embeddings.create(
            input=query,
            model="text-embedding-3-small"
        )
        embedding = response.data[0].embedding
        return embedding
    except Exception as e:
        logger.error(f"OpenAI embedding error (query): {e}")
        return []


def retrieve_context(query: str, mem0_url: str = MEM0_URL, topic: str = None) -> list:
    """
    Retrieve relevant context chunks from mem0 for a given query using semantic search.
    Optionally filter or rank by topic.

    Args:
        query (str): The user query.
        mem0_url (str): The mem0 MCP endpoint URL.
        topic (str, optional): Topic filter for the search.

    Returns:
        list: Retrieved context chunks (optionally filtered by topic).
    """
    try:
        client = Mem0SSEClient(mem0_url)
        # Embed the user query
        query_embedding = get_openai_query_embedding(query)
        if not query_embedding:
            logger.warning("Query embedding failed, falling back to keyword search.")
            result = client.search_memories(query)
        else:
            # If mem0 supports vector search via embedding, use it (pseudo-API shown)
            # TODO: Update this if your mem0 instance has a specific vector search API
            result = client.call_tool("search_memories_by_embedding", {"embedding": query_embedding, "limit": 10})
            if not result:
                logger.warning("Vector search failed, falling back to keyword search.")
                result = client.search_memories(query)

        # Filter or rank by topic if provided
        if topic:
            filtered = [chunk for chunk in result if topic.lower() in chunk.get("text", "").lower() or topic.lower() in (chunk.get("topic", "") or "").lower()]
            logger.info(f"Filtered {len(filtered)} chunks by topic '{topic}'.")
            return filtered
        logger.info("Retrieved context: %s", result)
        return result
    except Exception as e:
        logger.error("Error retrieving context from mem0 via SSE: %s", e, exc_info=True)
        return []

if __name__ == "__main__":
    """
    CLI/test harness for LightRAG + mem0 SSE integration.
    Ingests a sample document, then retrieves context for a sample query.
    """
    logger.info("--- LightRAG + mem0 SSE Integration Test ---")
    ingest_documents()
    query = "example user query"
    logger.info(f"Retrieving context for query: {query}")
    results = retrieve_context(query)
    logger.info(f"Retrieved context: {results}")
    print("\nPipeline test complete. See logs above for details.")

    # Example usage
    ingest_documents()
    retrieve_context("example user query")

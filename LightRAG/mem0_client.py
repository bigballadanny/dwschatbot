
"""
mem0 client for embedding storage and retrieval.
"""

import requests
import os

class Mem0Client:
    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.getenv("MEM0_URL", "http://localhost:8000")

    def store_embedding(self, embedding: dict):
        url = f"{self.base_url}/embeddings"
        resp = requests.post(url, json=embedding)
        resp.raise_for_status()
        return resp.json()

    def query_embeddings(self, query: str):
        url = f"{self.base_url}/search"
        resp = requests.get(url, params={"q": query})
        resp.raise_for_status()
        return resp.json()

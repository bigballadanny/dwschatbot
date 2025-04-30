
"""
mem0 SSE Client: Handles streaming embedding retrieval from mem0.
"""

import requests

class Mem0SSEClient:
    def __init__(self, base_url: str):
        self.base_url = base_url

    def stream_embeddings(self, query: str):
        """
        Stream embeddings for a given query.

        Args:
            query (str): The query to retrieve embeddings for.

        Yields:
            dict: Embedding data from mem0.
        """
        url = f"{self.base_url}/stream?query={query}"
        with requests.get(url, stream=True) as resp:
            for line in resp.iter_lines():
                if line:
                    yield line.decode('utf-8')

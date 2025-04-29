import requests
import json
from typing import Any, Dict, Optional

class Mem0SSEClient:
    """
    Simple client for interacting with mem0 MCP server via SSE (Server-Sent Events) protocol.
    """
    def __init__(self, mem0_url: str = "http://localhost:8050"):
        self.mem0_url = mem0_url.rstrip("/")
        self.endpoint = f"{self.mem0_url}/mcp"
        self.headers = {
            "Accept": "text/event-stream",
            "Content-Type": "application/json"
        }

    def call_tool(self, tool: str, args: Dict[str, Any]) -> Optional[Any]:
        """
        Call a mem0 tool via SSE and return the final result.

        Args:
            tool (str): The tool name (e.g., 'save_memory', 'search_memories').
            args (dict): Arguments for the tool.

        Returns:
            The parsed response from the tool, or None if failed.
        """
        payload = {
            "tool": tool,
            "args": args
        }
        response = requests.post(self.endpoint, headers=self.headers, data=json.dumps(payload), stream=True)
        result = None
        for line in response.iter_lines():
            if line:
                try:
                    # SSE lines are like: 'data: {...}'
                    if line.startswith(b'data:'):
                        data_str = line[5:].strip()
                        event_data = json.loads(data_str)
                        # Look for 'result' or 'output' fields, or just print
                        if 'result' in event_data:
                            result = event_data['result']
                        elif 'output' in event_data:
                            result = event_data['output']
                        else:
                            result = event_data
                except Exception:
                    continue
        return result

    def save_memory(self, text: str) -> Optional[Any]:
        return self.call_tool("save_memory", {"text": text})

    def search_memories(self, query: str, limit: int = 3) -> Optional[Any]:
        return self.call_tool("search_memories", {"query": query, "limit": limit})

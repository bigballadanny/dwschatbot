
"""
LightRAGAgent: Handles retrieval-augmented generation using mem0 and Supabase.
"""

from typing import Optional, List

class LightRAGAgent:
    def __init__(self, knowledge_base=None):
        self.knowledge_base = knowledge_base

    def query(self, user_query: str, topic: Optional[str] = None) -> List[str]:
        """
        Query the knowledge base and return relevant answers.

        Args:
            user_query (str): The user's question.
            topic (Optional[str]): Optional topic filter.

        Returns:
            List[str]: List of relevant answers.
        """
        if not self.knowledge_base:
            return ["Knowledge base not initialized."]
        results = self.knowledge_base.query(user_query, topic=topic)
        return results if results else ["No relevant answer found."]

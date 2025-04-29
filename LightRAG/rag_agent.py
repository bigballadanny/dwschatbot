# LightRAG: Pydantic AI agent using LightRAG
# (Stub for integration; replace with actual logic from upstream as needed)

import os
import openai
from LightRAG.rag_pipeline import retrieve_context

class LightRAGAgent:
    """
    LightRAGAgent orchestrates the workflow:
    1. Embed the user query
    2. Retrieve relevant context from mem0 (semantic search)
    3. Construct a prompt using the retrieved context
    4. Call OpenAI's chat completion API to generate an answer
    5. Return the answer and the context chunks as sources
    """
    def __init__(self, mem0_url: str = None):
        self.mem0_url = mem0_url or os.getenv("MEM0_URL", "http://localhost:8050")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        openai.api_key = self.openai_api_key

    def query(self, user_query: str, topic: str = None, max_context_chunks: int = 5) -> dict:
        """
        Answer a user query using RAG: retrieve relevant context and generate an answer.

        Args:
            user_query (str): The user question.
            topic (str, optional): Optional topic filter for retrieval.
            max_context_chunks (int): Max number of context chunks to use.

        Returns:
            dict: {"answer": str, "sources": list}
        """
        # 1. Retrieve relevant context from mem0 (semantic search, optionally by topic)
        context_chunks = retrieve_context(user_query, self.mem0_url, topic=topic)
        if not context_chunks:
            return {"answer": "I'm sorry, I couldn't find relevant information.", "sources": []}
        # Limit context to max_context_chunks
        selected_chunks = context_chunks[:max_context_chunks]
        context_text = "\n---\n".join([chunk.get("text", "") for chunk in selected_chunks])
        # 2. Construct a prompt for OpenAI
        prompt = (
            "You are an expert M&A assistant. Use ONLY the following transcript context to answer the user's question. "
            "If the answer is not in the context, say you don't know.\n"
            f"Context:\n{context_text}\n\nUser question: {user_query}\nAnswer:"
        )
        # 3. Call OpenAI's chat completion API
        try:
            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "system", "content": "You are a helpful M&A assistant."},
                         {"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=512,
            )
            answer = response.choices[0].message.content.strip()
        except Exception as e:
            answer = f"OpenAI API error: {e}"
        return {"answer": answer, "sources": selected_chunks}

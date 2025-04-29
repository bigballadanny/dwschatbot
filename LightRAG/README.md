"""
README for LightRAG integration in dwschatbot-1

This module will provide lightweight retrieval-augmented generation (RAG) capabilities for the chatbot project.

Structure:
- insert_pydantic_docs.py: Example script for ingesting Pydantic or other docs into the vector store (mem0).
- rag_pipeline.py: Main pipeline for document ingestion, retrieval, and integration with chatbot/LLM.
- __init__.py: Marks LightRAG as a Python package.

To use:
- Place scripts and logic for document parsing, embedding, and retrieval here.
- Integrate with mem0 (vector store) and supabase-mcp (structured data) as needed.
"""

## Lovable Deployment Instructions

To deploy this app on Lovable:

1. Ensure all code is pushed to GitHub.
2. Connect your repository to Lovable.
3. Required files:
   - `requirements.txt` (must include: streamlit, openai, supabase, pydantic, requests, fastapi, uvicorn)
   - `Procfile` with:
     ```
     web: streamlit run LightRAG/streamlit_app.py --server.port $PORT --server.address 0.0.0.0
     ```
4. Set the following environment variables in the Lovable dashboard:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `MEM0_URL`
5. Lovable will install dependencies and run the app automatically.
6. If you see errors, check the Lovable build logs for missing packages or environment variables.

**Note:** If you want to use the FastAPI admin API, you can run it separately (not as the main Lovable web app) or deploy it as a separate service.

---

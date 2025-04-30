
# dwschatbot

This project is a Streamlit-based chatbot with Retrieval-Augmented Generation (RAG) capabilities, using Supabase for structured data and mem0 for vector storage.  
It is designed for deployment on Lovable, with a focus on modularity, testability, and clear documentation.

## Key Features
- Streamlit UI for chat and retrieval
- Supabase integration for metadata and storage
- mem0 for fast, scalable embedding search
- Modular codebase with clear separation of concerns

## Setup
1. Install dependencies: `pip install -r requirements.txt`
2. Set required environment variables (`OPENAI_API_KEY`, `SUPABASE_URL`, etc.)
3. Run locally: `streamlit run app.py`

## Deployment
- Push to GitHub; Lovable will auto-detect and deploy.
- Ensure environment variables are set in the Lovable dashboard.

## Project Structure
- app.py: Streamlit entrypoint
- `LightRAG/`: Core logic and agents
- `supabase-mcp/`, `mcp-mem0/`: MCP integrations
- `tests/`: Unit tests

## Contributing
See PLANNING.md and TASKS.md for roadmap and open issues.

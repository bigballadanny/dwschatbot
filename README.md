
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
2. Set required environment variables (see Environment Variables section)
3. Run locally: `streamlit run app.py`

## Deployment
- Push to GitHub; Lovable will auto-detect and deploy.
- Ensure environment variables are set in the Lovable dashboard.

## Project Structure
- `app.py`: Streamlit entrypoint (chatbot & ingestion UI)
- `LightRAG/`: Core Python modules (agent, pipeline, integrations)
- `tests/`: Unit tests
- `PLANNING.md`: Project vision, architecture, and component details
- `TASKS.md`: Prioritized tasks with timestamps and component references
- `WORKFLOW.md`: Development process and philosophical approach
- `CHANGELOG.md`: Record of completed work and changes
- `ENVIRONMENT.md`: Comprehensive documentation of environment variables
- `COMPONENT_GUIDES.md`: Detailed component-specific documentation and examples

## Environment Variables
The following environment variables must be set in the Lovable dashboard:

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase service key
- `MEM0_URL`: mem0 vector store endpoint (default: "http://localhost:8000")
- `OPENAI_API_KEY`: If using OpenAI for embeddings

See `ENVIRONMENT.md` for a comprehensive list of all environment variables.

## Development Philosophy

We follow the "Zoom In, Zoom Out" development approach:
- Regularly zoom out to understand the big picture and project goals
- Zoom in to focus on implementation details of specific components
- Keep TASKS.md updated with priorities and component references
- Consult COMPONENT_GUIDES.md when working on specific parts of the system

For more details on our development philosophy and workflow, see `WORKFLOW.md`.

## Contributing
See PLANNING.md and TASKS.md for roadmap and open issues.
See WORKFLOW.md for development process guidelines.

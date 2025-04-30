
# Environment Variables

This document contains all the environment variables needed for the project to function properly, along with descriptions and example values.

## Core Environment Variables

| Variable | Description | Example | Required | Default |
|----------|-------------|---------|----------|---------|
| `SUPABASE_URL` | URL of your Supabase project | `https://xyzproject.supabase.co` | Yes | None |
| `SUPABASE_KEY` | Service role API key for Supabase | `eyJhbGciOiJIUzI1N...` | Yes | None |
| `MEM0_URL` | URL of the mem0 vector store service | `http://localhost:8000` | Yes | `http://localhost:8000` |
| `OPENAI_API_KEY` | API key for OpenAI (if using OpenAI embeddings) | `sk-...` | No | None |
| `PYTHON_BACKEND_URL` | URL of the Python backend for processing transcripts | `https://api.example.com/process` | Yes | None |
| `PYTHON_BACKEND_KEY` | Authentication key for the Python backend | `your-secret-key` | No | None |

## Configuration Environment Variables

| Variable | Description | Example | Required | Default |
|----------|-------------|---------|----------|---------|
| `LOG_LEVEL` | Logging verbosity | `INFO` | No | `INFO` |
| `CHUNK_SIZE` | Default chunk size for document splitting | `5` | No | `5` |
| `CHUNK_OVERLAP` | Default chunk overlap count | `1` | No | `1` |
| `MAX_RESULTS` | Maximum results to return from queries | `5` | No | `5` |
| `EMBED_DIM` | Dimension of embedding vectors | `1536` | No | `1536` |

## Deployment Environment Variables

| Variable | Description | Example | Required | Default |
|----------|-------------|---------|----------|---------|
| `PORT` | Port for Streamlit to listen on | `8501` | No | `8501` |
| `ENABLE_METRICS` | Enable performance metrics collection | `true` | No | `false` |
| `ENABLE_CACHING` | Enable response caching | `true` | No | `true` |

## Setting Environment Variables

### Local Development

For local development, you can create a `.env` file in the root directory with the required variables:

```
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_KEY=your-supabase-key
MEM0_URL=http://localhost:8000
OPENAI_API_KEY=your-openai-key
PYTHON_BACKEND_URL=https://api.example.com/process
PYTHON_BACKEND_KEY=your-backend-key
```

Then load them using the python-dotenv package.

### Lovable Deployment

For Lovable deployment, set the environment variables in the Lovable dashboard under Project Settings -> Environment Variables.

### Production Deployment

For production deployment, set the environment variables according to your hosting provider's instructions.

## Security Notes

- Never commit `.env` files or API keys to version control
- For production, use secret management solutions provided by your hosting platform
- Rotate API keys regularly according to security best practices

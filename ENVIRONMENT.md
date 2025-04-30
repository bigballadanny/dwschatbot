
# Environment Variables

This document contains all the environment variables needed for the project to function properly, along with descriptions and example values.

## Core Environment Variables

| Variable | Description | Example | Required | Default |
|----------|-------------|---------|----------|---------|
| `SUPABASE_URL` | URL of your Supabase project | `https://xyzproject.supabase.co` | Yes | None |
| `SUPABASE_KEY` | API key for Supabase | `eyJhbGciOiJIUzI1N...` | Yes | None |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role API key for Supabase (for edge functions) | `eyJhbGciOiJIUzI1N...` | Yes | None |
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
| `PORT` | Port for the application to listen on | `8501` | No | `8501` |
| `ENABLE_METRICS` | Enable performance metrics collection | `true` | No | `false` |
| `ENABLE_CACHING` | Enable response caching | `true` | No | `true` |

## Setting Environment Variables

### Supabase Edge Functions

For Supabase Edge Functions, set the environment variables in the Supabase dashboard under:
Project Settings -> API -> Edge Functions -> Environment Variables

**IMPORTANT:** The transcript processing system **requires** the following variables to be set:
- `PYTHON_BACKEND_URL` - The URL to your Python backend service that processes transcripts
- `PYTHON_BACKEND_KEY` - The authentication key for your Python backend (if required)

### Local Development

For local development, you can create a `.env` file in the root directory with the required variables:

```
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_KEY=your-supabase-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PYTHON_BACKEND_URL=https://api.example.com/process
PYTHON_BACKEND_KEY=your-backend-key
```

## Security Notes

- Never commit `.env` files or API keys to version control
- For production, use secret management solutions provided by your hosting platform
- Rotate API keys regularly according to security best practices

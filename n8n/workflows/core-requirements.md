# DWS Chatbot Core Requirements

## Project Overview
The DWS (Deal Maker Society) Chatbot is an AI assistant that helps users find information from Deal Maker Society transcripts. It uses Retrieval-Augmented Generation (RAG) to search through transcripts and provide relevant information about M&A topics.

## Core Components

### 1. Webhook Endpoint
- **Purpose**: Receive user messages and return AI responses
- **Input**: 
  - `chatInput`: The user's message text
  - `sessionId`: A unique identifier for the conversation
- **Output**: 
  - AI-generated response text with transcript citations

### 2. Session Management
- **Purpose**: Maintain conversation context across messages
- **Requirements**:
  - Create new sessions when needed
  - Retrieve existing session data
  - Update sessions with new messages
  - Store conversation history

### 3. Language Model Integration
- **Purpose**: Generate helpful, contextually relevant responses
- **Requirements**:
  - Connect to OpenAI API (gpt-4o-mini model)
  - Process user input
  - Include session context for continuity
  - Format responses appropriately

### 4. RAG (Retrieval-Augmented Generation)
- **Purpose**: Find and include relevant transcript content
- **Requirements**:
  - Search transcript embeddings for relevant information
  - Include found information in prompt context
  - Cite sources accurately in responses

## Database Schema Requirements

### Sessions Table
- `id`: Unique session identifier (string/UUID)
- `memory`: JSON object containing conversation history
  - Format: `{"messages": [{"role": "user|assistant", "content": "message text", "timestamp": "ISO date"}]}`
- `created_at`: Timestamp of session creation
- `updated_at`: Timestamp of last update

### Embeddings Table
- `id`: Unique embedding identifier
- `transcript_id`: Reference to source transcript
- `content`: Text chunk from transcript
- `metadata`: Additional information (JSON)
  - Should include: `transcript_title`, `source`, etc.
- `embedding`: Vector representation (1536 dimensions)

### Transcripts Table
- `id`: Unique transcript identifier
- `title`: Transcript title
- `content`: Full transcript text
- `is_processed`: Boolean flag for embedding status
- `metadata`: Additional information (JSON)
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update

## n8n Workflow Requirements

### Minimum Nodes Needed
1. Webhook node (entry point)
2. Set node (extract input parameters)
3. HTTP Request node (get session)
4. HTTP Request node (create/update session if needed)
5. OpenAI node (AI model)
6. HTTP Request node (RAG search)
7. HTTP Request node (update session with response)
8. Respond to Webhook node (return response)

### Data Flow
1. Receive webhook request → Extract parameters
2. Get existing session OR create new session
3. Prepare context with session memory
4. Search for relevant transcript content
5. Generate AI response with context and search results
6. Update session with new message pair
7. Return response to user

## Integration Points
- **Supabase**: Database for sessions, embeddings, and transcripts
- **OpenAI**: AI model for response generation
- **n8n**: Workflow automation platform
- **Project Frontend**: Sends webhook requests and displays responses

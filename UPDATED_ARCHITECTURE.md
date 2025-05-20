# Updated Architecture

This document outlines the updated architecture of the DWS AI BETA project, focusing on the n8n workflow-based approach for handling chat and transcript ingestion.

## Core Architecture

### Frontend
- **React Application**: Main user interface built with React, TypeScript, and Shadcn UI components
- **Supabase Client**: Interface for communicating with Supabase backend services
- **Chat Interface**: UI components for the chatbot experience

### Backend
- **Supabase**: 
  - Database for storing conversations, messages, and transcript metadata
  - Storage for transcript files
  - Edge Functions for processing requests

- **n8n Workflows**: 
  - Handles chat processing through webhooks
  - Manages transcript ingestion pipeline
  - Orchestrates the overall system integration

### Edge Functions
Key Supabase edge functions:
- `gemini-chat`: Processes chat messages through n8n
- `process-transcript`: Handles transcript processing
- `generate-transcript-summary`: Creates summaries of transcripts
- `search_embeddings`: Searches vector embeddings for relevant content

## Data Flow

1. **Chat Flow**:
   - User sends a message via the React frontend
   - Message is sent to the Supabase edge function
   - Edge function forwards the request to n8n via webhook
   - n8n processes the request and returns a response
   - Response is returned to the frontend and displayed to the user

2. **Transcript Ingestion**:
   - User uploads a transcript via the React frontend
   - Transcript is stored in Supabase storage
   - n8n workflow is triggered to process the transcript
   - Transcript is chunked and embedded
   - Vector embeddings are stored in Supabase PGVector
   - Metadata is updated to mark the transcript as processed

## Planned Improvements

1. **Conversation Context Management**:
   - Implement proper handling of conversation history
   - Enable reference to previous questions and answers

2. **Enhanced Vector Search**:
   - Improve the search embeddings function to leverage hierarchical chunking
   - Implement more sophisticated retrieval strategies

3. **Performance Optimization**:
   - Add caching for frequent queries
   - Optimize vector search with approximate nearest neighbors
   - Implement batch processing for large transcript collections

4. **UI Improvements**:
   - Follow the refactoring plan to improve component structure
   - Create more reusable UI components
   - Implement proper state management
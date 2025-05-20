# DWS Chatbot - n8n Implementation Handoff

## 🔒 Current Status - Critical Action Required 🔒

The edge function processing pipeline is failing. We need to implement n8n as the solution.

## Key Finding
- **120 transcripts failed to process** due to edge function issues
- The chunking code itself is solid - the issue is with execution environment
- Edge functions are timing out or having API key issues

## Simplified Approach with n8n

### What the User Wants
1. Users should be able to chat
2. Chat should retrieve information from 120+ transcripts
3. Simple, reliable implementation

### Why n8n is Better
1. No timeout issues
2. Better error visibility
3. Built-in retry mechanisms
4. Easier webhook integration

## Essential Database Tables (Keep These)

### From Supabase:
1. **transcripts** - Store transcript content
2. **chunks** - Store processed chunks  
3. **embeddings** - Store vector embeddings
4. **conversations** - Store chat history
5. **messages** - Store individual messages

### Tables to Consider Removing:
- chat_analytics
- ai_insights_cache
- embedding_feedback
- message_feedback
- transcript_summaries

## Critical Next Steps

### Task 1: Set up n8n Workflow
1. Import `n8n/workflows/dws-chatbot-complete-workflow.json`
2. Configure Supabase PostgreSQL credentials
3. Configure OpenAI API credentials
4. Test with a single transcript first

### Task 2: Update Frontend
1. Change webhook URL from edge function to n8n webhook
2. Remove edge function dependencies
3. Test chat functionality

### Task 3: Process Transcripts
1. Use n8n to chunk and embed all 120 transcripts
2. Implement batch processing with retries
3. Monitor for errors

### Task 4: Clean Project
1. Remove unused edge functions
2. Delete deprecated files
3. Keep only essential components

## Simplification Ideas

1. **Direct PostgreSQL**: Use n8n's PostgreSQL node directly instead of complex edge functions
2. **Simple RAG**: Just search embeddings and return relevant chunks
3. **Minimal Frontend**: Keep chat UI simple, remove unnecessary features
4. **Batch Processing**: Process transcripts in small batches to avoid timeouts

## Files to Review/Clean

- `/supabase/functions/` - Most can be removed except essential ones
- Duplicate n8n workflow files in `/n8n/workflows/`
- Old Python dependencies and files
- Complex diagnostic tools that aren't needed

## Task Manager Entry

Please create tasks for:
1. n8n workflow setup and testing
2. Frontend webhook integration  
3. Transcript batch processing
4. Project cleanup
5. Testing end-to-end flow

## For Next Agent

Focus on implementing the n8n workflow first. Don't get caught up in the complexity - we need a simple solution that works.

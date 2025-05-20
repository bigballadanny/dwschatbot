# n8n Workflows

This document provides guidance on setting up n8n workflows for the DWS AI BETA project.

## Overview

n8n is being used to handle two main workflows in this project:
1. **Chat processing**: Handling the conversation between users and the AI
2. **Transcript ingestion**: Processing and storing transcripts for later retrieval

## Setting Up n8n

1. Install n8n:
   ```bash
   npm install n8n -g
   ```

2. Run n8n:
   ```bash
   n8n start
   ```

3. Access the n8n dashboard at `http://localhost:5678`

## Chat Workflow

### Components
- **Webhook node**: Entry point for chat requests from Supabase edge functions
- **AI node**: Connect to your AI provider (such as Vertex AI or OpenAI)
- **Function node**: Process the response before returning
- **Respond to Webhook node**: Return the processed response

### Webhook Configuration
- **Method**: POST
- **Path**: /chat
- **Response Mode**: Last Node
- **Authentication**: Bearer Token (for security)

### Input Data Structure
```json
{
  "query": "User's message here",
  "messages": [
    {"content": "Previous message 1", "role": "user"},
    {"content": "Previous response 1", "role": "system"}
  ],
  "conversationId": "unique-conversation-id",
  "enableOnlineSearch": true,
  "isVoiceInput": false
}
```

### Output Data Structure
```json
{
  "content": "AI response here",
  "source": "gemini", 
  "citation": [
    {"text": "Source text", "source": "document-id"}
  ],
  "audioContent": "base64-encoded-audio-optional"
}
```

## Transcript Ingestion Workflow

### Components
- **Webhook node**: Triggered when a new transcript is uploaded
- **Supabase node**: Fetch transcript data and content
- **Function node**: Process the transcript content (chunking)
- **Supabase node**: Store chunks in the database
- **AI node**: Generate embeddings for the chunks
- **Supabase node**: Store embeddings in PGVector

### Webhook Configuration
- **Method**: POST
- **Path**: /process-transcript
- **Response Mode**: Last Node
- **Authentication**: Bearer Token (for security)

### Input Data Structure
```json
{
  "transcriptId": "unique-transcript-id",
  "filePath": "storage/path/to/transcript.txt",
  "metadata": {
    "source": "upload",
    "tags": ["example", "tag"]
  }
}
```

## Security Considerations

1. **Authentication**: Always enable webhook authentication
2. **Environment Variables**: Store sensitive information in environment variables
3. **Network Security**: If possible, only allow connections from Supabase IPs
4. **HTTP Headers**: Validate incoming requests with proper headers

## Integration with Supabase

1. Add n8n webhook URLs to your Supabase environment variables:
   ```
   N8N_CHAT_WEBHOOK=https://your-n8n-instance.com/webhook/chat
   N8N_TRANSCRIPT_WEBHOOK=https://your-n8n-instance.com/webhook/process-transcript
   ```

2. Update the Supabase edge functions to call these webhooks:
   ```javascript
   // In gemini-chat/index.ts
   const n8nWebhook = Deno.env.get("N8N_CHAT_WEBHOOK");
   const response = await fetch(n8nWebhook, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${Deno.env.get("N8N_API_TOKEN")}`
     },
     body: JSON.stringify(requestBody)
   });
   ```

## Using the Workflow Editor

n8n provides a visual editor for creating workflows. When setting up your workflows:

1. Start with a webhook node as the trigger
2. Add nodes to process the data
3. End with a "Respond to Webhook" node
4. Test the workflow using the built-in testing tools
5. Save and activate the workflow

## Example Workflow Configuration

![Example Workflow](/path/to/example/workflow.png)

*Note: Add actual screenshots of your workflows once they're configured.*
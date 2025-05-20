# DWS Chatbot Deployment Guide

## Architecture Overview

The system uses a secure architecture with:
- Frontend → Supabase Edge Function → n8n Webhook → Database

This provides security, scalability, and proper data handling.

## Deployment Steps

### 1. Database Setup

Run the migrations:
```bash
cd C:\Users\My Horizon\Desktop\SYNTHIOS\PROJECTS\DWS_Chatbot
supabase db push
```

This will create:
- Error logs table
- Required indexes
- Row Level Security policies

### 2. Edge Function Deployment

Deploy the Supabase edge function:
```bash
supabase functions deploy gemini-chat
```

### 3. Environment Variables

Set the following environment variables in Supabase:
```bash
supabase secrets set N8N_WEBHOOK_URL=your-n8n-webhook-url
```

For local development, the edge function defaults to `http://localhost:5678/webhook/dws-chatbot`

### 4. n8n Configuration

In your n8n workflow:
1. Keep the webhook trigger as is
2. Update the "Get or Create Conversation" node with the fixed SQL
3. Ensure proper node execution order

### 5. Frontend Configuration

The frontend is already configured to call the `gemini-chat` edge function. No changes needed.

## Security Benefits

1. **Authentication**: Edge function verifies user tokens
2. **Data Validation**: Ensures proper data structure before n8n
3. **Error Handling**: Comprehensive error logging
4. **Rate Limiting**: Can be added to edge function
5. **Monitoring**: All requests logged for debugging

## Testing

1. Test the edge function:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/gemini-chat \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"query": "test message", "conversationId": null}'
```

2. Check error logs:
```sql
SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 10;
```

3. Monitor conversations:
```sql
SELECT * FROM conversations ORDER BY updated_at DESC LIMIT 10;
```

## Production Considerations

1. Set up proper n8n URL (not localhost)
2. Configure CORS headers appropriately
3. Add rate limiting to edge function
4. Set up monitoring and alerts
5. Regular backup of conversation data
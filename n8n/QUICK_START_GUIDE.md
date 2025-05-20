# Quick Start Guide: Setting Up Transcript Processing in n8n

## What You Need to Do Right Now

### 1. Understand the Current Setup
Your current n8n workflow (`my_workflow_8`) handles chat functionality. It:
- Receives chat messages
- Generates embeddings for queries
- Searches existing content
- Returns AI responses

What's missing: A way to process and embed your 120 transcripts.

### 2. Set Up Transcript Processing

I've created a new workflow file: `transcript-ingestion-workflow.json`

This workflow will:
1. Fetch unprocessed transcripts
2. Break them into smart chunks
3. Detect M&A topics (seller notes, SBA loans, etc.)
4. Generate embeddings
5. Store everything in your database

### 3. Configure n8n (Step by Step)

1. **Import the New Workflow**:
   - Open n8n
   - Go to Workflows → Import from File
   - Select `transcript-ingestion-workflow.json`

2. **Set Up Credentials** (if not already done):
   - Supabase PostgreSQL:
     - Host: `db.bfscrjrjwbzpldamcrbz.supabase.co`
     - Database: `postgres`
     - User: Your Supabase user
     - Password: Your Supabase password
     - Port: `5432`
   
   - OpenAI API:
     - Add your OpenAI API key

3. **Test with One Transcript**:
   - Trigger the webhook with:
   ```json
   {
     "batch_size": 1
   }
   ```

4. **Process All Transcripts**:
   - Once testing works, run batches of 5-10:
   ```json
   {
     "batch_size": 10
   }
   ```

### 4. How Embeddings Work

Think of embeddings as a way to convert text into numbers that represent meaning:
- "Seller financing" and "seller notes" will have similar embeddings
- This lets the system find relevant content even with different wording
- The chatbot uses these to find the right transcript sections

### 5. Making It Work Offline

After processing all transcripts, your system will work by:
1. User asks question → Creates embedding
2. Search database for similar embeddings
3. Return relevant transcript chunks
4. AI generates answer from those chunks

The database acts as your offline knowledge base.

### 6. Monitor Progress

Check if transcripts are being processed:
```sql
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN is_processed = true THEN 1 END) as processed
FROM transcripts;
```

Check embeddings count:
```sql
SELECT COUNT(*) FROM embeddings;
```

### 7. Troubleshooting

If processing fails:
- Check n8n execution logs
- Verify credentials are correct
- Reduce batch_size if timeouts occur
- Check error_logs table for issues

### 8. Next Steps

Once all transcripts are processed:
1. Update frontend to use n8n webhook URL
2. Test chat functionality
3. Monitor performance
4. Add more transcripts as needed

The system will then answer questions like:
- "What are seller notes?"
- "How do SBA loans work?"
- "What's Roland's acquisition strategy?"

All answers will come from your mastermind transcript content.

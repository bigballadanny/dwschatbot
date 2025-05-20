# Transcript Processing Guide

## 🔒 CORE PROTECTION PROTOCOL 🔒

This system is fundamental to project integrity. Changes require:
1. Explicit user confirmation with passcode: "SYNTHIOS"
2. Version backup before structural changes
3. All task implementations must reference an approved task ID

## Issue - No Embeddings Found

The database currently has 120 transcripts but no embeddings. This means the RAG search functionality won't work correctly because there's no vector data to search against.

## Solution - Process Transcripts with n8n

1. **Open n8n Admin** (http://localhost:5678/)
2. **Open the "DWS AI RAG" workflow**
3. **Process Transcripts**:
   - Find the "Process Transcript Trigger" node
   - Click "Execute Node" to run the transcript processing
   - This will process the sample transcript
   
4. **Process All Transcripts**:
   - You'll need to modify the workflow to loop through all transcripts
   - Add a Supabase node that fetches all transcripts where is_processed=false
   - Connect this to a Loop node
   - Process each transcript inside the loop

## Quick Fix for Testing

For immediate testing with at least some embeddings, you can:

1. Run the "Process Transcript Trigger" manually a few times
2. This will at least create some embeddings for testing
3. Verify in Supabase that embeddings are being created

## Long-term Solution

Implement a batch processing workflow that:
1. Queries all unprocessed transcripts
2. Processes them in batches (e.g., 10 at a time)
3. Updates each transcript to mark it as processed
4. Provides progress monitoring

This should be implemented as part of TASK-PO-01 (Implement batch reprocessing for large transcript collections) from the master task list.

## Verification

After processing, run this query to verify embeddings are being created:
```sql
SELECT COUNT(*) FROM embeddings;
```

The count should increase as transcripts are processed.

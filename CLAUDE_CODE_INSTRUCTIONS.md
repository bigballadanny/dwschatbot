# Claude Code Instructions - M&A RAG Implementation

## ⚠️ CRITICAL: What Claude Code Can't See (Supabase Status)

### Already Done by Claude Desktop ✅
- `search_chunks` SQL function - CREATED
- Text search index - CREATED  
- pgvector extension - INSTALLED

### The Problem 🚨
- Chunks table has 3 records but they're EMPTY (no content)
- Transcript exists with full content but wasn't processed correctly

## STEP 1: Fix Empty Chunks (Do This First!)

```sql
-- Check the problem
SELECT id, LENGTH(content) as content_len FROM chunks LIMIT 3;

-- If empty, delete and reprocess
DELETE FROM chunks WHERE content = '' OR content IS NULL;
UPDATE transcripts SET is_processed = false WHERE id = '60b742ee-301a-42f4-a8f2-f69b553e35ec';
```

Then trigger reprocessing through the UI or call process-transcript function.

## STEP 2: Add RAG to ai-chat

1. Open `supabase/functions/ai-chat/index.ts`
2. Add search function from `ai-chat-rag-update/rag-enhancement.ts`
3. Insert RAG code at "// 4. Prepare Messages for AI"
4. Deploy: `supabase functions deploy ai-chat`

## STEP 3: Test

```sql
-- Verify chunks have content
SELECT * FROM search_chunks('business', 5);
```

## Key Info
- Transcript title: "Protégé Call September 9, 2024 RLGL - What's Stopping You By Carl"
- MCP doesn't work in Claude Code (only Claude Desktop)
- Text search is ready, just needs content in chunks!

Check `ai-chat-rag-update/` folder for complete code.
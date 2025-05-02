
# SYNTHIOS Technical Reference

## 🔒 CORE PROTECTION PROTOCOL 🔒

This system is fundamental to project integrity. Changes require:
1. Explicit user confirmation with passcode: "SYNTHIOS"
2. Version backup before structural changes
3. All task implementations must reference an approved task ID

## System Architecture

### Core Components
1. **Transcript Processing**: Edge functions for processing raw transcript content
2. **Chunking System**: Hierarchical document chunking with parent-child relationships
3. **RAG Pipeline**: Enhanced search with context-aware retrieval
4. **Diagnostic System**: Tools for monitoring and maintaining system health

## Database Schema

### Transcripts Table
Primary storage for transcript content and metadata
```sql
CREATE TABLE public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  file_path TEXT,
  is_processed BOOLEAN DEFAULT false,
  is_summarized BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'protege_call',
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Chunks Table
Storage for hierarchical transcript chunks
```sql
CREATE TABLE public.chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID REFERENCES public.transcripts(id),
  content TEXT NOT NULL,
  chunk_type VARCHAR NOT NULL,
  topic TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### File Status Table
Tracking system for file usage and status
```sql
CREATE TABLE public.file_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  last_used TIMESTAMPTZ DEFAULT now(),
  version TEXT,
  tags TEXT[],
  dependencies TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Edge Functions

### process-transcript
Processes raw transcript content, applies hierarchical chunking, and marks as processed
```typescript
// Request format:
{
  transcript_id: string;
}

// Response format:
{
  success: boolean;
  transcript_id: string;
  processing_status: string;
}
```

### trigger-transcript-processing
Triggers processing for a specific transcript
```typescript
// Request format:
{
  transcript_id: string;
}

// Response format:
{
  success: boolean;
  message: string;
}
```

### search_embeddings
Searches vector embeddings for relevant content based on query
```typescript
// Request format:
{
  query: string;
  filters?: Record<string, any>;
  top_k?: number;
}

// Response format:
{
  results: Array<{
    content: string;
    metadata: Record<string, any>;
    similarity: number;
  }>;
  timing: {
    total_ms: number;
    search_ms: number;
  }
}
```

## Hierarchical Chunking System

### Parent-Child Chunk Relationship
```typescript
interface ChunkMetadata {
  position: number;
  parent_id: string | null;
  chunk_strategy: string;
  [key: string]: any;
}

interface TranscriptChunk {
  id: string;
  content: string;
  transcript_id: string;
  chunk_type: 'parent' | 'child';
  topic: string | null;
  metadata: ChunkMetadata;
}
```

### Chunking Process
1. Break transcript into large, topically coherent parent chunks
2. Create smaller child chunks within each parent
3. Maintain parent-child relationships through metadata
4. Store both parent and child chunks in chunks table
5. Use chunking strategy metadata for future reference

## File Status System

### Status Types
- **active**: Currently in use and maintained
- **deprecated**: Scheduled for removal in future updates
- **experimental**: Testing new approaches, not production-ready

### File Documentation Format
```typescript
/**
 * @file Component description
 * @status active|deprecated|experimental
 * @lastUsed YYYY-MM-DD
 * @version 1.0
 * @tags tag1,tag2,tag3
 * @dependencies path/to/dependency1,path/to/dependency2
 */
```

### Database Integration
File status information is stored in the `file_status` table with the following structure:
- `id`: UUID primary key
- `file_path`: Path to the file (unique)
- `status`: Current status (active, deprecated, experimental)
- `last_used`: Timestamp of last usage
- `version`: File version
- `tags`: Array of tags for categorization
- `dependencies`: Array of file dependencies
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update

## API Reference

### Transcript API
- `GET /api/transcripts`: Get all transcripts
- `GET /api/transcripts/:id`: Get transcript by ID
- `POST /api/transcripts`: Create new transcript
- `PUT /api/transcripts/:id`: Update transcript
- `DELETE /api/transcripts/:id`: Delete transcript
- `POST /api/transcripts/:id/process`: Process transcript

### Chunks API
- `GET /api/chunks`: Get all chunks
- `GET /api/chunks/:id`: Get chunk by ID
- `GET /api/chunks/transcript/:id`: Get chunks by transcript ID
- `GET /api/chunks/parent/:id`: Get child chunks by parent ID

### File Status API
- `GET /api/file-status`: Get all file status records
- `GET /api/file-status/:path`: Get file status by path
- `POST /api/file-status`: Create new file status record
- `PUT /api/file-status/:id`: Update file status
- `DELETE /api/file-status/:id`: Delete file status

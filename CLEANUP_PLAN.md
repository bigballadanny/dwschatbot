# Project Cleanup Plan

## Overview
Based on the current project direction, this plan outlines components to remove and reorganize. The project is shifting from using LightRAG Python implementation to using n8n workflows for chat and transcript ingestion.

## Components to Remove

### Python Components
- [ ] LightRAG directory (entire directory)
- [ ] tests/test_api_contract.py
- [ ] tests/test_chunking_visualization.py
- [ ] tests/test_environment.py
- [ ] tests/test_ingest_pipeline.py
- [ ] tests/test_light_rag_agent.py
- [ ] tests/test_pgvector_client.py
- [ ] tests/test_rag_pipeline.py
- [ ] tests/test_rag_system.py

### Redundant Components
- [ ] Remove duplicate TranscriptDiagnostics implementations (keep only one)
- [ ] Remove Vertex-related pages (VertexAISetup.tsx and VertexTest.tsx)

### Outdated Documentation
- [ ] Update README.md to reflect current architecture
- [ ] Update PLANNING.md to remove LightRAG references
- [ ] Update ENVIRONMENT.md to reflect current requirements

## Components to Keep

### Core React Application
- Keep all React components in src/components/ that are actively used
- Keep chat-related hooks (useChat.ts, useChatApi.ts, useMessages.ts)
- Keep the transcript processing functionality

### Supabase Components
- Keep all Supabase edge functions
- Keep database schema and migrations

### n8n Integration
- Keep n8n directory (even though it's currently empty)
- Prepare documentation for n8n workflow structure

## Documentation Updates

### Create New Documentation
- [ ] Create N8N_WORKFLOWS.md to document the workflow approach
- [ ] Update CLAUDE.md with the new architecture information
- [ ] Update TASKS.md to reflect the current priorities

## Implementation Plan
1. First backup the project
2. Remove Python components
3. Update documentation
4. Test the application to ensure functionality remains intact
5. Clean up any remaining references to removed components
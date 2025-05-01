
# Transcript Processing System

This document provides information about the transcript processing system.

## System Overview

The transcript processing system is designed to:

1. Store and manage transcript files
2. Extract text content from files when needed
3. Process transcripts to extract useful information
4. Provide diagnostics and management tools

## Architecture

The system is built with Supabase at its core, using:

1. Edge functions for processing logic
2. Database triggers for automatic processing
3. PGVector for semantic search capabilities
4. Storage buckets for file management

All components are integrated within the Supabase ecosystem, eliminating the need for external processing servers.

## Transcript Processing

Transcripts are automatically processed after upload. The processing:

1. Extracts text content from files if needed
2. Computes basic statistics like word count
3. Marks the transcript as processed in the database

The processing is triggered by a database insert trigger that calls the `transcript-webhook` edge function, which then invokes the `process-transcript` function.

## Troubleshooting

If you're experiencing issues with transcript processing:

1. Check the Transcript Diagnostics page to see any stuck or failed transcripts
2. Use the "Retry Processing" option for any stuck transcripts
3. Check the edge function logs if processing is failing repeatedly
4. Ensure your Supabase storage buckets are properly configured

### Common Issues and Solutions

#### Empty Content
If a transcript shows as having empty content:
- Select the transcript and use the "Fix Selected" option in the diagnostics
- This will attempt to retrieve content from the stored file

#### Stuck Processing
If transcripts are stuck in processing:
- Use the "Retry Stuck Transcripts" button in the diagnostics
- This will reset the processing state and trigger a new attempt

#### Processing Failures
If processing repeatedly fails:
- Check the edge function logs for specific error messages
- Ensure the transcript file is accessible in storage
- Verify the transcript has valid metadata

## Advanced Configuration

The system is designed to work out-of-the-box without additional configuration. All processing is handled directly by Supabase edge functions.

For more detailed information about the system architecture, please refer to the documentation in the project repository.

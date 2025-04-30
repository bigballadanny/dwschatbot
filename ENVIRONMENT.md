
# Transcript Processing System

This document provides information about the transcript processing system.

## System Overview

The transcript processing system is designed to:

1. Store and manage transcript files
2. Extract text content from files when needed
3. Process transcripts to extract useful information
4. Provide diagnostics and management tools

## Transcript Processing

Transcripts are automatically processed after upload. The processing:

1. Extracts text content from files if needed
2. Computes basic statistics like word count
3. Marks the transcript as processed in the database

## Troubleshooting

If you're experiencing issues with transcript processing:

1. Check the Transcript Diagnostics page to see any stuck or failed transcripts
2. Use the "Retry Processing" option for any stuck transcripts
3. Check the edge function logs if processing is failing repeatedly

## Advanced Configuration

The system is designed to work out-of-the-box without additional configuration. All processing is handled directly by Supabase edge functions.

For more detailed information about the system architecture, please refer to the documentation in the project repository.

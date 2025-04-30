
# Manual Testing Guide

This guide provides step-by-step instructions for manually testing our RAG system. Follow these procedures to verify functionality.

## Prerequisites

- Access to the application
- Sample transcript files for testing
- List of test queries

## Testing the RAG Pipeline

### 1. Transcript Upload and Processing

1. **Navigate to the upload page**
   - Go to the transcript upload interface
   - Verify the upload form is displayed correctly

2. **Upload a transcript file**
   - Select a sample transcript file
   - Enter metadata (optional topic, tags)
   - Submit the upload
   - Verify success notification

3. **Check processing status**
   - Navigate to the transcript management interface
   - Verify the uploaded transcript appears with correct status
   - Confirm chunking and embedding processing completed

### 2. Query Testing

1. **Basic query test**
   - Navigate to the chat interface
   - Enter a simple query related to the uploaded transcript
   - Verify response includes relevant information from the transcript
   - Check citation information is correct

2. **Complex query test**
   - Enter a more complex query requiring information synthesis
   - Verify response aggregates information from multiple chunks
   - Check for appropriate handling of uncertainty

3. **Hybrid search test**
   - Toggle the hybrid search option
   - Submit the same query
   - Compare results with non-hybrid search
   - Verify improvements in relevance

### 3. Feedback Mechanism

1. **Positive feedback test**
   - For a relevant result, provide positive feedback
   - Record the result ID and query

2. **Negative feedback test**
   - For an irrelevant result, provide negative feedback
   - Record the result ID and query

3. **Feedback verification**
   - Re-run the same queries
   - Verify that results with positive feedback appear higher in results
   - Verify that results with negative feedback appear lower or are excluded

### 4. Performance Assessment

1. **Response time measurement**
   - Use the browser's developer tools to measure response times
   - Record times for various query types and complexities
   - Note any performance bottlenecks

2. **Multi-user testing**
   - Have multiple users query the system simultaneously
   - Monitor system performance and response times
   - Check for any degradation under load

## Reporting Issues

For each test, document:
- Test date and time
- Test case description
- Expected result
- Actual result
- Screenshots/recordings (if applicable)
- Environment details (browser, OS, etc.)

Report any issues following the project's bug reporting template.

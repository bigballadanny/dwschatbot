
# Testing Plan

This document outlines the testing strategy for our RAG system.

## Testing Goals

- Verify the correct functioning of the chunking algorithms
- Test the embedding and vector search capabilities
- Validate the RAG pipeline end-to-end
- Ensure the feedback mechanism improves search results over time

## Test Types

### Unit Tests

- **Chunking Tests**: Verify various chunking strategies (sentence, paragraph, section, semantic) with different text formats
- **Vector Storage Tests**: Test the PGVector client's ability to store and retrieve embeddings
- **Feedback Integration Tests**: Validate that feedback properly affects relevance scores
- **Search Mode Tests**: Verify different search modes (hybrid, semantic, keyword, naive)

### Integration Tests

- **Full Pipeline Tests**: Test the entire RAG pipeline from document ingestion to query response
- **Supabase Integration**: Verify proper integration with Supabase for storage and retrieval
- **Search Strategy Tests**: Test the effectiveness of different search strategies on various query types

### Manual Tests

- **Upload a Transcript**: Test the transcript upload functionality
- **Query Relevance**: Manually verify query results for relevance
- **Feedback System**: Test providing feedback and observing improvements
- **Chunking Visualization**: Test the visualization tools for chunking analysis

## Test Procedure for Transcript Processing

1. **Preparation**:
   - Prepare a set of sample transcripts with varied content and lengths
   - Define expected chunks and embeddings for validation

2. **Document Ingestion Test**:
   - Upload a transcript through the UI
   - Verify the document is properly chunked
   - Use the chunking visualization tools to analyze chunk quality
   - Check that embeddings are generated and stored correctly

3. **Query Testing**:
   - Submit a series of predefined queries related to the transcript content
   - Test each search mode (hybrid, semantic, keyword, naive)
   - Evaluate response relevance and accuracy
   - Record baseline performance metrics

4. **Feedback Loop Testing**:
   - Provide positive feedback for relevant results
   - Provide negative feedback for irrelevant results
   - Submit the same queries again and verify improved results
   - Verify that relevance scores are updated correctly

5. **Performance Testing**:
   - Measure response times under different load conditions
   - Evaluate system performance with increasing document volumes
   - Test chunking performance with various strategies
   - Compare token usage estimates with actual usage

## Test Data Management

- Create a dedicated `test_data` directory with sample transcripts
- Include expected results for automated validation
- Track test metrics over time to measure system improvement

## Continuous Testing Strategy

- Implement automated tests as part of the CI/CD pipeline
- Run regression tests after significant changes to the chunking or embedding algorithms
- Periodically benchmark the system against baseline performance metrics

## UI-Based Testing Procedure

1. **Initial Testing via UI**:
   - Navigate to the chat interface
   - Upload a sample transcript
   - Verify that the transcript is processed without errors
   - Try initial queries to test basic functionality

2. **Search Mode Testing**:
   - Toggle between online search and local knowledge base
   - Compare results for the same query with different search modes
   - Verify that hybrid search provides more relevant results

3. **Feedback Collection**:
   - After receiving answers, provide feedback on relevance
   - Track if the feedback is properly recorded in the database
   - Test subsequent queries to see if results improve based on feedback

4. **Error Handling**:
   - Test with malformed queries
   - Test with empty transcript database
   - Verify appropriate error messages are displayed

## Debugging Strategy

- Use console logs to track the flow of data through the system
- Monitor Supabase database operations in real-time
- Use the chunking visualization tools to identify issues with document processing
- Track query performance metrics to identify bottlenecks

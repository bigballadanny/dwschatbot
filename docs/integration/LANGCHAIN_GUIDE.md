# LangChain Integration Guide

## Overview

This guide explains how to integrate LangChain into the DWS Chatbot project to enhance its RAG (Retrieval Augmented Generation) capabilities. LangChain provides a robust framework for building applications with LLMs (Large Language Models).

## Why LangChain?

LangChain offers several advantages for our AI-powered chatbot:

1. **RAG Enhancements**: Advanced retrieval components that outperform basic vector search
2. **Prompt Management**: Structured approach to creating and managing prompts
3. **Chain Composition**: Easily combine multiple AI operations into coherent workflows
4. **Agent Architecture**: Build autonomous agents with reasoning capabilities
5. **Multi-modal Support**: Work with text, images, and other data formats

## Installation

### Edge Functions (Deno)

```typescript
// Import LangChain modules in Deno environment
import { OpenAI } from "https://esm.sh/langchain/llms/openai";
import { PromptTemplate } from "https://esm.sh/langchain/prompts";
import { RetrievalQAChain } from "https://esm.sh/langchain/chains";
```

### TypeScript (Node.js)

```bash
# Install core LangChain package
npm install langchain

# Install provider-specific packages
npm install @langchain/openai @langchain/supabase
```

## Basic LangChain Concepts

### 1. Models

Models are the foundation of LangChain. They represent the LLMs and other AI models that power your application.

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { VertexAI } from "@langchain/vertex-ai";

// Initialize a Claude model
const claudeModel = new ChatAnthropic({
  modelName: "claude-3-5-sonnet-20240620",
  apiKey: process.env.ANTHROPIC_API_KEY,
  temperature: 0.7
});

// Initialize a Vertex AI model
const vertexModel = new VertexAI({
  model: "gemini-2.0-flash",
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: "us-central1"
});
```

### 2. Prompts

Prompts are templates for generating inputs to your models.

```typescript
import { PromptTemplate } from "langchain/prompts";

// Create a prompt template for transcript analysis
const transcriptAnalysisPrompt = PromptTemplate.fromTemplate(`
As a business acquisition expert, analyze the following transcript excerpt:

TRANSCRIPT:
{transcript}

Please provide:
1. Key business insights
2. Potential acquisition strategies mentioned
3. Important figures or statistics
4. Action items for potential buyers

Be specific and provide direct quotes where relevant.
`);

// Generate a prompt with variables filled in
const formattedPrompt = await transcriptAnalysisPrompt.format({
  transcript: "Transcript content goes here..."
});
```

### 3. Chains

Chains combine prompts, models, and other components into cohesive workflows.

```typescript
import { LLMChain } from "langchain/chains";

// Create a simple chain that formats a prompt and sends it to a model
const analysisChain = new LLMChain({
  llm: claudeModel,
  prompt: transcriptAnalysisPrompt
});

// Run the chain
const result = await analysisChain.call({
  transcript: "Transcript content goes here..."
});

console.log(result.text);
```

## RAG with LangChain and Supabase

LangChain provides excellent tools for implementing RAG with Supabase:

```typescript
import { SupabaseVectorStore } from "@langchain/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "@supabase/supabase-js";
import { RetrievalQAChain, loadQARefineChain } from "langchain/chains";

// Initialize Supabase client
const supabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Initialize embeddings model
const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY
});

// Create vector store
const vectorStore = new SupabaseVectorStore(embeddings, {
  client: supabaseClient,
  tableName: "transcript_chunks",
  queryName: "match_transcript_chunks"
});

// Create a retriever
const retriever = vectorStore.asRetriever({
  searchKwargs: {
    k: 5,  // Number of documents to retrieve
    filter: {
      source: "business_acquisitions_summit"
    }
  }
});

// Create a QA chain with the retriever and model
const qaChain = RetrievalQAChain.fromLLM(claudeModel, retriever);

// Answer questions with context
const answer = await qaChain.call({
  query: "What acquisition strategies were mentioned in Carl Allen's talk?"
});

console.log(answer.text);
```

## Advanced Techniques

### Hybrid Search

Combine semantic (vector) search with keyword search for better results:

```typescript
import { HybridizerBase } from "langchain/retrievers/hyde";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";

// Create a hybrid retriever that combines vector search with BM25
const hybridRetriever = new ParentHybridRetriever({
  vectorRetriever: vectorRetriever,
  keywordRetriever: bm25Retriever,
  vectorWeight: 0.75,  // Weight for vector search results (0-1)
  keywordWeight: 0.25  // Weight for keyword search results (0-1)
});

// Use the hybrid retriever in a QA chain
const hybridQaChain = new RetrievalQAChain({
  retriever: hybridRetriever,
  combineDocsChain: createStuffDocumentsChain({
    llm: claudeModel,
    prompt: qaPrompt
  })
});
```

### Context Windowing

Handle large documents with context windowing:

```typescript
import { ContextualCompressionRetriever } from "langchain/retrievers/contextual_compression";
import { LLMChainExtractor } from "langchain/retrievers/document_compressors/chain_extract";

// Create a document compressor
const compressor = new LLMChainExtractor({
  llm: claudeModel,
  verbose: true
});

// Create a contextual compression retriever
const compressionRetriever = new ContextualCompressionRetriever({
  baseRetriever: retriever,
  documentCompressor: compressor
});
```

### Agents

Create autonomous agents that can perform complex reasoning:

```typescript
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage } from "@langchain/core/messages";
import { DynamicTool, ChainTool } from "@langchain/core/tools";

// Create tools for the agent
const searchTool = new DynamicTool({
  name: "search_transcripts",
  description: "Search for information in transaction transcripts",
  func: async (query: string) => {
    // Implement search logic
    return "Search results for: " + query;
  }
});

const analyzeTool = new ChainTool({
  name: "analyze_transcript",
  description: "Analyze a transcript for business insights",
  chain: analysisChain
});

// Create an agent with the tools
const agent = createOpenAIFunctionsAgent({
  llm: new ChatOpenAI({ temperature: 0 }),
  tools: [searchTool, analyzeTool],
  systemMessage: new SystemMessage(
    "You are an assistant that helps with business acquisition research."
  )
});

// Create an executor for the agent
const agentExecutor = new AgentExecutor({
  agent,
  tools: [searchTool, analyzeTool]
});

// Run the agent
const result = await agentExecutor.invoke({
  input: "Find strategies for acquiring small businesses mentioned by Carl Allen"
});

console.log(result.output);
```

## Integration with n8n Workflows

LangChain can be used in n8n workflows for complex document processing:

```typescript
// Example LangChain code that could be used in an n8n custom node
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";

// Define a function that could be called from n8n
export async function processTranscript(transcript, options) {
  // Create a text splitter
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: options.chunkSize || 1000,
    chunkOverlap: options.chunkOverlap || 100
  });
  
  // Split the transcript into chunks
  const docs = await textSplitter.createDocuments([transcript.content]);
  
  // Add metadata to each chunk
  const enhancedDocs = docs.map((doc, i) => new Document({
    pageContent: doc.pageContent,
    metadata: {
      ...transcript.metadata,
      chunk_index: i,
      source: transcript.title,
      transcript_id: transcript.id
    }
  }));
  
  // Return the processed chunks
  return enhancedDocs;
}
```

## Resources

- [LangChain Documentation](https://js.langchain.com/docs/)
- [LangChain GitHub Repository](https://github.com/langchain-ai/langchainjs)
- [Supabase Vector Store Guide](https://js.langchain.com/docs/integrations/vectorstores/supabase)
- [RAG Best Practices](https://blog.langchain.dev/rag-best-practices/)
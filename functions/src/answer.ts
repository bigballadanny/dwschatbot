
import { onCall } from "firebase-functions/v2/https";
// Assuming vectorStore might be part of the core firebase plugin or initialized elsewhere
// If this fails, we may need to revisit Genkit setup
import { vectorStore } from "@genkit-ai/firebase/store"; 
import { gemini10Pro } from "@genkit-ai/googleai"; // Changed geminiPro to gemini10Pro
import * as logger from "firebase-functions/logger";
// Attempting to import Document type - this path might also need correction if build fails
import { Document } from '@genkit-ai/ai/document'; 

export const answer = onCall({ memory: "512MiB", concurrency: 10, timeoutSeconds: 30 }, async ({ data, auth }) => {
  if (!auth) {
    logger.error("Unauthenticated access attempt to answer function");
    throw new Error("Authentication required");
  }
  
  const { question, source } = data;
  
  logger.info(`Processing question: "${question.substring(0, 50)}..." for user ${auth.uid}`);

  // Search for relevant documents in the vector store
  // Note: The structure and existence of vectorStore might need verification
  const docs = await vectorStore.similaritySearch(question, 12, {
    filter: source ? { "metadata.source": source } : undefined
  });

  logger.info(`Found ${docs.length} relevant documents for the query`);
  
  // Extract text from documents and join to create context
  // Added Document type annotation for 'd'
  const context = docs.map((d: Document) => d.text).join("

");
  
  // Build prompt with retrieved context
  const prompt = `You are Carl Allen AI Analyst.
  
Context:
${context}

Question: ${question}

Answer:`;

  // Generate response using Gemini 1.0 Pro
  // Changed to use gemini10Pro
  const { text } = await gemini10Pro.generateText({ text: prompt });
  
  logger.info(`Generated response of ${text.length} characters`);
  
  // Return the answer
  // Added Document type annotation for 'd'
  return { 
    answer: text,
    sources: docs.map((d: Document) => d.metadata?.source).filter(Boolean)
  };
});

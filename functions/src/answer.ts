
import { onCall } from "firebase-functions/v2/https";
import { vectorStore } from "@genkit-ai/firebase/store";
import { geminiPro } from "@genkit-ai/googleai";
import * as logger from "firebase-functions/logger";

export const answer = onCall({ timeoutSeconds: 30 }, async ({ data, auth }) => {
  if (!auth) {
    logger.error("Unauthenticated access attempt to answer function");
    throw new Error("Authentication required");
  }
  
  const { question, source } = data;
  
  logger.info(`Processing question: "${question.substring(0, 50)}..." for user ${auth.uid}`);

  // Search for relevant documents in the vector store
  const docs = await vectorStore.similaritySearch(question, 12, {
    filter: source ? { "metadata.source": source } : undefined
  });

  logger.info(`Found ${docs.length} relevant documents for the query`);
  
  // Extract text from documents and join to create context
  const context = docs.map(d => d.text).join("\n\n");
  
  // Build prompt with retrieved context
  const prompt = `You are Carl Allen AI Analyst.
  
Context:
${context}

Question: ${question}

Answer:`;

  // Generate response using Gemini Pro
  const { text } = await geminiPro.generateText({ text: prompt });
  
  logger.info(`Generated response of ${text.length} characters`);
  
  // Return the answer
  return { 
    answer: text,
    sources: docs.map(d => d.metadata?.source).filter(Boolean)
  };
});

import { defineFlow, useGenAI } from '@genkit-ai/core';
import { retrieveContext } from '../lib/retriever';
import * as z from 'zod';

// Define input schema for the flow
const answerFlowInputSchema = z.object({
  question: z.string().describe('The user's question.'),
  uid: z.string().describe('The user's unique ID for data isolation.'),
  source: z.string().optional().describe('Optional source identifier (e.g., transcript name).'),
  // Optional: Add a category filter here to scope the search, if needed
  // category: z.string().optional().describe('Optional category to filter the context.'),
});

// Define the flow using defineFlow
export const answerFlow = defineFlow(
  {
    name: 'answerFlow',
    inputSchema: answerFlowInputSchema,
    outputSchema: z.object({
      answerText: z.string().describe('The AI's answer to the question.'),
      citations: z.array(z.string()).describe('Citations for the answer.').optional(),
    }),
  },
  async (input, context) => {
    console.log(\`Executing answerFlow for UID: ${input.uid}, Question: ${input.question.substring(0, 50)}...\`)
    
    // 1. Retrieve Context
    const contextChunks = await retrieveContext(input.question, input.uid);
    
    console.log(`Retrieved ${contextChunks.length} context chunks.`);
    
    // 2. Craft Prompt
    const prompt = `You are Carl Allen AI Coach, providing guidance based on business acquisitions. Use the provided context to answer the question clearly and concisely. Cite the sources where possible.

Context:
${contextChunks.join('
---
')}

Question: ${input.question}

Answer:`;
    
    // 3. Call Gemini Pro (or other configured model) - streaming disabled for Cloud Function
    const genAI = useGenAI();
    const generateResult = await genAI.generate({
      prompt: prompt,
      maxOutputTokens: 2048, // Set token limit appropriately
      // The model is already configured globally in genkit.config.ts
    });
    
    const answerText = generateResult.text();
    console.log("Generated answer (length:" + answerText.length + ")");

    // Basic Citation Extraction (improve as needed, potentially with AI)
    const citationRegex = /\(Source: (.*?)\)/g; // Basic regex to find citations
    const citations: string[] = [];
    let match;
    while ((match = citationRegex.exec(answerText)) !== null) {
      citations.push(match[1].trim());
    }
    
    console.log("Extracted citations:", citations);

    // 4. Return Results
    return {
      answerText: answerText,
      citations: citations.length > 0 ? citations : undefined, // Only return if citations were found
    };
  }
);

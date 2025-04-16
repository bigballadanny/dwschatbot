
import { retrieve } from '@genkit-ai/ai/vector';
import { Document } from '@genkit-ai/ai/document';
import { MaximalMarginalRelevanceRetriever } from '@genkit-ai/ai/retriever';
import { defineFirestoreVectorStore } from '@genkit-ai/firebase/firestore';
import { googleAI } from '@genkit-ai/googleai'; // Needed for embedder reference
import * as z from 'zod';

// Define metadata schema again for retriever context
const VectorMetadataSchema = z.object({
    uid: z.string(),
    source: z.string(),
    idx: z.number(),
});

// Define the Firestore vector store (using default collection from config)
// Note: Ensure the embedder matches the one used for indexing
const vectorStore = defineFirestoreVectorStore({
    collection: 'vectors', // Ensure this matches ingest function and config
    metadataSchema: VectorMetadataSchema,
    embedder: { provider: 'googleai', id: 'vertex/textembedding-gecko@003' }, // Specify embedder used for indexing
});

/**
 * Retrieves relevant document chunks for a given query and user ID.
 *
 * @param query The user's question.
 * @param uid The user's ID to filter documents.
 * @param k The number of chunks to retrieve initially.
 * @returns An array of relevant chunk text content.
 */
export async function retrieveContext(query: string, uid: string, k = 12): Promise<string[]> {
    console.log(`Retrieving context for UID: ${uid}, K=${k}, Query: "${query.substring(0, 50)}..."`);

    try {
        // 1. Perform initial similarity search with filtering by UID
        const retrievedDocs = await retrieve({
            vectorStore: vectorStore,
            query: query,
            k: k, // Retrieve initial K documents
            options: {
                // Filter metadata to only include chunks belonging to the specific user
                where: { uid: { '$eq': uid } },
                 // TODO: Add keyword filter based on query analysis later?
                 // Example: where: { uid: { '$eq': uid }, keywords: { '$in': extractedKeywords } },
            },
        });

        console.log(`Retrieved ${retrievedDocs.length} initial documents via similarity search.`);

        if (!retrievedDocs || retrievedDocs.length === 0) {
            console.log('No relevant documents found.');
            return []; // Return empty array if nothing found
        }

        // 2. Apply MMR re-ranking to improve diversity
        // Note: MMR requires the query embedding, retrieve doesn't expose it directly.
        // We need to re-embed the query here or adjust the retrieve call if possible.
        // For simplicity now, we'll use the MMR retriever which handles embedding.

        // Using the MMR Retriever directly
        const mmrRetriever = new MaximalMarginalRelevanceRetriever({
            vectorStore: vectorStore,
            k: k, // Initial retrieval count for MMR candidate pool
            fetchK: k * 5, // Fetch more candidates for better MMR selection (tune as needed)
            lambda: 0.6, // Balance between similarity and diversity (0=max diversity, 1=max similarity)
            filter: { uid: { '$eq': uid } } // Apply UID filter directly in MMR retriever
        });

        const mmrDocs = await mmrRetriever.retrieve(query);

        console.log(`Retrieved ${mmrDocs.length} documents after MMR re-ranking.`);

        // 3. Return an array of chunk texts
        const contextChunks = mmrDocs.map(doc => doc.text());

        // Log snippet of context for debugging
        // contextChunks.forEach((chunk, i) => console.log(`Context ${i+1}: ${chunk.substring(0, 100)}...`));

        return contextChunks;

    } catch (error) {
        console.error("Error retrieving context:", error);
        // Depending on desired behavior, either throw or return empty array
        // throw new Error(`Failed to retrieve context: ${error.message}`);
        return []; // Return empty array on error for graceful failure in the flow
    }
}

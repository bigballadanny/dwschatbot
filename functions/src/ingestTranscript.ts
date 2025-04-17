
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { defineFlow, runFlow } from '@genkit-ai/firebase/functions';
import { getModel, getEmbedder } from '@genkit-ai/firebase/functions';
import { downloadObject, getObjectMetadata } from '@genkit-ai/firebase/storage';
import { upsert } from '@genkit-ai/ai/vector';
import { chunk } from '@genkit-ai/ai/retriever';
import { Document } from '@genkit-ai/ai/document';
import { genkitMetric } from '@genkit-ai/core/metrics';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as z from 'zod';

// Define Firestore client (outside handler for potential reuse)
const db = getFirestore();

// Define metric for tracking chunks
const chunksStoredMetric = genkitMetric(
    'chunks_stored',
    { unit: '{chunk}', description: 'Number of text chunks stored in vector DB' }
);

// Helper to extract text (supports pdf, txt)
async function extractText(filePath: string, contentType: string): Promise<string> {
    if (contentType === 'application/pdf') {
        try {
            const pdf = require('pdf-parse');
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            return data.text;
        } catch (error) {
            console.error("Error parsing PDF:", error);
            throw error;
        }
    } else if (contentType === 'text/plain') {
        return fs.readFileSync(filePath, 'utf-8');
    } else {
        console.warn(`Unsupported content type: ${contentType}`);
        return ''; // Return empty for unsupported types
    }
}

// Define the ingestion flow (optional but good practice)
const ingestAndIndexFlow = defineFlow(
    {
        name: 'ingestAndIndexFlow',
        inputSchema: z.object({ 
          filePath: z.string(), 
          bucket: z.string(), 
          uid: z.string(), 
          sourceName: z.string() 
        }),
        outputSchema: z.void(),
    },
    async ({ filePath, bucket, uid, sourceName }) => {
        const tempFilePath = path.join(os.tmpdir(), path.basename(filePath));
        let textContent = '';
        let chunksStored = 0;

        try {
            console.log(`Starting ingestion for: ${filePath}`);
            const metadata = await getObjectMetadata({ bucket, name: filePath });
            const contentType = metadata?.contentType || 'application/octet-stream';
            console.log(`Content type: ${contentType}`);

            // 1. Download file
            console.log(`Downloading to: ${tempFilePath}`);
            await downloadObject({ bucket, source: filePath, destination: tempFilePath });
            console.log('Download complete.');

            // 2. Extract text
            textContent = await extractText(tempFilePath, contentType);
            if (!textContent) {
                console.warn('No text extracted, skipping further processing.');
                return;
            }
            console.log(`Text extracted (length: ${textContent.length})`);

            // 3. Chunk text
            // Aim for ~800 tokens, with ~20% overlap.
            // Adjust chunkSize based on average token/char ratio (e.g., 4 chars/token -> 3200 chars)
            const documents = await chunk({ text: textContent, chunkSize: 3200 }); 
            console.log(`Created ${documents.length} chunks.`);

            // 4. Embed and Upsert chunks
            const embedder = getEmbedder({ provider: 'googleai', id: 'vertex/textembedding-gecko@003' });
            const vectors = [];
            for (let i = 0; i < documents.length; i++) {
                const doc = Document.fromText(documents[i], { uid, source: sourceName, idx: i });
                vectors.push({ doc, embedding: await embedder.embed({ content: doc }) });
            }
            console.log(`Generated ${vectors.length} embeddings.`);

            // Upsert into Firestore Vector Store (ensure store is defined in genkit.config)
            await upsert(vectors);
            chunksStored = vectors.length;
            console.log(`Upserted ${chunksStored} vectors to Firestore.`);

            // Log metric
            chunksStoredMetric.record(chunksStored);

            // 5. Generate Summary
            console.log('Generating summary...');
            const llm = getModel({ provider: 'googleai', id: 'vertex/gemini-pro' });
            const summaryPrompt = `Provide a concise one-paragraph summary of the following transcript content:

---
${textContent.substring(0, 10000)}... 
---

Summary:`;
            const summaryResult = await llm.generate({ prompt: summaryPrompt });
            const summaryText = summaryResult.text();

            // Write summary to Firestore
            const fileId = path.basename(filePath, path.extname(filePath)); // Get filename without ext
            const summaryRef = db.collection('summaries').doc(fileId);
            await summaryRef.set({
                summary: summaryText,
                originalPath: filePath,
                uid: uid,
                createdAt: new Date(),
            });
            console.log(`Summary saved to summaries/${fileId}`);

        } catch (err) {
            console.error(`Error during ingestion for ${filePath}:`, err);
            // Optionally, log error to monitoring/logging service
            throw err; // Rethrow to mark function execution as failed if needed
        } finally {
            // Clean up temporary file
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
                console.log(`Cleaned up temp file: ${tempFilePath}`);
            }
        }
    }
);

// Cloud Function Trigger
export const ingestTranscript = onObjectFinalized(
    { 
      cpu: 1, 
      memory: '1GiB', 
      timeoutSeconds: 540, 
      region: 'us-central1', 
      bucket: process.env.GCLOUD_BUCKET || '', // Set bucket via env var
      secrets: ['GOOGLE_APPLICATION_CREDENTIALS'] // Ensure credentials are accessible
    },
    async (event) => {
        const fileBucket = event.data.bucket;
        const filePath = event.data.name;
        const contentType = event.data.contentType;

        console.log(`Processing finalized object: ${filePath} in bucket: ${fileBucket}`);

        // Basic validation
        if (!filePath?.startsWith('transcripts/')) {
            console.log('Object is not in the transcripts/ path, ignoring.');
            return;
        }
        if (!contentType || (!contentType.includes('pdf') && !contentType.includes('text'))) {
            console.log(`Unsupported content type ${contentType}, ignoring.`);
            return;
        }

        // Extract UID and source filename from path (e.g., transcripts/user123/meeting_notes.pdf)
        const pathParts = filePath.split('/');
        if (pathParts.length < 3) {
            console.error('Invalid file path structure. Expected transcripts/{uid}/{filename}');
            return; // Or handle error appropriately
        }
        const uid = pathParts[1];
        const sourceName = pathParts[pathParts.length - 1]; // Original filename

        console.log(`Extracted UID: ${uid}, Source Name: ${sourceName}`);

        try {
            // Run the ingestion flow
            await runFlow(ingestAndIndexFlow, { filePath, bucket: fileBucket, uid, sourceName });
            console.log(`Successfully processed ${filePath}`);
        } catch (error) {
            console.error(`Failed to process ${filePath}:`, error);
            // Optionally, move the file to an error bucket or log failure state
        }
    }
);

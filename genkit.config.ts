
import { configureGenkit } from '@genkit-ai/core';
import { firebase } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/googleai';
import { defineFirestoreVectorStore } from '@genkit-ai/firebase/firestore';
import * as z from 'zod';

// Define the structure for vector metadata (optional but good practice)
const VectorMetadataSchema = z.object({
  uid: z.string(),
  source: z.string(),
  idx: z.number(),
});

export default configureGenkit({
  plugins: [
    // Firebase plugin for Cloud Functions, Firestore, etc.
    firebase(),
    // Google AI plugin for Vertex AI models
    googleAI({
      location: 'us-central1',
    }),
    // Define the Firestore vector store plugin
    defineFirestoreVectorStore({
      collection: 'vectors',
      metadataSchema: VectorMetadataSchema,
    }),
  ],
  // Default model provider configuration
  model: {
    provider: 'googleai',
    id: 'vertex/gemini-pro',
    config: {
      location: 'us-central1',
    },
  },
  // Default embedder configuration
  embedder: {
    provider: 'googleai',
    id: 'vertex/textembedding-gecko@003',
    config: {
      location: 'us-central1',
    }
  },
  flowStateStore: { provider: 'firebase' },
  traceStore: { provider: 'firebase' },
  telemetry: {
    disabled: process.env.GENKIT_TELEMETRY_DISABLED === 'true',
  },
});

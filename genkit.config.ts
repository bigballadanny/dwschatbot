
import { firebase } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/googleai';
import { configureGenkit } from '@genkit-ai/core';
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
        // Optional: Specify location if needed for regional control 
        // (though often inferred or set globally)
        // location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
        // Optional: Specify project ID if needed
        // projectId: process.env.GOOGLE_CLOUD_PROJECT,
    }),
    // Define the Firestore vector store plugin
    defineFirestoreVectorStore({
      collection: 'vectors', // Collection name matching ingest function
      metadataSchema: VectorMetadataSchema, // Define metadata structure
      // Optional: Specify firestore instance if not default
      // client: yourFirestoreClient,
    }),
  ],
  // Default model provider configuration
  model: {
    provider: 'googleai', // Use the googleAI plugin
    // Specify the Vertex AI Gemini Pro model and region
    id: 'vertex/gemini-pro',
    config: {
      location: 'us-central1',
    },
  },
  // Default embedder configuration (can be overridden in flows)
  embedder: {
      provider: 'googleai',
      id: 'vertex/textembedding-gecko@003', // Using the specified Gecko model
      config: {
        location: 'us-central1',
      }
  },
  flowStateStore: { provider: 'firebase' }, // Store flow states in Firestore
  traceStore: { provider: 'firebase' },     // Store traces in Firestore
  telemetry: {
    // Disable Genkit telemetry if desired (set env var)
    disabled: process.env.GENKIT_TELEMETRY_DISABLED === 'true',
    // Optional: Configure instrumentor for specific logging/tracing if needed
    // instrumentor: new YourCustomInstrumentor(), 
  },
  // Optional: Set log level
  // logLevel: 'debug',
});

// Environment variable stubs (for reference, actual values set in environment)
// process.env.GOOGLE_CLOUD_PROJECT = 'your-gcp-project-id';
// process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/your/credentials.json';

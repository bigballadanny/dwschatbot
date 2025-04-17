
/**
 * Index file that exports all Cloud Functions
 */

// Import function triggers
import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// Import our functions
export * from "./ingestTranscript.js";
export * from "./answer.js";

// Example hello world function for testing
export const helloWorld = onCall((request) => {
  logger.info("Hello from Firebase!", {structuredData: true});
  return { message: "Hello from Firebase!" };
});

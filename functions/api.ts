import { onCall } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { onCall as onCallGenkit } from 'firebase-functions/genkit';
import { answerFlow } from '../flows/answer';

// You can access the project ID from the Firebase plugin, too
const projectId = defineSecret('GOOGLE_CLOUD_PROJECT');

/**
 * Callable function that wraps the answerFlow.
 * Requires authentication; passes the authenticated user's UID to the flow.
 */
export const ask = onCallGenkit(
    {
        enforceAppCheck: false, // Disable app check for simplicity (can be enabled for production)
    },
    async (request, context) => {
        // Enforce authentication
        if (!context.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required.');
        }
        
        // Pass the authenticated user's UID to the flow
        const uid = context.auth.uid;
        
        console.log(`Executing ask function for user ${uid} with query: ${request.data?.question?.substring(0,50)}...`);
        
        // Call the answerFlow and return the result
        try {
            const result = await answerFlow(
              {
                question: request.data.question,
                uid: uid,
                source: request.data.source || '' // Optional source
              },
              context
            );
            return result;
        } catch (error) {
            console.error("Error executing answerFlow:", error);
            throw new HttpsError('internal', 'Failed to generate answer', { details: error.message });
        }
    }
);

/**
 * Optional helper function to manually trigger transcript ingestion (for development/testing)
 * To use this, you would call this function directly from client code
 * after deployment, passing the desired file path.
 */
// Leaving this out for now to keep it streamlined
// export const testIngest = onCall(
//   async (request: functions.https.CallableRequest<{
//     filePath: string;
//   }>, context: functions.https.CallableContext) => {
//   
//     // Only allow authenticated users to trigger
//     if (!context.auth) {
//       throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
//     }
//   
//     const filePath = request.data.filePath;
//     
//     if (!filePath) {
//       throw new functions.https.HttpsError('invalid-argument', 'Missing filePath parameter');
//     }
//   
//     console.log(`Attempting to manually ingest: ${filePath}`);
//   
//     // For simplicity, call the same logic as the trigger
//     try {
//       await ingestTranscriptFunction({
//         name: filePath
//       });
//       return { success: true, message: `Ingestion triggered for ${filePath}` };
//     } catch (error) {
//       console.error("Error triggering ingestion:", error);
//       throw new functions.https.HttpsError('internal', 'Ingestion failed', { details: error.message });
//     }
//   }
// );
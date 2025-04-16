
import { onCall } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { onCall as onCallGenkit } from '@genkit-ai/firebase/functions';
import { answerFlow } from '../../flows/answer';

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

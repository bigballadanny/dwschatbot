
import { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { MessageSource } from '@/utils/messageUtils';

// Firebase configuration - replace with your actual Firebase project config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

// Get the callable function reference
const askFunction = httpsCallable(functions, 'ask');

export interface ChatApiResponse {
  answerText: string;
  citations?: string[];
  source?: MessageSource;
}

export function useChatApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askQuestion = async (question: string, userId: string): Promise<ChatApiResponse> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Sending question to Firebase function: ${question.substring(0, 50)}...`);
      
      const response = await askFunction({ 
        question, 
        uid: userId 
      });
      
      console.log('Response received from Firebase function:', response.data);
      
      const data = response.data as { 
        answerText: string; 
        citations?: string[] 
      };
      
      // Determine source based on citations
      const source: MessageSource = data.citations && data.citations.length > 0 
        ? 'transcript' 
        : 'vertex';
        
      return {
        answerText: data.answerText,
        citations: data.citations,
        source
      };
    } catch (err) {
      console.error('Error in askQuestion:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw new Error(`Failed to get answer: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    askQuestion,
    isLoading,
    error
  };
}

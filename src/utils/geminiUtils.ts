
import { supabase } from '@/integrations/supabase/client';
import { MessageProps } from '@/components/MessageItem';
import { searchTranscriptsForQuery } from './transcriptUtils';

interface Transcript {
  id: string;
  title: string;
  content: string;
  created_at: string;
  file_path?: string;
}

export const generateGeminiResponse = async (
  query: string, 
  transcripts: Transcript[], 
  chatHistory: MessageProps[]
): Promise<MessageProps> => {
  try {
    // First check if we have relevant information in transcripts
    const matchedContent = searchTranscriptsForQuery(query, transcripts);
    
    // Create context from the matched content if available
    let contextPrompt = "";
    if (matchedContent) {
      contextPrompt = `Use the following information from Carl Allen's transcript to answer the question: "${matchedContent.content}"`;
    }
    
    // Prepare conversation history for the API
    const messages = chatHistory.map(msg => ({
      content: msg.content,
      source: msg.source
    }));

    // Call our Gemini edge function
    const { data, error } = await supabase.functions.invoke('gemini-chat', {
      body: { 
        query,
        messages,
        context: contextPrompt 
      }
    });

    if (error) {
      console.error('Error invoking Gemini function:', error);
      throw new Error(error.message);
    }

    // Create a response from the Gemini data
    return {
      content: data.content,
      source: 'gemini',
      citation: matchedContent ? `Based on information from "${matchedContent.title}"` : undefined,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error generating Gemini response:', error);
    return {
      content: "I'm sorry, I couldn't process your request. Please try again later.",
      source: 'system',
      timestamp: new Date()
    };
  }
};

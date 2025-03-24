
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
    let bookReference = "";
    
    if (matchedContent) {
      contextPrompt = `Use the following information from Carl Allen's "The Creative Dealmaker" book to answer the question: "${matchedContent.content}"`;
      bookReference = matchedContent.title;
    } else {
      // If no matched content, still provide context about the book
      contextPrompt = `You are an AI assistant specialized in Carl Allen's "The Creative Dealmaker" book, which covers business acquisitions, deal structuring, negotiations, and due diligence. If you don't have specific information about a topic from the book, acknowledge that you don't have that specific section from the book yet, but try to provide general guidance based on Carl Allen's business acquisition methodology.`;
    }
    
    // Prepare conversation history for the API
    const messages = chatHistory.map(msg => ({
      content: msg.content,
      source: msg.source
    }));

    // Add additional instructions to format the response well
    const formattingInstructions = `
    When formatting your response:
    1. Use bullet points (•) for lists
    2. Use numbered lists (1., 2., etc.) for step-by-step instructions
    3. Use bold (**text**) for important concepts
    4. Break content into clear paragraphs
    5. If you're referencing "The Creative Dealmaker" book, mention it explicitly
    6. If you don't have specific information from the book about a topic, acknowledge this clearly
    `;

    // Call our Gemini edge function
    const { data, error } = await supabase.functions.invoke('gemini-chat', {
      body: { 
        query,
        messages,
        context: contextPrompt,
        instructions: formattingInstructions
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
      citation: matchedContent ? `Based on information from "${bookReference}" by Carl Allen` : 
               "Based on general knowledge about Carl Allen's business acquisition methodology",
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

import { supabase } from '@/integrations/supabase/client';
import { MessageProps } from '@/components/MessageItem';
import { searchTranscriptsForQuery, getSourceDescription, Transcript } from './transcriptUtils';

export const generateGeminiResponse = async (
  query: string, 
  transcripts: Transcript[], 
  chatHistory: MessageProps[],
  conversationId?: string | null
): Promise<MessageProps> => {
  try {
    // Ensure we have the latest transcripts by fetching them directly from the database
    // This ensures newly uploaded transcripts are immediately available
    const { data: latestTranscripts, error } = await supabase
      .from('transcripts')
      .select('id, title, content, created_at, file_path, source');
      
    if (error) {
      console.error('Error fetching latest transcripts:', error);
      // Fallback to provided transcripts if query fails
    }
    
    // Use the latest transcripts if available, otherwise use the provided ones
    const transcriptsToSearch = latestTranscripts || transcripts;
    
    console.log(`Searching through ${transcriptsToSearch.length} transcripts for query: "${query}"`);
    
    const startTime = Date.now();
    
    // First check if we have relevant information in transcripts
    const matchedContent = searchTranscriptsForQuery(query, transcriptsToSearch as Transcript[]);
    
    const searchTime = Date.now() - startTime;
    console.log(`Transcript search completed in ${searchTime}ms`);
    
    // Create context from the matched content if available
    let contextPrompt = "";
    let bookReference = "";
    let sourceType = "";
    let relevanceScore = 0;
    
    if (matchedContent) {
      // Get the source description for better context
      sourceType = matchedContent.source || 'creative_dealmaker';
      const sourceDescription = getSourceDescription(sourceType);
      relevanceScore = matchedContent.relevanceScore || 0;
      
      console.log(`Found matching content in source: ${sourceType}, title: "${matchedContent.title}" with relevance score: ${relevanceScore}`);
      contextPrompt = `Use the following information from ${sourceDescription} to answer the question: "${matchedContent.content}"`;
      bookReference = matchedContent.title;
    } else {
      // If no matched content, still provide context about the book
      console.log('No specific matching content found in transcripts');
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
    3. Use bold (**text**) for important concepts, terms, and headings
    4. Break content into clear paragraphs with good spacing
    5. If you're referencing "The Creative Dealmaker" book or other sources, mention it explicitly
    6. If you don't have specific information from the book about a topic, acknowledge this clearly
    7. Use headings to organize long responses
    8. Format numerical values, percentages, and money values consistently
    9. End with a clear conclusion or summary for long responses
    `;

    const apiStartTime = Date.now();
    
    // Call our Gemini edge function
    const { data, error: functionError } = await supabase.functions.invoke('gemini-chat', {
      body: { 
        query,
        messages,
        context: contextPrompt,
        instructions: formattingInstructions,
        sourceType: sourceType
      }
    });

    const apiTime = Date.now() - apiStartTime;
    console.log(`Gemini API call completed in ${apiTime}ms`);

    if (functionError) {
      console.error('Error invoking Gemini function:', functionError);
      throw new Error(functionError.message);
    }

    // Create a citation based on the source
    let citation = "";
    if (matchedContent) {
      if (sourceType === 'creative_dealmaker') {
        citation = `Based on information from "${bookReference}" in Carl Allen's Creative Dealmaker book`;
      } else if (sourceType === 'mastermind_call') {
        citation = `Based on information from Carl Allen's mastermind call: "${bookReference}"`;
      } else if (sourceType === 'case_study') {
        citation = `Based on the case study: "${bookReference}"`;
      } else if (sourceType === 'protege_call') {
        citation = `Based on information from Carl Allen's Protege call: "${bookReference}"`;
      } else if (sourceType === 'foundations_call') {
        citation = `Based on information from Carl Allen's Foundations call: "${bookReference}"`;
      } else {
        citation = `Based on information from "${bookReference}" by Carl Allen`;
      }
    } else {
      citation = "Based on general knowledge about Carl Allen's business acquisition methodology";
    }

    console.log(`Generated response with citation: ${citation}`);
    
    // Log analytics data
    if (conversationId) {
      try {
        await supabase.from('chat_analytics').insert([{
          conversation_id: conversationId,
          query: query,
          response_length: data.content.length,
          source_type: sourceType || 'general',
          relevance_score: relevanceScore,
          search_time_ms: searchTime,
          api_time_ms: apiTime,
          transcript_title: bookReference || null,
          successful: true
        }]);
      } catch (analyticsError) {
        console.error('Error logging analytics:', analyticsError);
        // Non-blocking error, continue with response
      }
    }

    // Create a response from the Gemini data
    return {
      content: data.content,
      source: 'gemini',
      citation: citation,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error generating Gemini response:', error);
    
    // Log the error for analytics
    if (conversationId) {
      try {
        await supabase.from('chat_analytics').insert([{
          conversation_id: conversationId,
          query: query,
          source_type: 'error',
          successful: false,
          error_message: error.message
        }]);
      } catch (analyticsError) {
        console.error('Error logging analytics error:', analyticsError);
      }
    }
    
    return {
      content: "I'm sorry, I couldn't process your request. Please try again later.",
      source: 'system',
      timestamp: new Date()
    };
  }
};

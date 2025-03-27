
import { supabase } from '@/integrations/supabase/client';
import { MessageProps } from '@/components/MessageItem';
import { searchTranscriptsForQuery, getSourceDescription, Transcript } from './transcriptUtils';

export const generateGeminiResponse = async (
  query: string, 
  transcripts: Transcript[], 
  chatHistory: MessageProps[],
  conversationId?: string | null,
  enableOnlineSearch: boolean = false
): Promise<MessageProps> => {
  try {
    // Ensure we have the latest transcripts by fetching them directly from the database
    const { data: latestTranscripts, error } = await supabase
      .from('transcripts')
      .select('id, title, content, created_at, file_path, source');
      
    if (error) {
      console.error('Error fetching latest transcripts:', error);
    }
    
    // Use the latest transcripts if available, otherwise use the provided ones
    const transcriptsToSearch = latestTranscripts || transcripts;
    
    console.log(`Searching through ${transcriptsToSearch.length} transcripts for query: "${query}"`);
    console.log(`Online search mode: ${enableOnlineSearch ? 'enabled' : 'disabled'}`);
    
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
    let foundInTranscripts = false;
    
    if (matchedContent) {
      // Get the source description for better context
      sourceType = matchedContent.source || 'creative_dealmaker';
      const sourceDescription = getSourceDescription(sourceType);
      relevanceScore = matchedContent.relevanceScore || 0;
      foundInTranscripts = true;
      
      console.log(`Found matching content in source: ${sourceType}, title: "${matchedContent.title}" with relevance score: ${relevanceScore}`);
      contextPrompt = `Use the following information from ${sourceDescription} to answer the question: "${matchedContent.content}"`;
      bookReference = matchedContent.title;
    } else {
      // If no matched content, still provide context about the book
      console.log('No specific matching content found in transcripts');
      
      if (enableOnlineSearch) {
        contextPrompt = `You are an AI assistant specialized in business acquisitions and Carl Allen's methodology. For this query, you are allowed to use your general knowledge to answer the question, but make sure to note that you're providing general information rather than specific content from Carl Allen's transcripts. Try to align your response with Carl Allen's overall business acquisition approach.`;
        sourceType = 'web';
      } else {
        contextPrompt = `You are an AI assistant specialized in Carl Allen's "The Creative Dealmaker" book, which covers business acquisitions, deal structuring, negotiations, and due diligence. If you don't have specific information about a topic from the book, acknowledge that you don't have that specific section from the book yet, but try to provide general guidance based on Carl Allen's business acquisition methodology.`;
        sourceType = 'creative_dealmaker';
      }
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
        sourceType: sourceType,
        enableOnlineSearch: enableOnlineSearch
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
    
    if (data.isQuotaExceeded) {
      // Use fallback citation if quota exceeded
      citation = "API quota exceeded - Showing general information about Carl Allen's business acquisition methodology";
    } else if (data.apiDisabled) {
      // Use API disabled citation
      citation = "Gemini API needs to be enabled in Google Cloud Console - Follow the instructions above";
    } else if (matchedContent) {
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
    } else if (enableOnlineSearch) {
      citation = "Based on general knowledge about business acquisitions - Online search mode enabled";
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
          source_type: data.isQuotaExceeded ? 'fallback' : (data.apiDisabled ? 'system' : (sourceType || 'general')),
          relevance_score: relevanceScore,
          search_time_ms: searchTime,
          api_time_ms: apiTime,
          transcript_title: bookReference || null,
          successful: !data.error && !data.isQuotaExceeded && !data.apiDisabled,
          used_online_search: enableOnlineSearch && !foundInTranscripts
        }]);
      } catch (analyticsError) {
        console.error('Error logging analytics:', analyticsError);
        // Non-blocking error, continue with response
      }
    }

    // Create a response from the Gemini data
    return {
      content: data.content,
      source: data.apiDisabled ? 'system' : (data.isQuotaExceeded ? 'fallback' : (enableOnlineSearch && !foundInTranscripts ? 'web' : (data.source || 'gemini'))),
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
      content: "I'm sorry, I couldn't process your request. Please try again later or contact support to resolve this issue.",
      source: 'system',
      timestamp: new Date()
    };
  }
};

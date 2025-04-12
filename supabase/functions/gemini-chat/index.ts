
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_2_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const GEMINI_FALLBACK_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FALLBACK_RESPONSE = `
# Unable to Connect to AI Service

I apologize, but I'm currently having trouble connecting to the AI service. This may be due to:

- High service demand
- Temporary connection issues
- API capacity limits

Please try your question again in a moment.

*The system will automatically retry with alternative models if needed.*
`;

const SYSTEM_PROMPT = `
You are an AI assistant designed to have natural conversations. Here are your instructions:

1. Respond to user questions directly and clearly
2. Use proper markdown formatting:
   - **Bold** for emphasis
   - # Headings for main topics
   - ## Subheadings for subtopics
   - Bullet lists for multiple points
   - Numbered lists for sequential steps

3. Always acknowledge questions with a direct answer first
4. When providing structured information, use clear sections
5. Maintain a conversational, helpful tone
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      return new Response(JSON.stringify({ 
        content: "The GEMINI_API_KEY is not properly configured. Please check your environment variables.",
        source: 'system',
        error: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("GEMINI_API_KEY exists:", !!GEMINI_API_KEY);

    const { query, messages, context, instructions, sourceType, enableOnlineSearch } = await req.json();
    
    // Format messages with proper role assignment
    const formattedMessages = messages.map(msg => ({
      role: msg.source === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Add system instructions if not present
    let hasSystemPrompt = false;
    for (const msg of formattedMessages) {
      if (msg.role === 'model' && msg.parts[0].text.includes("You are an AI assistant")) {
        hasSystemPrompt = true;
        break;
      }
    }

    if (!hasSystemPrompt) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ text: SYSTEM_PROMPT }]
      });
    }

    // Add additional context if provided
    if (context) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ text: `Context: ${context}` }]
      });
    }
    
    console.log("Query:", query);
    console.log("Source type:", sourceType || "None specified");
    console.log("Messages count:", formattedMessages.length);

    const maxRetries = 2;
    let response = null;
    let generatedText = "";
    let modelUsed = "gemini-2.0-flash";
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`API attempt ${attempt + 1}/${maxRetries + 1}`);
        
        const useGemini2 = (attempt < 1);
        const apiUrl = useGemini2 ? GEMINI_2_API_URL : GEMINI_FALLBACK_API_URL;
        modelUsed = useGemini2 ? "gemini-2.0-flash" : "gemini-1.5-pro";
        
        const temperature = 0.7 + (attempt * 0.1);
        
        const requestBody = {
          contents: formattedMessages,
          generationConfig: {
            temperature: temperature,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 4096,
          },
        };
        
        console.log("Request structure:", JSON.stringify({
          model: `Using ${modelUsed}`,
          msgCount: formattedMessages.length,
          temperature,
          maxTokens: 4096
        }));
        
        const apiResponse = await fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        
        console.log(`Attempt ${attempt + 1} status:`, apiResponse.status);
        
        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          console.error(`API error on attempt ${attempt + 1}:`, errorText);
          continue;
        }
        
        response = await apiResponse.json();
        
        generatedText = response?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (generatedText && generatedText.length > 20) {
          console.log("Successful response on attempt", attempt + 1, "using model:", modelUsed);
          console.log("Response length:", generatedText.length);
          break;
        } else {
          console.log("Empty response received, will retry");
        }
      } catch (error) {
        console.error(`Error on attempt ${attempt + 1}:`, error);
      }
    }
    
    if (!generatedText || generatedText.length < 20) {
      console.log("All API attempts failed, using fallback");
      return new Response(JSON.stringify({ 
        content: FALLBACK_RESPONSE,
        source: 'fallback',
        model: "fallback"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ 
      content: generatedText,
      source: enableOnlineSearch && sourceType === 'web' ? 'web' : 'gemini',
      model: modelUsed
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in gemini-chat function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      source: 'system',
      content: "I'm sorry, there was an error processing your request. Please try again later."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

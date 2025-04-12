import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_2_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const GEMINI_FALLBACK_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

const CACHE_ENABLED = true;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const messageCache = new Map(); // Simple in-memory cache

const MAX_REQUESTS_PER_MIN = 45; // Set lower than actual limit for safety
const REQUEST_WINDOW_MS = 60 * 1000; // 1 minute
const requestTimestamps = [];

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

function checkRateLimit() {
  const now = Date.now();
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - REQUEST_WINDOW_MS) {
    requestTimestamps.shift();
  }
  
  return requestTimestamps.length >= MAX_REQUESTS_PER_MIN;
}

function recordRequest() {
  requestTimestamps.push(Date.now());
}

function generateCacheKey(messages) {
  const relevantMessages = messages.slice(-3);
  return JSON.stringify(relevantMessages.map(msg => ({
    role: msg.role,
    content: msg.parts[0].text
  })));
}

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
    
    if (checkRateLimit()) {
      console.log("Rate limit exceeded, returning fallback response");
      return new Response(JSON.stringify({ 
        content: "We're receiving too many requests right now. Please try again in a minute.",
        source: 'system',
        error: true
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const formattedMessages = messages.map(msg => ({
      role: msg.source === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

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

    if (context) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ text: `Context: ${context}` }]
      });
    }
    
    console.log("Query:", query);
    console.log("Source type:", sourceType || "None specified");
    console.log("Messages count:", formattedMessages.length);
    
    const cacheKey = generateCacheKey(formattedMessages);
    const cachedResponse = CACHE_ENABLED ? messageCache.get(cacheKey) : null;
    
    if (cachedResponse) {
      console.log("Cache hit! Returning cached response");
      return new Response(JSON.stringify(cachedResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    recordRequest();
    
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
        
        let messagesForRequest = formattedMessages;
        if (attempt > 0 && formattedMessages.length > 5) {
          const systemMessages = formattedMessages.filter(m => 
            m.role === 'model' && m.parts[0].text.includes("You are an AI assistant")
          );
          const recentMessages = formattedMessages.slice(-8);
          messagesForRequest = [...systemMessages, ...recentMessages];
          console.log("Using reduced message count for retry:", messagesForRequest.length);
        }
        
        const requestBody = {
          contents: messagesForRequest,
          generationConfig: {
            temperature: temperature,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 4096,
          },
        };
        
        console.log("Request structure:", JSON.stringify({
          model: `Using ${modelUsed}`,
          msgCount: messagesForRequest.length,
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
          
          if (apiResponse.status === 429) {
            console.log("Rate limit hit, waiting before retry");
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
          
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
    
    const responseObj = { 
      content: generatedText,
      source: enableOnlineSearch && sourceType === 'web' ? 'web' : 'gemini',
      model: modelUsed
    };
    
    if (CACHE_ENABLED) {
      messageCache.set(cacheKey, responseObj);
      
      if (messageCache.size > 1000) {
        const keysToDelete = [...messageCache.keys()].slice(0, 300);
        keysToDelete.forEach(key => messageCache.delete(key));
      }
    }
    
    return new Response(JSON.stringify(responseObj), {
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

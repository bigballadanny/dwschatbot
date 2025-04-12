import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_2_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const GEMINI_FALLBACK_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FALLBACK_RESPONSE = `
# Business Acquisition Fundamentals

Here are fundamental concepts about business acquisitions:

## The Acquisition Process
1. **Define Your Acquisition Criteria**
   • Industry focus
   • Size parameters (revenue and EBITDA)
   • Geographic location
   • Owner situation

2. **Deal Origination** strategies:
   • Direct outreach
   • Business broker relationships
   • Professional networks
   • Industry associations
   • LinkedIn campaigns

3. **Deal Structure Options**
   • Seller financing
   • Earn-outs
   • SBA loans
   • Real estate considerations

## Due Diligence Essentials
• Financial verification
• Customer concentration assessment
• Owner dependency evaluation
• Employee assessment
• Systems & processes documentation

*Please try your specific question again when API capacity becomes available.*
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
    
    const formattedMessages = messages.map(msg => ({
      role: msg.source === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    if (formattedMessages.length === 0 || 
        !formattedMessages.some(msg => msg.role === 'model' && msg.parts[0].text.includes("assistant"))) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ 
          text: "I'm an AI assistant specializing in business acquisitions. I provide practical advice for entrepreneurs looking to acquire companies."
        }]
      });
    }

    if (context) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ text: context }]
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

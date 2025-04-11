
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
// Using Gemini 2.0 API
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-pro:generateContent";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Improved fallback response with better formatting and without hashtags
const FALLBACK_RESPONSE = `
## Business Acquisition Fundamentals

Here are key concepts about business acquisitions that every entrepreneur should know:

### The Acquisition Process
1. **Define Your Acquisition Criteria** ("Buy Box")
   - Industry focus aligned with your expertise
   - Size parameters (typically $1-5M revenue)
   - Geographic restrictions
   - Owner situation preferences

2. **Deal Origination** strategies:
   - Direct mail campaigns
   - Business broker relationships
   - Professional networks
   - Industry associations
   - LinkedIn outreach

3. **Deal Structure Options**
   - Seller financing
   - Earn-outs
   - SBA loans
   - No money down strategies
   - Real estate separation options

*Please try your specific question again later when API capacity becomes available.*
`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify API key is configured
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

    const { query, messages, context, instructions, sourceType, enableOnlineSearch } = await req.json();
    
    // Format messages for the Gemini API
    const formattedMessages = messages.map(msg => ({
      role: msg.source === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Add system message if not present
    if (!formattedMessages.some(msg => msg.role === 'model' && msg.parts[0].text.includes("Expert Bot"))) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ 
          text: "I'm the Expert Bot. I'll answer questions about business acquisitions, deal structuring, negotiations, due diligence, and more. I provide practical, actionable advice for business owners."
        }]
      });
    }

    // Add specific source type instructions
    let sourceSpecificInstructions = "";
    if (sourceType) {
      switch(sourceType) {
        case 'creative_dealmaker':
          sourceSpecificInstructions = "Focus on core concepts, principles, and methodologies. Emphasize practical applications for business owners.";
          break;
        case 'mastermind_call':
        case 'protege_call':
        case 'foundations_call':
          sourceSpecificInstructions = "Reference training content, Q&A sessions, and practical advice for business owners.";
          break;
        case 'business_acquisitions_summit':
          sourceSpecificInstructions = "Reference the latest strategies, insights, and advice for business owners and entrepreneurs.";
          break;
        case 'case_study':
          sourceSpecificInstructions = "Focus on specific examples, outcomes, and lessons learned that business owners can apply.";
          break;
        case 'financial_advice':
          sourceSpecificInstructions = "Emphasize practical financial strategies, funding options, and capital considerations for acquisitions.";
          break;
        case 'due_diligence':
          sourceSpecificInstructions = "Focus on the step-by-step process, key areas to investigate, and common pitfalls to avoid.";
          break;
        case 'negotiation':
          sourceSpecificInstructions = "Emphasize techniques, leverage points, and effective frameworks for successful deal negotiations.";
          break;
        case 'web':
          sourceSpecificInstructions = "You may use general knowledge while maintaining alignment with acquisition methodology and business philosophy.";
          break;
      }
    }

    // Add business owner persona instructions
    sourceSpecificInstructions += "\n\nFocus on practical, actionable advice for business owners and entrepreneurs.";

    // Add online search specific instructions if enabled
    if (enableOnlineSearch) {
      sourceSpecificInstructions += " You can draw on general knowledge when specific information is insufficient.";
    }

    // Add the context as a system message
    if (context) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ text: context }]
      });
    }
    
    // Combine formatting instructions - improved to avoid hashtag formatting issues
    const enhancedInstructions = `
    ${instructions || ''}

    ${sourceSpecificInstructions}

    Guidelines for your response:
    - Use clear paragraphs with good spacing
    - Format using proper markdown with headings (## and ###) rather than hashtags
    - Use bullet points or numbered lists for structured information
    - Make responses conversational and engaging
    - Focus on practical applications and actionable advice
    - Address concerns related to risk, capital, time investment, and ROI
    ${enableOnlineSearch ? "- Distinguish between specific teachings and general business knowledge." : "- Base answers on provided context or known methodology."}
    `;
    
    // Add formatting instructions as a system message
    if (enhancedInstructions) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ text: enhancedInstructions }]
      });
    }
    
    console.log("Searching for information on query:", query);
    console.log("Source type identified:", sourceType || "None specified");
    console.log("Context length:", context ? context.length : 0);
    console.log("Online search mode:", enableOnlineSearch ? "enabled" : "disabled");

    try {
      // Call Gemini API
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: formattedMessages,
          generationConfig: {
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 800,
          },
        }),
      });

      // Handle API response
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Gemini API error:', data);
        
        // Handle quota exceeded error
        if (data.error?.message?.includes("quota") || 
            data.error?.status === "RESOURCE_EXHAUSTED" ||
            response.status === 429) {
          console.log("API quota exceeded, returning fallback response");
          
          return new Response(JSON.stringify({ 
            content: FALLBACK_RESPONSE,
            source: 'fallback',
            isQuotaExceeded: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Handle API not enabled error
        if (data.error?.message?.includes("disabled") || 
            data.error?.message?.includes("Enable it")) {
          console.log("Gemini API not enabled, providing instructions");
          
          const instructionsResponse = `## Gemini API Not Enabled

You need to enable the Gemini API for your Google Cloud project:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services > Enable APIs and Services**
3. Search for "Generative Language API" and enable it
4. Set up billing if using a new Google Cloud project
5. Wait a few minutes for changes to propagate

Once enabled, your chat assistant will work properly.`;
          
          return new Response(JSON.stringify({ 
            content: instructionsResponse,
            source: 'system',
            apiDisabled: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        throw new Error(`Gemini API error: ${data.error?.message || 'Unknown error'}`);
      }
      
      // Extract the generated text
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
        "I'm sorry, I couldn't generate a response at this time.";
        
      console.log("Generated response size:", generatedText.length);

      // Return the response
      return new Response(JSON.stringify({ 
        content: generatedText,
        source: enableOnlineSearch && sourceType === 'web' ? 'web' : 'gemini' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (apiError) {
      console.error('API error:', apiError);
      
      // Return fallback response for API errors
      return new Response(JSON.stringify({ 
        content: FALLBACK_RESPONSE,
        source: 'fallback',
        isQuotaExceeded: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
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

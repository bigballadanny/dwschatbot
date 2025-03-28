
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Business acquisition focused fallback response
const FALLBACK_RESPONSE = `
# Business Acquisition Fundamentals for Entrepreneurs

Based on Carl Allen's teachings, here are key concepts about business acquisitions that every entrepreneur should know:

## The Acquisition Process
1. **Define Your Acquisition Criteria** ("Buy Box")
   • Industry focus aligned with your expertise and interests
   • Size parameters (typically $1-5M revenue, $200K-$1M EBITDA for first deals)
   • Geographic restrictions (usually within 2 hours of your location)
   • Owner situation preferences (retirement, burnout, distressed)

2. **Deal Origination** strategies that work:
   • Direct mail campaigns to targeted business owners
   • Business broker relationships (they handle 30-40% of deals)
   • Professional networks (accountants, attorneys, wealth managers)
   • Industry associations and trade shows
   • LinkedIn outreach campaigns

3. **Deal Structure Options**
   • **Seller Financing** (typically 50-90% of purchase price)
   • **Earn-outs** tied to business performance
   • **SBA Loans** (requires 10-15% down payment)
   • **No Money Down** strategies using seller financing
   • **Real Estate** separated from business acquisition

## Due Diligence Essentials
• **Financial Verification** of reported earnings
• **Customer Concentration** risks (no client should exceed 15-20% of revenue)
• **Owner Dependency** evaluation and transition planning
• **Employee Assessment** and retention strategies
• **Systems & Processes** documentation

Remember that most business owners are emotionally attached to their companies. Approach them with respect and understanding of the legacy they've built.

*Please try your specific question again when API capacity becomes available.*
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
    if (!formattedMessages.some(msg => msg.role === 'model' && msg.parts[0].text.includes("Carl Allen Expert Bot"))) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ 
          text: "I'm the Carl Allen Expert Bot. I'll answer questions about business acquisitions, deal structuring, negotiations, due diligence, and more based on Carl Allen's book 'The Creative Dealmaker' and his mastermind transcripts. I provide practical, actionable advice for business owners looking to acquire companies."
        }]
      });
    }

    // Add specific source type instructions
    let sourceSpecificInstructions = "";
    if (sourceType) {
      switch(sourceType) {
        case 'creative_dealmaker':
          sourceSpecificInstructions = "You're drawing from Carl Allen's book 'The Creative Dealmaker'. Focus on core concepts, principles, and methodologies presented in the book. Emphasize practical applications for business owners.";
          break;
        case 'mastermind_call':
          sourceSpecificInstructions = "You're referencing Carl Allen's mastermind call transcripts. These contain Q&A sessions, practical advice, and real-time guidance Carl has provided to entrepreneurs and business owners in his mastermind program.";
          break;
        case 'protege_call':
          sourceSpecificInstructions = "You're referencing Carl Allen's Protege call transcripts. These contain detailed training, Q&A sessions, and practical advice for his Protege program students who are actively looking to acquire businesses.";
          break;
        case 'foundations_call':
          sourceSpecificInstructions = "You're referencing Carl Allen's Foundations call transcripts. These contain foundational training on business acquisitions and practical advice for business owners beginning their acquisition journey.";
          break;
        case 'business_acquisitions_summit':
          sourceSpecificInstructions = "You're referencing Carl Allen's 2024 Business Acquisitions Summit transcripts. These contain the latest strategies, insights, and advice shared at this recent event for business owners and entrepreneurs.";
          break;
        case 'case_study':
          sourceSpecificInstructions = "You're using information from a case study. Focus on the specific examples, outcomes, and lessons learned from this real-world scenario that business owners can apply to their own acquisition strategies.";
          break;
        case 'financial_advice':
          sourceSpecificInstructions = "You're drawing from financial guidance content. Emphasize practical financial strategies, funding options, and capital considerations for acquisitions that business owners need to understand.";
          break;
        case 'due_diligence':
          sourceSpecificInstructions = "You're referencing due diligence material. Focus on the step-by-step process, key areas to investigate, and common pitfalls for business owners to avoid when evaluating acquisition targets.";
          break;
        case 'negotiation':
          sourceSpecificInstructions = "You're using negotiation strategy content. Emphasize techniques, leverage points, and effective frameworks for successful deal negotiations that business owners can implement.";
          break;
        case 'web':
          sourceSpecificInstructions = "You're allowed to use your general knowledge to answer this question since no specific information was found in Carl Allen's transcripts. Still maintain alignment with Carl Allen's acquisition methodology and business philosophy, focusing on practical advice for business owners.";
          break;
      }
    }

    // Add business owner persona instructions
    sourceSpecificInstructions += "\n\nThe person asking this question is likely a business owner or entrepreneur interested in acquiring businesses. They're looking for practical, actionable advice they can implement in their acquisition journey. Focus on risk mitigation, funding strategies, seller psychology, and concrete steps they can take.";

    // Add online search specific instructions if enabled
    if (enableOnlineSearch) {
      sourceSpecificInstructions += " Online search mode is enabled, so you can draw on your general knowledge about business acquisitions when transcript information is insufficient. Always make it clear when you're providing general information versus specific content from Carl Allen's materials.";
    }

    // Add the context as a system message
    if (context) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ text: context }]
      });
    }
    
    // Combine all formatting instructions
    const enhancedInstructions = `
    ${instructions || ''}
    
    ${sourceSpecificInstructions}
    
    Additionally:
    - Make your responses conversational and engaging for business owners
    - Ensure all information is accurate and aligned with Carl Allen's teachings
    - When there's uncertainty, acknowledge limits rather than inventing information
    - Use concrete examples where possible to illustrate concepts
    - When referring to specific content, cite the source with the title of the transcript/call
    - Use proper markdown formatting with **bold** for important concepts and headings
    - Use bullet points for lists and numbered lists for sequential steps
    - Always focus on practical applications that business owners can implement immediately
    - Use business acquisition terminology appropriately (EBITDA, SBA, deal structure, etc.)
    - Address specific business owner concerns related to risk, capital, time investment, and ROI
    ${enableOnlineSearch ? "- When providing information from your general knowledge rather than the transcripts, explicitly note this" : ""}
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
        
        // Check if it's a quota exceeded error
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
        
        // Check if it's an API not enabled error
        if (data.error?.message?.includes("disabled") || 
            data.error?.message?.includes("Enable it")) {
          console.log("Gemini API not enabled, providing instructions");
          
          const instructionsResponse = `# Gemini API Not Enabled

You need to enable the Gemini API for your Google Cloud project. Follow these steps:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services > Enable APIs and Services**
3. Search for "Generative Language API" and enable it
4. If you're using a new Google Cloud project, you might need to set up billing
5. After enabling the API, wait a few minutes for the changes to propagate

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
      
      // Return the fallback response if there's an API error
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

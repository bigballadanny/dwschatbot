
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, messages, context, instructions, sourceType } = await req.json();
    
    // Format the messages for Gemini API
    const formattedMessages = messages.map(msg => ({
      role: msg.source === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));
    
    // Add system message if not present
    if (!formattedMessages.some(msg => msg.role === 'model' && msg.parts[0].text.includes("Carl Allen Expert Bot"))) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ 
          text: "I'm the Carl Allen Expert Bot. I'll answer questions about business acquisitions, deal structuring, negotiations, due diligence, and more based on Carl Allen's book 'The Creative Dealmaker' and his mastermind transcripts."
        }]
      });
    }

    // Add specific source type instructions
    let sourceSpecificInstructions = "";
    if (sourceType) {
      switch(sourceType) {
        case 'creative_dealmaker':
          sourceSpecificInstructions = "You're drawing from Carl Allen's book 'The Creative Dealmaker'. Focus on core concepts, principles, and methodologies presented in the book.";
          break;
        case 'mastermind_call':
          sourceSpecificInstructions = "You're referencing Carl Allen's mastermind call transcripts. These contain Q&A sessions, practical advice, and real-time guidance Carl has provided to students.";
          break;
        case 'case_study':
          sourceSpecificInstructions = "You're using information from a case study. Focus on the specific examples, outcomes, and lessons learned from this real-world scenario.";
          break;
        case 'financial_advice':
          sourceSpecificInstructions = "You're drawing from financial guidance content. Emphasize practical financial strategies, funding options, and capital considerations for acquisitions.";
          break;
        case 'due_diligence':
          sourceSpecificInstructions = "You're referencing due diligence material. Focus on the step-by-step process, key areas to investigate, and common pitfalls to avoid.";
          break;
        case 'negotiation':
          sourceSpecificInstructions = "You're using negotiation strategy content. Emphasize techniques, leverage points, and effective frameworks for successful deal negotiations.";
          break;
      }
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
    - Make your responses conversational and engaging
    - Ensure all information is accurate and aligned with Carl Allen's teachings
    - When there's uncertainty, acknowledge limits rather than inventing information
    - Use concrete examples where possible to illustrate concepts
    `;
    
    // Add formatting instructions as a system message
    if (enhancedInstructions) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ text: enhancedInstructions }]
      });
    }

    console.log("Sending request to Gemini with context:", context.substring(0, 100) + "...");
    console.log("Source type:", sourceType || "None specified");

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
      throw new Error(`Gemini API error: ${data.error?.message || 'Unknown error'}`);
    }
    
    // Extract the generated text
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
      "I'm sorry, I couldn't generate a response at this time.";
      
    console.log("Generated response size:", generatedText.length);

    // Return the response
    return new Response(JSON.stringify({ 
      content: generatedText,
      source: 'gemini'
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

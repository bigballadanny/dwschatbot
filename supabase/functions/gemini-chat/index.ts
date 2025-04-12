
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
// Updated to use Gemini 2.0 Flash API (beta endpoint)
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

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

// SBA-specific fallback response
const SBA_FALLBACK_RESPONSE = `# SBA Loans for Business Acquisitions

**SBA (Small Business Administration)** loans are a popular financing option for business acquisitions. Here's what you need to know based on Carl Allen's teachings:

## SBA Loan Basics
- **What it is:** Government-backed loans provided through approved lenders
- **Key program:** The 7(a) loan program is most commonly used for acquisitions
- **Guarantee:** The SBA guarantees 75-85% of the loan amount, reducing risk for the lender
- **Typical terms:** 10-25 years with some of the lowest interest rates available for small businesses

## Benefits for Acquisitions
- **Lower down payment:** Typically requires only 10-15% down versus 25-30% for conventional loans
- **Better terms:** Longer repayment periods (up to 10 years) and competitive rates
- **Flexible use:** Can cover business acquisition, working capital, and sometimes real estate
- **Access:** Available to buyers who might not qualify for conventional financing

## Qualification Requirements
- **Credit score:** Typically 680+ for the borrower
- **Collateral:** Personal and business assets may be required
- **Down payment:** Minimum 10% of purchase price
- **Experience:** Industry experience or management background usually required
- **Business viability:** The business must show stable or growing cash flow

## SBA Loan Process for Acquisitions
1. **Pre-qualification:** Get pre-qualified before approaching sellers
2. **Business valuation:** Required by the SBA to verify purchase price
3. **Documentation:** Extensive paperwork including personal financial statements, business plans, etc.
4. **Underwriting:** 45-90 day process (longer than conventional loans)
5. **Closing:** The SBA has specific closing requirements

## Pro Tips from Carl Allen
- Work with SBA Preferred Lenders who have streamlined approval authority
- Build relationships with multiple SBA lenders before you need them
- Have a complete acquisition package ready to expedite approval
- Be prepared for higher closing costs (typically 3-5% of loan amount)
- Consider using seller financing alongside the SBA loan for larger deals

The SBA loan can be an excellent tool for your acquisition strategy, especially for first-time business buyers.`;

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

    // Log API key existence (not the actual key)
    console.log("GEMINI_API_KEY exists:", !!GEMINI_API_KEY);
    console.log("GEMINI_API_KEY length:", GEMINI_API_KEY ? GEMINI_API_KEY.length : 0);

    const { query, messages, context, instructions, sourceType, enableOnlineSearch } = await req.json();
    
    // Format messages for the Gemini API - UPDATED to match official format
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

    // Add business owner persona instructions - Using string concatenation
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

    Additionally, follow these guidelines for your response:
    - Structure:
      - Break content into clear paragraphs with good spacing.
      - Use headings to organize longer responses.
      - End with a clear conclusion or summary for long responses.
    - Formatting:
      - Use proper markdown formatting.
      - Use **bold** for important concepts, terms, and headings.
      - Use bullet points (• or *) for lists.
      - Use numbered lists (1., 2., etc.) for sequential steps or instructions.
      - Format numerical values, percentages, and money values consistently.
    - Content & Tone:
      - Make your responses conversational and engaging for business owners.
      - Ensure all information is accurate and aligned with Carl Allen's teachings.
      - When there's uncertainty, acknowledge limits rather than inventing information.
      - Use concrete examples where possible to illustrate concepts.
      - When referring to specific content, cite the source with the title of the transcript/call/book.
      - Always focus on practical applications and actionable advice that business owners can implement immediately.
      - Use business acquisition terminology appropriately (EBITDA, SBA, deal structure, etc.).
      - Address specific business owner concerns related to risk, capital, time investment, and ROI.
    ${enableOnlineSearch ? "- When providing information from your general knowledge (due to online search being enabled or lack of transcript data), explicitly state this. Distinguish clearly between Carl Allen's specific teachings and general business knowledge." : "- Base your answers strictly on the provided context or Carl Allen's known methodology. If the information isn't available, state that clearly."}
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
    console.log("Number of formatted messages:", formattedMessages.length);
    
    // Check for SBA-related query
    const isSbaQuery = query?.toLowerCase().includes("sba") || 
                        messages.some(msg => msg.content?.toLowerCase().includes("sba"));
    console.log("Is SBA-related query:", isSbaQuery);

    try {
      // Call Gemini API
      console.log("Calling Gemini API with URL:", GEMINI_API_URL);
      
      // Build the complete URL with API key
      const apiUrl = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
      console.log("API URL has key:", apiUrl.includes("key="));
      
      // Setup variables for retry logic
      let maxRetries = 2;
      let retryCount = 0;
      let success = false;
      let generatedText = "";
      let responseData = null;

      while (retryCount <= maxRetries && !success) {
        try {
          console.log(`API attempt ${retryCount + 1}/${maxRetries + 1}`);
          
          // Adjust temperature slightly on retries to encourage different responses
          const temperature = retryCount === 0 ? 0.7 : 0.8 + (retryCount * 0.1);
          
          // UPDATED: match the official API structure exactly
          const requestBody = {
            contents: formattedMessages,
            generationConfig: {
              temperature: temperature,
              topP: 0.8,
              topK: 40,
              maxOutputTokens: 800,
            }
          };
          
          console.log("Request body structure:", JSON.stringify({
            contents: "Array with " + formattedMessages.length + " messages",
            generationConfig: requestBody.generationConfig
          }));
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          console.log(`Attempt ${retryCount + 1} status:`, response.status);
          
          // Get the full response text
          const responseText = await response.text();
          console.log(`Raw API response (truncated):`, responseText.substring(0, 150) + "...");
          
          // Parse response
          try {
            responseData = JSON.parse(responseText);
            
            // Check if we got a valid response with content
            generatedText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            
            if (generatedText && generatedText.length > 20 && 
                !generatedText.includes("I couldn't generate") &&
                !generatedText.includes("I'm sorry, I can't")) {
              console.log("Got valid response on attempt", retryCount + 1);
              success = true;
              break;
            } else {
              console.log("Empty or apologetic response, retrying...");
              retryCount++;
            }
          } catch (parseError) {
            console.error("Error parsing API response:", parseError);
            retryCount++;
          }
        } catch (fetchError) {
          console.error(`API fetch error on attempt ${retryCount + 1}:`, fetchError);
          retryCount++;
        }
      }
      
      // Handle unsuccessful attempts
      if (!success) {
        console.log("All API attempts failed to generate a useful response");
        
        // If it's an SBA query, use the specific SBA fallback
        if (isSbaQuery) {
          console.log("Using SBA-specific fallback response");
          return new Response(JSON.stringify({ 
            content: SBA_FALLBACK_RESPONSE,
            source: 'gemini',
            isFallback: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          console.log("Using general fallback response");
          return new Response(JSON.stringify({ 
            content: FALLBACK_RESPONSE,
            source: 'fallback',
            isFallback: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Handle successful response
      console.log("Generated response size:", generatedText.length);
      console.log("First few characters:", generatedText.substring(0, 50));
      
      // Return the response
      return new Response(JSON.stringify({ 
        content: generatedText,
        source: enableOnlineSearch && sourceType === 'web' ? 'web' : 'gemini' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } catch (apiError) {
      console.error('API error:', apiError);
      console.error('API error details:', apiError.message);
      
      // Return the appropriate fallback response
      if (isSbaQuery) {
        return new Response(JSON.stringify({ 
          content: SBA_FALLBACK_RESPONSE,
          source: 'fallback',
          isApiError: true,
          errorMessage: apiError.message
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(JSON.stringify({ 
          content: FALLBACK_RESPONSE,
          source: 'fallback',
          isApiError: true,
          errorMessage: apiError.message
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
  } catch (error) {
    console.error('Error in gemini-chat function:', error);
    console.error('Error details:', error.message);
    
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

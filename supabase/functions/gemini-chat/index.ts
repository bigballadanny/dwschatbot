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

    // Log API key validation (not the actual key)
    console.log("GEMINI_API_KEY exists:", !!GEMINI_API_KEY);
    console.log("GEMINI_API_KEY length:", GEMINI_API_KEY ? GEMINI_API_KEY.length : 0);

    const { query, messages, context, instructions, sourceType, enableOnlineSearch } = await req.json();
    
    // Format messages for the Gemini API - simple format that works
    const formattedMessages = messages.map(msg => ({
      role: msg.source === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Only add minimal essential instructions - avoid overloading context
    if (formattedMessages.length === 0 || 
        !formattedMessages.some(msg => msg.role === 'model' && 
                                msg.parts[0].text.includes("Carl Allen"))) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ 
          text: "I'm an AI assistant specializing in business acquisitions based on Carl Allen's teachings. I provide practical advice for entrepreneurs looking to acquire companies."
        }]
      });
    }

    // Add source-specific context only if actually needed
    if (sourceType && !context) {
      const baseContext = "You're an expert on business acquisitions and deal-making based on Carl Allen's teachings. ";
      let sourceContext = "";
      
      switch(sourceType) {
        case 'creative_dealmaker':
          sourceContext = "Draw from Carl Allen's book 'The Creative Dealmaker'.";
          break;
        case 'mastermind_call':
          sourceContext = "Reference Carl Allen's mastermind call content.";
          break;
        case 'web':
          sourceContext = "You can use general acquisition knowledge plus Carl Allen's methodologies.";
          break;
        default:
          // Don't add anything for other sources
          break;
      }
      
      if (sourceContext) {
        formattedMessages.unshift({
          role: 'model',
          parts: [{ text: baseContext + sourceContext }]
        });
      }
    }
    
    // Add explicit context if provided
    if (context) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ text: context }]
      });
    }
    
    console.log("Query:", query);
    console.log("Source type:", sourceType || "None specified");
    console.log("Messages count:", formattedMessages.length);
    
    // Check for SBA-related query for potential fallback
    const isSbaQuery = query?.toLowerCase().includes("sba") || 
                      messages.some(msg => msg.content?.toLowerCase().includes("sba"));
    console.log("Is SBA-related query:", isSbaQuery);

    // Setup retry logic with cleaner approach
    const maxRetries = 2;
    let response = null;
    let generatedText = "";
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`API attempt ${attempt + 1}/${maxRetries + 1}`);
        
        // Adjust temperature only slightly on retries
        const temperature = 0.7 + (attempt * 0.1);
        
        // Keep the request body simple and aligned with official API
        const requestBody = {
          contents: formattedMessages,
          generationConfig: {
            temperature: temperature,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 2048, // Higher token limit
          },
          // No safety settings - use defaults
        };
        
        console.log("Request structure:", JSON.stringify({
          model: "Using Gemini 1.5 Pro",
          msgCount: formattedMessages.length,
          temperature,
          maxTokens: 2048
        }));
        
        // Call the API
        const apiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        
        console.log(`Attempt ${attempt + 1} status:`, apiResponse.status);
        
        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          console.error(`API error on attempt ${attempt + 1}:`, errorText);
          // Continue to next retry
          continue;
        }
        
        // Parse the response
        response = await apiResponse.json();
        
        // Extract and validate the generated text
        generatedText = response?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (generatedText && generatedText.length > 20) {
          console.log("Successful response on attempt", attempt + 1);
          console.log("Response length:", generatedText.length);
          break; // Success - exit retry loop
        } else {
          console.log("Empty response received, will retry");
        }
      } catch (error) {
        console.error(`Error on attempt ${attempt + 1}:`, error);
      }
    }
    
    // Handle if we never got a valid response
    if (!generatedText || generatedText.length < 20) {
      console.log("All API attempts failed, using fallback");
      
      // Use appropriate fallback based on query type
      if (isSbaQuery) {
        return new Response(JSON.stringify({ 
          content: SBA_FALLBACK_RESPONSE,
          source: 'fallback'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(JSON.stringify({ 
          content: FALLBACK_RESPONSE,
          source: 'fallback'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Return the successful response
    return new Response(JSON.stringify({ 
      content: generatedText,
      source: enableOnlineSearch && sourceType === 'web' ? 'web' : 'gemini' 
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

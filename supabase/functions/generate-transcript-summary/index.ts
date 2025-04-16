
// supabase/functions/generate-transcript-summary/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Get Vertex AI service account from environment variables
const VERTEX_AI_SERVICE_ACCOUNT = Deno.env.get('VERTEX_AI_SERVICE_ACCOUNT');
if (!VERTEX_AI_SERVICE_ACCOUNT) {
  console.error("Missing VERTEX_AI_SERVICE_ACCOUNT environment variable");
}

// Initialize Supabase client with service role key for internal operations
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getVertexAccessToken(): Promise<string> {
  try {
    // Parse the service account JSON
    const serviceAccount = JSON.parse(VERTEX_AI_SERVICE_ACCOUNT);
    
    // Create a JWT for Google's OAuth token endpoint
    const jwtHeader = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const jwtClaimSet = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    // Encode the JWT header and claim set
    const encodedHeader = btoa(JSON.stringify(jwtHeader))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
      
    const encodedClaimSet = btoa(JSON.stringify(jwtClaimSet))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Create the content to sign
    const signContent = `${encodedHeader}.${encodedClaimSet}`;

    // Import the private key for signing
    const privateKey = serviceAccount.private_key;
    
    // Use Web Crypto API to sign the content
    const encoder = new TextEncoder();
    const signatureInput = encoder.encode(signContent);

    // Import the private key for use with Web Crypto
    const privateKeyObject = await crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(privateKey),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    // Sign the content
    const signature = await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' },
      privateKeyObject,
      signatureInput
    );

    // Convert signature to base64url
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Create the signed JWT
    const jwt = `${signContent}.${signatureBase64}`;

    // Exchange the JWT for an access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to get access token: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

// Helper function to convert PEM format to ArrayBuffer
function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Remove header, footer, and newlines
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
    
  // Base64 decode the string to get binary data
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes.buffer;
}

async function generateSummary(content: string, title: string, source: string): Promise<{ summary: string, keyPoints: any[] }> {
  try {
    // Get access token for Vertex AI
    const accessToken = await getVertexAccessToken();
    
    // Parse service account to get project ID
    const serviceAccount = JSON.parse(VERTEX_AI_SERVICE_ACCOUNT);
    const projectId = serviceAccount.project_id;
    
    // Configure the Vertex AI Endpoint - Upgrading to gemini-2.0-pro for better insights
    const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.0-pro:generateContent`;
    
    // Create an enhanced context-aware prompt for the summary that extracts "golden nuggets"
    const prompt = `
      You are a professional transcript analyst specializing in business acquisitions and entrepreneurship. 
      
      Analyze the following transcript titled "${title}" from ${source} with a focus on extracting actionable insights.
      
      Your task is to provide:
      1. A concise summary (3-4 paragraphs) highlighting the key themes and business strategies discussed
      
      2. "GOLDEN NUGGETS" - Extract 5-7 of the most valuable insights or strategies that are:
         - Directly actionable for entrepreneurs
         - Represent concrete business strategies or frameworks
         - Contain specific methodologies that could be applied by others
      
      For each "golden nugget", provide:
         a) A clear, concise title for the strategy/insight (5-8 words)
         b) A detailed explanation of how to implement it (2-3 sentences)
         c) The specific benefit or outcome of implementing this strategy
         
      Format each key point as a JSON object with properties:
      {
        "point": "Strategy Name/Title",
        "explanation": "Implementation details and benefits"
      }
      
      Transcript content:
      ${content}
    `;
    
    // Call Vertex AI with enhanced configuration
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2, // Low temperature for factual, consistent output
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vertex AI error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiResponse) {
      throw new Error('Empty response from Vertex AI');
    }

    // Extract the summary and key points from the response
    let summary = '';
    const keyPoints = [];
    
    try {
      // Find where the key points section begins
      const keyPointsStart = aiResponse.indexOf("Golden Nuggets:") !== -1 
        ? aiResponse.indexOf("Golden Nuggets:") 
        : aiResponse.indexOf("GOLDEN NUGGETS:");
        
      if (keyPointsStart !== -1) {
        // Extract the summary (everything before key points)
        summary = aiResponse.substring(0, keyPointsStart).trim();
        
        // Extract the key points text
        const keyPointsText = aiResponse.substring(keyPointsStart);
        
        // Parse numbered points (1., 2., etc.)
        const pointRegex = /(\d+\.|\-)\s*(.*?)(?=(?:\d+\.|\-|$))/gs;
        let match;
        
        while ((match = pointRegex.exec(keyPointsText)) !== null) {
          const pointText = match[2].trim();
          
          // Check if there's an explanation (separated by colon or dash)
          const separatorIndex = pointText.search(/[:–—-]/);
          
          if (separatorIndex !== -1) {
            const point = pointText.substring(0, separatorIndex).trim();
            const explanation = pointText.substring(separatorIndex + 1).trim();
            keyPoints.push({ point, explanation });
          } else {
            // If no separator, use the whole text as the point
            keyPoints.push({ point: pointText, explanation: '' });
          }
        }
      } else {
        // If key points section not found, use the entire response as summary
        summary = aiResponse.trim();
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback: use the entire response as summary if parsing fails
      summary = aiResponse.trim();
    }
    
    return { 
      summary: summary || 'Summary unavailable. Please try again.',
      keyPoints: keyPoints.length > 0 ? keyPoints : [{ point: 'Key points extraction failed', explanation: 'Please try regenerating the summary.' }]
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
}

// Main handler function
serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { transcriptId, userId } = await req.json();
    console.log(`Generating summary for transcript ${transcriptId} by user ${userId}`);
    
    if (!transcriptId) {
      throw new Error('Missing required field: transcriptId');
    }

    // Fetch transcript
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .select('id, title, content, source, user_id')
      .eq('id', transcriptId)
      .single();

    if (transcriptError || !transcript) {
      console.error('Error fetching transcript:', transcriptError);
      return new Response(
        JSON.stringify({ error: 'Transcript not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has permission to access this transcript
    if (userId && transcript.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to transcript' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if summary already exists
    const { data: existingSummary } = await supabase
      .from('transcript_summaries')
      .select('*')
      .eq('transcript_id', transcriptId)
      .single();

    if (existingSummary) {
      console.log(`Using existing summary for transcript ${transcriptId}`);
      return new Response(
        JSON.stringify({ 
          summary: existingSummary,
          message: 'Using existing summary'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if transcript has content to summarize
    if (!transcript.content || transcript.content.length < 50) {
      return new Response(
        JSON.stringify({ error: 'Transcript content too short to summarize' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate summary
    console.log(`Generating summary for transcript: ${transcript.title}`);
    const { summary, keyPoints } = await generateSummary(
      transcript.content, 
      transcript.title, 
      transcript.source || 'unknown source'
    );

    // Calculate token count (approximate)
    const tokenCount = Math.ceil(transcript.content.split(/\s+/).length * 1.3);

    // Save summary
    const { data: savedSummary, error: saveError } = await supabase
      .from('transcript_summaries')
      .insert({
        transcript_id: transcriptId,
        summary: summary,
        key_points: keyPoints,
        token_count: tokenCount,
        model_used: 'gemini-1.5-pro'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving summary:', saveError);
      throw new Error(`Failed to save summary: ${saveError.message}`);
    }

    // Mark transcript as summarized
    await supabase
      .from('transcripts')
      .update({ is_summarized: true })
      .eq('id', transcriptId);

    console.log(`Successfully generated and saved summary for transcript ${transcriptId}`);
    
    return new Response(
      JSON.stringify({ 
        summary: savedSummary,
        message: 'Summary generated successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-transcript-summary function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

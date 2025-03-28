
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const TEXT_TO_SPEECH_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

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
    // Verify API key is configured
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      return new Response(JSON.stringify({ 
        error: "The GEMINI_API_KEY is not properly configured. Please check your environment variables."
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    const { text, voice } = await req.json();
    
    if (!text) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    console.log("Converting text to speech:", text.substring(0, 100) + "...");
    
    // Default voice configuration
    const voiceName = voice || 'en-US-Neural2-F'; // Default to female voice
    const voiceGender = voiceName.includes("Male") || voiceName.endsWith("-D") ? "MALE" : "FEMALE";
    
    console.log("Selected voice:", voiceName, "Gender:", voiceGender);

    // Call Google Text-to-Speech API
    const response = await fetch(`${TEXT_TO_SPEECH_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          text: text
        },
        voice: {
          languageCode: 'en-US',
          name: voiceName,
          ssmlGender: voiceGender
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0.0
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Text-to-Speech API error:", errorData);
      
      return new Response(JSON.stringify({ 
        error: errorData.error?.message || "Failed to generate speech" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status
      });
    }

    // Extract the audio content (base64 encoded)
    const data = await response.json();
    const audioContent = data.audioContent;

    return new Response(JSON.stringify({ audioContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in text-to-speech function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || "An unexpected error occurred"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

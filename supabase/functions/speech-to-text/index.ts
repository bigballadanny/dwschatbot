
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SPEECH_TO_TEXT_URL = "https://speech.googleapis.com/v1p1beta1/speech:recognize";

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

    const { audioData } = await req.json();
    
    if (!audioData) {
      return new Response(JSON.stringify({ error: "No audio data provided" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    
    console.log("Processing audio data for speech recognition");
    
    // Call Google Speech-to-Text API
    const response = await fetch(`${SPEECH_TO_TEXT_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          encoding: "WEBM_OPUS",
          sampleRateHertz: 48000,
          languageCode: "en-US",
          enableAutomaticPunctuation: true,
          model: "latest_long"
        },
        audio: {
          content: audioData
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Speech-to-Text API error:", errorData);
      
      return new Response(JSON.stringify({ 
        error: errorData.error?.message || "Failed to recognize speech" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status
      });
    }

    const data = await response.json();
    const transcription = data.results?.[0]?.alternatives?.[0]?.transcript || "";
    
    console.log("Transcription result:", transcription);

    return new Response(JSON.stringify({ transcription }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in speech-to-text function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || "An unexpected error occurred"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

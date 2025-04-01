
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const TEXT_TO_SPEECH_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to clean and prepare text for speech
function prepareTextForSpeech(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Replace **bold** with just the text
    .replace(/\*(.*?)\*/g, '$1')    // Replace *italic* with just the text
    .replace(/•/g, '. Bullet point, ') // Convert bullets to speech
    .replace(/\n\n/g, '. ') // Replace double new lines with pauses
    .replace(/\n([0-9]+)\./g, '. Number $1, ') // Handle numbered lists
    .replace(/^([0-9]+)\./gm, 'Number $1, ') // Handle numbered list items at line start
    .replace(/\n-\s/g, '. Bullet point, ') // Handle dash lists
    .replace(/\n/g, ' ') // Replace remaining new lines with spaces
    .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
    .replace(/Source:/g, 'Source,') // Better speak source citations
    .replace(/\(Source:/g, '(Source,')
    .replace(/\[/g, '')  // Remove square brackets
    .replace(/\]/g, '')  // Remove square brackets
    .trim();
}

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

    // Clean and prepare text for speech
    const processedText = prepareTextForSpeech(text);
    
    console.log("Converting text to speech:", processedText.substring(0, 100) + "...");
    
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
          text: processedText
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

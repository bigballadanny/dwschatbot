
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const TEXT_TO_SPEECH_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:streamGenerateContent";

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

    const { audio, messages, isVoiceInput } = await req.json();
    
    // Process voice input if provided
    let userText = "";
    if (isVoiceInput && audio) {
      // Since we don't have direct Speech-to-Text integration yet, 
      // clients should send the text transcription from the browser's SpeechRecognition API
      userText = audio;
    } else {
      // For text input, just use the last message content
      const lastMessage = messages[messages.length - 1];
      userText = lastMessage.content;
    }
    
    if (!userText) {
      return new Response(JSON.stringify({ error: "No text input provided" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    
    console.log("Processing user input:", userText);
    
    // Format messages for Gemini API
    const formattedMessages = messages.map(msg => ({
      role: msg.source === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Add system instructions if not present
    if (!formattedMessages.some(msg => msg.role === 'model' && msg.parts[0].text.includes("Carl Allen"))) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ 
          text: "You are Carl Allen's Expert Bot. You answer questions about business acquisitions based on Carl Allen's teachings. Be practical, actionable, and conversational." 
        }]
      });
    }

    // Call Gemini API with streaming enabled
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

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error:", errorData);
      return new Response(JSON.stringify({ 
        error: errorData.error?.message || "Failed to generate response" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status
      });
    }

    // Extract the generated text
    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
      "I'm sorry, I couldn't generate a response at this time.";
    
    console.log("Generated text response:", generatedText.substring(0, 100) + "...");
    
    // Convert response to speech if needed
    const voiceName = 'en-US-Neural2-F'; // Default female voice
    const voiceGender = voiceName.includes("Male") || voiceName.endsWith("-D") ? "MALE" : "FEMALE";
    
    // Call Google Text-to-Speech API
    const ttsResponse = await fetch(`${TEXT_TO_SPEECH_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          text: generatedText
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

    if (!ttsResponse.ok) {
      const errorData = await ttsResponse.json();
      console.error("Text-to-Speech API error:", errorData);
      
      // Return text response if speech synthesis fails
      return new Response(JSON.stringify({ 
        content: generatedText,
        source: 'gemini',
        error: "Speech synthesis failed, but text response is available." 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the audio content (base64 encoded)
    const ttsData = await ttsResponse.json();
    const audioContent = ttsData.audioContent;

    return new Response(JSON.stringify({ 
      content: generatedText,
      audioContent: audioContent,
      source: 'gemini'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in voice-conversation function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || "An unexpected error occurred"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

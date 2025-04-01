
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const TEXT_TO_SPEECH_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to prepare text for speech
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

    const { audio, messages, isVoiceInput, enableOnlineSearch, context } = await req.json();
    
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
    console.log("Online search enabled:", enableOnlineSearch ? "yes" : "no");
    
    // Format messages for Gemini API
    const formattedMessages = messages.map(msg => ({
      role: msg.source === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Add system instructions if not present
    if (!formattedMessages.some(msg => msg.role === 'model' && msg.parts[0].text.includes("DWS AI"))) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ 
          text: "You are DWS AI, an assistant powered by Gemini 2.0, designed as a trusted guide for Carl Allen's M&A mastermind community. You answer questions about business acquisitions based on Carl Allen's teachings." 
        }]
      });
    }

    // Add context if provided
    if (context) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ text: context }]
      });
    }

    // Call Gemini API without streaming to get full response at once
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
    
    // Process the text for better speech synthesis
    const processedTextForSpeech = prepareTextForSpeech(generatedText);
    
    // Extract any citation information from the generated text
    const citationMatch = generatedText.match(/\(Source: (.*?)\)/);
    const citation = citationMatch ? [citationMatch[0]] : undefined;
    
    // Determine the source type based on the citation
    let source = 'gemini';
    if (citation && citation[0].includes("mastermind call")) {
      source = 'transcript';
    } else if (enableOnlineSearch && !citation) {
      source = 'web';
    }
    
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
          text: processedTextForSpeech
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
        source: source,
        citation: citation,
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
      source: source,
      citation: citation
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

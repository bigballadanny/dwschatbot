# Text-to-Speech Function Optimizations

## Current Issues
- No client-side caching of speech audio
- Limited text processing options
- Every voice request makes a new Google API call
- No analytics on usage patterns
- No optimizations for frequently used phrases

## Optimizations

### 1. Response Caching

- Implement server-side caching for common phrases
- Add caching header to responses
- Optimize for reuse of audio segments

```typescript
// Hash function to create a stable identifier for text+voice combinations
function generateAudioHash(text: string, voice: string): string {
  const textHash = new TextEncoder().encode(text + voice);
  // Create SHA-256 hash of the text+voice
  const hashArray = Array.from(crypto.subtle.digest('SHA-256', textHash));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Cache check before making API call
async function getCachedAudio(textHash: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('tts_cache')
      .select('audio_content')
      .eq('text_hash', textHash)
      .maybeSingle();
      
    if (error) throw error;
    return data?.audio_content;
  } catch (error) {
    console.error("Cache read error:", error);
    return null;
  }
}

// After generating new audio, cache it
async function cacheAudio(textHash: string, audioContent: string, text: string, voice: string) {
  try {
    await supabaseAdmin
      .from('tts_cache')
      .insert({
        text_hash: textHash,
        audio_content: audioContent,
        text_sample: text.substring(0, 100), // Store a sample for debugging
        voice: voice,
        created_at: new Date().toISOString()
      });
      
    console.log(`Cached audio for hash: ${textHash}`);
  } catch (error) {
    console.error("Cache write error:", error);
  }
}
```

### 2. Enhanced Text Processing

- Improve text preparation for better speech quality
- Add customization options for speech generation
- Support SSML for advanced control

```typescript
// Enhanced text processing with SSML support
function enhancedPrepareText(text: string, options: { useSSML?: boolean, emphasis?: string[] } = {}): string {
  // Basic text cleaning
  let processedText = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\n\n/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ');
    
  // If SSML is requested, add markup
  if (options.useSSML) {
    // Convert bullet points to SSML pauses and emphasis
    processedText = processedText
      .replace(/•/g, '<break time="500ms"/> <emphasis level="moderate">Bullet point:</emphasis> ')
      .replace(/\n([0-9]+)\./g, '<break time="500ms"/> <emphasis level="moderate">Number $1:</emphasis> ');
      
    // Add emphasis to important phrases specified in options
    if (options.emphasis && options.emphasis.length > 0) {
      for (const phrase of options.emphasis) {
        const regex = new RegExp(`(${phrase})`, 'gi');
        processedText = processedText.replace(regex, '<emphasis level="strong">$1</emphasis>');
      }
    }
    
    // Wrap in SSML speak tags
    processedText = `<speak>${processedText}</speak>`;
    
    return processedText;
  }
  
  // For non-SSML, use plain text processing
  return processedText
    .replace(/•/g, '. Bullet point, ')
    .replace(/\n([0-9]+)\./g, '. Number $1, ')
    .replace(/^([0-9]+)\./gm, 'Number $1, ');
}
```

### 3. Voice Profiles and Customization

- Allow users to save preferred voice settings
- Support voice customization parameters
- Implement voice presets for different content types

```typescript
// Voice profile system
interface VoiceProfile {
  name: string;
  languageCode: string;
  voiceName: string;
  ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  speakingRate: number;
  pitch: number;
  volumeGainDb: number;
}

// Preset voice profiles for different content types
const VOICE_PRESETS: Record<string, VoiceProfile> = {
  default: {
    name: 'Default',
    languageCode: 'en-US',
    voiceName: 'en-US-Neural2-F',
    ssmlGender: 'FEMALE',
    speakingRate: 1.0,
    pitch: 0,
    volumeGainDb: 0
  },
  technical: {
    name: 'Technical',
    languageCode: 'en-US',
    voiceName: 'en-US-Neural2-D',
    ssmlGender: 'MALE',
    speakingRate: 0.9, // Slightly slower for technical content
    pitch: -1,
    volumeGainDb: 1
  },
  narrative: {
    name: 'Narrative',
    languageCode: 'en-US',
    voiceName: 'en-US-Neural2-F',
    ssmlGender: 'FEMALE',
    speakingRate: 0.95,
    pitch: 2,
    volumeGainDb: 0
  }
};

// Apply voice profile to request
function applyVoiceProfile(profile: VoiceProfile, text: string) {
  return {
    input: {
      text
    },
    voice: {
      languageCode: profile.languageCode,
      name: profile.voiceName,
      ssmlGender: profile.ssmlGender
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: profile.speakingRate,
      pitch: profile.pitch,
      volumeGainDb: profile.volumeGainDb
    }
  };
}
```

### 4. Audio Chunking for Long Text

- Split long texts into manageable chunks
- Process chunks in parallel
- Stitch audio chunks back together

```typescript
// Split long text into chunks
function chunkText(text: string, maxChunkLength = 1000): string[] {
  // Don't split in the middle of sentences
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    // If adding this sentence would exceed max length, start new chunk
    if (currentChunk.length + sentence.length > maxChunkLength && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  
  // Add the last chunk if not empty
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

// Process chunks in parallel
async function processTextChunks(chunks: string[], voiceProfile: VoiceProfile): Promise<string> {
  // Process each chunk in parallel
  const chunkPromises = chunks.map(async (chunk) => {
    const requestData = applyVoiceProfile(voiceProfile, chunk);
    const response = await fetch(`${TEXT_TO_SPEECH_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) throw new Error(`Failed to process chunk: ${response.statusText}`);
    const data = await response.json();
    return data.audioContent;
  });
  
  // Wait for all chunks to complete
  const audioContents = await Promise.all(chunkPromises);
  
  // For simplicity, we'll return the base64 strings concatenated
  // In a real implementation, you'd need to decode, concatenate the audio data, and re-encode
  return audioContents.join('');
}
```

### 5. Client-Side Optimization

- Add client-side caching of audio
- Implement progressive loading for long audio
- Add preemptive generation based on user behavior

```typescript
// Client-side implementation (in the React app)
const useOptimizedSpeech = (options = {}) => {
  const { defaultVoice = 'en-US-Neural2-F', cacheEnabled = true } = options;
  
  // Local cache of generated speeches
  const audioCache = useMemo(() => new Map<string, string>(), []);
  
  // Generate speech with caching
  const generateSpeech = useCallback(async (text: string, voice = defaultVoice) => {
    // Create a cache key
    const cacheKey = `${text.substring(0, 100)}_${voice}`;
    
    // Check local cache first
    if (cacheEnabled && audioCache.has(cacheKey)) {
      return audioCache.get(cacheKey)!;
    }
    
    // Call API if not in cache
    const { data, error } = await supabase.functions.invoke('text-to-speech', {
      body: { text, voice }
    });
    
    if (error || !data?.audioContent) throw error || new Error('No audio content');
    
    // Store in cache for future use
    if (cacheEnabled) {
      audioCache.set(cacheKey, data.audioContent);
      
      // Limit cache size to prevent memory issues
      if (audioCache.size > 20) {
        // Remove oldest entry
        const firstKey = audioCache.keys().next().value;
        audioCache.delete(firstKey);
      }
    }
    
    return data.audioContent;
  }, [audioCache, cacheEnabled, defaultVoice]);
  
  return { generateSpeech };
};
```

## Implementation Priority

1. Response Caching (Highest) - Improves performance and reduces API costs
2. Enhanced Text Processing - Improves speech quality
3. Audio Chunking - Handles long text correctly
4. Client-Side Optimization - Better user experience
5. Voice Profiles - Enhances customization options
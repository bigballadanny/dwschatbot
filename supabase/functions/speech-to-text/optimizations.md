# Speech-to-Text Function Optimizations

## Current Issues
- No interim results during long recordings
- Limited audio format support
- Fixed sample rate assumption
- No customization options for speech recognition
- No analytics or user feedback loop

## Optimizations

### 1. Adaptive Audio Configuration

- Automatically detect audio format and sample rate
- Support multiple audio codecs
- Adjust quality based on network conditions

```typescript
// Detect audio format and properties
function detectAudioProperties(audioData: string): {
  encoding: string;
  sampleRateHertz: number;
  audioChannelCount: number;
} {
  // For a true implementation, we would need to analyze audio headers
  // This is a simplified version that looks at common patterns

  // Default configuration
  let config = {
    encoding: "WEBM_OPUS",
    sampleRateHertz: 48000,
    audioChannelCount: 1
  };
  
  try {
    // For example, WAV files typically start with RIFF header
    const firstBytes = audioData.substring(0, 10);
    
    if (firstBytes.includes("RIFF")) {
      config.encoding = "LINEAR16";
      // Would extract actual sample rate from WAV header
    } else if (firstBytes.includes("OggS")) {
      config.encoding = "OGG_OPUS";
    }
    // Add more detection logic for other formats
    
    return config;
  } catch (e) {
    console.log("Error detecting audio properties, using defaults:", e);
    return config;
  }
}

// Updated function using detected properties
function createRecognitionConfig(audioData: string, options: any = {}) {
  const audioProps = detectAudioProperties(audioData);
  
  return {
    config: {
      encoding: options.encoding || audioProps.encoding,
      sampleRateHertz: options.sampleRateHertz || audioProps.sampleRateHertz,
      audioChannelCount: options.audioChannelCount || audioProps.audioChannelCount,
      languageCode: options.languageCode || "en-US",
      enableAutomaticPunctuation: options.enableAutomaticPunctuation !== false,
      model: options.model || "latest_long"
    },
    audio: {
      content: audioData
    }
  };
}
```

### 2. Domain-Specific Recognition

- Add support for specialized vocabulary (business, technical terms)
- Allow phrase hints for improved accuracy
- Implement domain-specific models

```typescript
// Add domain-specific speech recognition
function enhanceWithDomainKnowledge(config: any, domain: string = 'general'): any {
  // Clone the config to avoid modifying the original
  const enhancedConfig = JSON.parse(JSON.stringify(config));
  
  // Add domain-specific configurations
  switch (domain) {
    case 'business':
      // Add business terminology and phrases
      enhancedConfig.config.speechContexts = [{
        phrases: [
          "due diligence", "acquisition", "profit margin", "cash flow",
          "balance sheet", "quarterly", "fiscal year", "ROI", "KPI",
          "valuation", "stakeholders", "merger", "acquisition"
        ],
        boost: 10.0 // Boost recognition of these phrases
      }];
      break;
      
    case 'technical':
      // Add technical terminology
      enhancedConfig.config.speechContexts = [{
        phrases: [
          "API", "frontend", "backend", "database", "framework",
          "JavaScript", "TypeScript", "React", "Node.js", "SQL",
          "optimization", "algorithm", "deployment", "integration"
        ],
        boost: 10.0
      }];
      break;
      
    case 'medical':
      // Add medical terminology
      enhancedConfig.config.speechContexts = [{
        phrases: [
          "diagnosis", "treatment", "symptoms", "patient", "chronic",
          "acute", "medication", "prescription", "therapy", "surgical"
        ],
        boost: 10.0
      }];
      break;
      
    default:
      // No specific domain enhancements
      break;
  }
  
  return enhancedConfig;
}
```

### 3. Streaming Recognition Support

- Add support for real-time transcription
- Implement websocket connections for streaming
- Return interim results for immediate feedback

```typescript
// Note: This would require implementing a WebSocket server
// This is a simplified example of what the code structure might look like

// New WebSocket endpoint for streaming recognition
async function handleStreamingRecognition(ws: WebSocket) {
  let recognizeStream: any = null;
  
  // Set up Google Speech streaming client
  // This would need to be adapted for your specific environment
  
  // Listen for audio chunks from the client
  ws.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      
      if (message.type === 'start') {
        // Initialize streaming recognition with config
        recognizeStream = startStreamingRecognition(message.config);
        
        // Forward interim results to client
        recognizeStream.on('data', (data: any) => {
          const interim = data.results?.[0]?.alternatives?.[0]?.transcript || "";
          const isFinal = data.results?.[0]?.isFinal || false;
          
          ws.send(JSON.stringify({
            type: 'result',
            transcript: interim,
            isFinal
          }));
        });
        
        recognizeStream.on('error', (error: any) => {
          ws.send(JSON.stringify({
            type: 'error',
            error: error.message
          }));
        });
        
      } else if (message.type === 'audio') {
        // Process audio chunk if stream is active
        if (recognizeStream) {
          recognizeStream.write(Buffer.from(message.data, 'base64'));
        }
        
      } else if (message.type === 'stop') {
        // Close recognition stream and get final result
        if (recognizeStream) {
          recognizeStream.end();
        }
      }
      
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  };
  
  // Handle client disconnect
  ws.onclose = () => {
    if (recognizeStream) {
      recognizeStream.end();
    }
  };
}
```

### 4. Recognition Quality Analytics

- Track recognition accuracy and errors
- Collect user feedback to improve future recognitions
- Implement a correction learning system

```typescript
// Track recognition quality and user feedback
async function trackRecognitionQuality(transcription: string, audioData: string, requestInfo: any) {
  // Generate a hash of the audio for reference
  const audioHash = await generateHash(audioData);
  
  // Store basic analytics info
  const analyticsData = {
    timestamp: new Date().toISOString(),
    audio_hash: audioHash,
    transcription_length: transcription.length,
    audio_duration_seconds: estimateAudioDuration(audioData),
    language_code: requestInfo.languageCode || 'en-US',
    model_used: requestInfo.model || 'latest_long',
    user_id: requestInfo.userId, // If available
    user_corrected: false,
    user_correction: null,
    confidence_score: calculateConfidenceScore(transcription)
  };
  
  // Store in analytics table
  if (supabaseAdmin) {
    try {
      await supabaseAdmin
        .from('stt_analytics')
        .insert(analyticsData);
      
      console.log('Recognition quality data stored');
    } catch (error) {
      console.error('Failed to store recognition analytics:', error);
    }
  }
  
  return audioHash; // Return hash for future reference (e.g., if user provides correction)
}

// Estimate audio duration from base64 size
function estimateAudioDuration(audioBase64: string): number {
  // Very rough approximation: WebM Opus at 48kHz mono is ~6KB per second
  const audioSizeBytes = (audioBase64.length * 3) / 4; // Approximate raw size
  return Math.round(audioSizeBytes / (6 * 1024));
}

// Calculate confidence score based on transcription characteristics
function calculateConfidenceScore(transcription: string): number {
  if (!transcription) return 0;
  
  // This is a very simplified heuristic
  // Real implementation would use more sophisticated analysis
  
  // Penalize very short transcriptions
  if (transcription.length < 5) return 0.5;
  
  // Check for common patterns of bad transcription
  if (transcription.includes('um') || transcription.includes('uh')) {
    return 0.7; // Likely contains filler words
  }
  
  // Check for proper sentence structure
  const hasPunctuation = /[.!?]/.test(transcription);
  const hasCapitalization = /[A-Z]/.test(transcription);
  
  if (hasPunctuation && hasCapitalization) {
    return 0.9; // Likely a good transcription
  }
  
  return 0.8; // Default reasonably confident
}

// Record user correction for future improvement
async function recordUserCorrection(audioHash: string, originalTranscription: string, userCorrection: string) {
  if (supabaseAdmin) {
    try {
      // Update the analytics record with the correction
      await supabaseAdmin
        .from('stt_analytics')
        .update({
          user_corrected: true,
          user_correction: userCorrection,
          correction_timestamp: new Date().toISOString()
        })
        .eq('audio_hash', audioHash);
      
      // Store the correction pair for learning
      await supabaseAdmin
        .from('stt_corrections')
        .insert({
          audio_hash: audioHash,
          original_transcription: originalTranscription,
          corrected_transcription: userCorrection,
          submitted_at: new Date().toISOString()
        });
      
      console.log('User correction recorded for audio:', audioHash);
    } catch (error) {
      console.error('Failed to record user correction:', error);
    }
  }
}
```

### 5. Client-Side Integration

- Add client-side noise reduction
- Implement automatic volume normalization
- Provide user feedback during recording

```typescript
// Client-side implementation (in React app)
const useEnhancedSpeechRecognition = (options = {}) => {
  const {
    autoNoiseReduction = true,
    volumeNormalization = true,
    visualFeedback = true
  } = options;
  
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // Set up audio processing and recording
  const setupAudio = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create audio processing pipeline if enabled
      if (autoNoiseReduction || volumeNormalization || visualFeedback) {
        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        
        // Add noise reduction if enabled
        if (autoNoiseReduction) {
          const noiseReducer = audioContextRef.current.createBiquadFilter();
          noiseReducer.type = 'highpass';
          noiseReducer.frequency.value = 100;
          source.connect(noiseReducer);
          
          // Connect to analyzer for visualization
          if (visualFeedback) {
            analyserRef.current = audioContextRef.current.createAnalyser();
            noiseReducer.connect(analyserRef.current);
          }
        } else if (visualFeedback) {
          // Connect directly to analyzer if no noise reduction
          analyserRef.current = audioContextRef.current.createAnalyser();
          source.connect(analyserRef.current);
        }
      }
      
      // Create MediaRecorder with processed audio if available
      const recorderOptions = { mimeType: 'audio/webm' };
      mediaRecorderRef.current = new MediaRecorder(stream, recorderOptions);
      
      // Set up event listeners
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };
      
      return true;
    } catch (error) {
      console.error('Error setting up audio recording:', error);
      setErrorMessage('Could not access microphone. Please check permissions.');
      return false;
    }
  }, [autoNoiseReduction, volumeNormalization, visualFeedback]);
  
  // Start visualization if enabled
  useEffect(() => {
    let animationFrame: number;
    
    if (isRecording && visualFeedback && analyserRef.current) {
      const updateVisualization = () => {
        const dataArray = new Uint8Array(analyserRef.current!.frequencyBinCount);
        analyserRef.current!.getByteFrequencyData(dataArray);
        
        // Calculate audio level (0-100)
        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        setAudioLevel(Math.min(100, Math.round(average * 100 / 256)));
        
        animationFrame = requestAnimationFrame(updateVisualization);
      };
      
      animationFrame = requestAnimationFrame(updateVisualization);
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isRecording, visualFeedback]);
  
  // Process recorded audio
  const processAudio = async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const base64 = await blobToBase64(audioBlob);
      
      // Call the speech-to-text function
      const { data, error } = await supabase.functions.invoke('speech-to-text', {
        body: { audioData: base64 }
      });
      
      if (error || !data?.transcription) {
        throw new Error(error?.message || 'Failed to transcribe speech');
      }
      
      setTranscript(data.transcription);
      setInterimTranscript('');
      
      return data.transcription;
    } catch (error) {
      console.error('Error processing audio:', error);
      setErrorMessage('Failed to process speech. Please try again.');
      return '';
    }
  };
  
  // Helper for blob to base64 conversion
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
  
  // Start recording
  const startRecording = useCallback(async () => {
    setErrorMessage('');
    setTranscript('');
    setInterimTranscript('');
    audioChunksRef.current = [];
    
    if (!mediaRecorderRef.current) {
      const success = await setupAudio();
      if (!success) return;
    }
    
    try {
      mediaRecorderRef.current!.start(1000); // Collect in 1-second chunks
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setErrorMessage('Failed to start recording. Please try again.');
    }
  }, [setupAudio]);
  
  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);
  
  return {
    isRecording,
    transcript,
    interimTranscript,
    audioLevel,
    errorMessage,
    startRecording,
    stopRecording
  };
};
```

## Implementation Priority

1. Adaptive Audio Configuration (Highest) - Improves recognition accuracy
2. Client-Side Integration - Better user experience
3. Domain-Specific Recognition - Improves accuracy for business terms
4. Recognition Quality Analytics - For long-term improvement
5. Streaming Recognition Support - Advanced feature for real-time feedback
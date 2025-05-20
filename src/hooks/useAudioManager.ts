import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AudioManagerOptions {
  autoPlay?: boolean;
  enabled?: boolean;
  defaultVoice?: string;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
}

/**
 * Unified hook for managing audio playback and recording
 * This consolidated hook replaces useAudio, useAudioPlayer, useAudioPlayback and useVoiceInput
 */
export function useAudioManager(options: AudioManagerOptions = {}) {
  const {
    autoPlay = false,
    enabled = true,
    defaultVoice = "en-US-Neural2-F",
    onPlaybackStart,
    onPlaybackEnd
  } = options;

  // Audio playback state
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  
  const { toast } = useToast();

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onplay = () => {
        setIsPlaying(true);
        onPlaybackStart?.();
      };
      audioRef.current.onpause = () => setIsPlaying(false);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        onPlaybackEnd?.();
      };
    }

    return () => {
      // Clean up on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      
      if (audioSrc) {
        URL.revokeObjectURL(audioSrc);
      }
    };
  }, [onPlaybackStart, onPlaybackEnd]);

  // PLAYBACK FUNCTIONALITY
  
  /**
   * Generate speech from text using text-to-speech service
   */
  const generateSpeech = async (text: string, voice: string = defaultVoice): Promise<boolean> => {
    if (!enabled || !text || isGenerating) return false;
    
    // Clean up any existing audio first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      setIsPlaying(false);
    }
    
    setIsGenerating(true);
    
    try {
      // Process text for better speech synthesis
      const processedText = text
        .replace(/\*\*/g, '') 
        .replace(/\*/g, '')
        .replace(/•/g, ', bullet point, ')
        .replace(/\n\n/g, '. ')
        .replace(/\n([0-9]+)\./g, '. Number $1,')
        .replace(/^([0-9]+)\./gm, 'Number $1,')
        .replace(/\s{2,}/g, ' ');
      
      // Call text-to-speech function
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text: processedText,
          voice: voice
        }
      });

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Speech generation failed');
      }

      if (data?.audioContent) {
        playAudioContent(data.audioContent);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error generating speech:', error);
      toast({
        title: "Audio Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate audio",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsGenerating(false);
    }
  };
  
  /**
   * Play audio from base64 content
   */
  const playAudioContent = useCallback((audioContent: string): void => {
    if (!enabled || !audioContent) return;
    
    try {
      // Convert base64 to blob
      const audioBlob = base64ToBlob(audioContent, 'audio/mp3');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioSrc) {
        URL.revokeObjectURL(audioSrc);
      }
      
      setAudioSrc(audioUrl);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        
        if (autoPlay) {
          audioRef.current.play().catch(err => {
            console.error('Error playing audio:', err);
          });
        }
      }
    } catch (error) {
      console.error('Error processing audio content:', error);
      toast({
        title: "Audio Error",
        description: "Failed to process audio content",
        variant: "destructive"
      });
    }
  }, [enabled, audioSrc, autoPlay, toast]);

  /**
   * Toggle audio playback on/off
   */
  const togglePlayback = useCallback((): void => {
    if (!audioRef.current || !audioSrc) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
      });
    }
  }, [audioSrc, isPlaying]);

  /**
   * Stop audio and reset to beginning
   */
  const stopAudio = useCallback((): void => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  }, []);

  /**
   * Clear all audio resources
   */
  const clearAudio = useCallback((): void => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    
    if (audioSrc) {
      URL.revokeObjectURL(audioSrc);
      setAudioSrc(null);
    }
    
    setIsPlaying(false);
  }, [audioSrc]);

  // RECORDING FUNCTIONALITY
  
  /**
   * Set up media recorder for voice input
   */
  const setupMediaRecorder = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          setAudioChunks((chunks) => [...chunks, event.data]);
        }
      });
      
      recorder.addEventListener('stop', async () => {
        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          await processAudioForTranscription(audioBlob);
        }
      });
      
      setMediaRecorder(recorder);
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Access Error",
        description: "Could not access your microphone. Please check your browser permissions.",
        variant: "destructive",
      });
      return false;
    }
  };

  /**
   * Start recording audio
   */
  const startRecording = async (): Promise<void> => {
    setAudioChunks([]);
    
    if (!mediaRecorder) {
      const success = await setupMediaRecorder();
      if (!success) return;
    }
    
    if (mediaRecorder && mediaRecorder.state !== 'recording') {
      mediaRecorder.start(1000); // Collect chunks every second
      setIsRecording(true);
      
      // Clear any existing transcript
      setTranscript('');
    }
  };

  /**
   * Stop recording audio
   */
  const stopRecording = useCallback((): void => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    } else {
      setIsRecording(false);
    }
  }, [mediaRecorder]);

  /**
   * Process recorded audio for transcription
   */
  const processAudioForTranscription = async (audioBlob: Blob): Promise<string> => {
    setIsProcessing(true);
    
    try {
      // Convert Blob to base64
      const reader = new FileReader();
      const audioBase64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      
      reader.readAsDataURL(audioBlob);
      const audioBase64 = await audioBase64Promise;
      
      // Send to Speech-to-Text function
      const { data, error } = await supabase.functions.invoke('speech-to-text', {
        body: { audioData: audioBase64 }
      });
      
      if (error) throw error;
      
      if (data.transcription) {
        setTranscript(data.transcription);
        return data.transcription;
      } else if (data.error) {
        throw new Error(data.error);
      }
      
      return '';
    } catch (error) {
      console.error('Error processing audio for transcription:', error);
      toast({
        title: "Speech Recognition Error",
        description: error instanceof Error ? error.message : "Failed to process your speech",
        variant: "destructive",
      });
      return '';
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Clear transcription text
   */
  const clearTranscript = useCallback((): void => {
    setTranscript('');
  }, []);

  // UTILITY FUNCTIONS
  
  /**
   * Convert base64 string to Blob
   */
  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: mimeType });
  };

  // Method to set source directly - needed for compatibility with some components
  const setAudioSource = useCallback((src: string | null): void => {
    if (audioSrc) {
      URL.revokeObjectURL(audioSrc);
    }
    
    setAudioSrc(src);
    
    if (src && audioRef.current) {
      audioRef.current.src = src;
      if (autoPlay) {
        audioRef.current.play().catch(err => {
          console.error('Error playing audio:', err);
        });
      }
    }
  }, [audioSrc, autoPlay]);

  // Toggle enabled state (for muting/unmuting)
  const toggleEnabled = useCallback((): void => {
    if (!enabled) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [enabled]);

  return {
    // Shared state
    enabled,
    toggleEnabled,
    
    // Playback API
    audioSrc,
    isGenerating,
    isPlaying,
    generateSpeech,
    playAudioContent,
    togglePlayback,
    stopAudio,
    clearAudio,
    setAudioSource,
    
    // Recording API
    transcript,
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    clearTranscript,
    setTranscript,
    
    // Audio element (for direct access when needed)
    audioElement: audioRef.current
  };
}
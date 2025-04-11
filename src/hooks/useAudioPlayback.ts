
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export function useAudioPlayback(enabled: boolean = true) {
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      
      audioRef.current.onplay = () => setIsPlaying(true);
      audioRef.current.onpause = () => setIsPlaying(false);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Text to speech conversion
  const generateSpeech = async (text: string, voice: string = "en-US-Neural2-F"): Promise<boolean> => {
    if (!enabled || !text || isGenerating) return false;
    
    // Clean up any existing audio
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
        const audioBlob = base64ToBlob(data.audioContent, 'audio/mp3');
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setAudioSrc(audioUrl);
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          await audioRef.current.play();
          return true;
        }
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

  // Utility to convert base64 to Blob
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

  // Play/pause control
  const togglePlayback = async () => {
    if (!audioRef.current || !audioSrc) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      await audioRef.current.play();
    }
  };

  // Stop and reset audio
  const stopAudio = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  // Clear audio completely
  const clearAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    
    setAudioSrc(null);
    setIsPlaying(false);
  };

  return {
    audioSrc,
    isPlaying,
    isGenerating,
    generateSpeech,
    togglePlayback,
    stopAudio,
    clearAudio
  };
}

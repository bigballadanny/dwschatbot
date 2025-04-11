
import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

export function useAudio(isEnabled = false) {
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Initialize or clean up audio element on mount/unmount
  useEffect(() => {
    // Clean up on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      // Revoke any object URL to prevent memory leaks
      if (audioSrc) {
        URL.revokeObjectURL(audioSrc);
      }
    };
  }, []);

  const playAudio = (audioContent: string) => {
    if (!isEnabled) return;
    
    try {
      // Clear any existing audio first
      clearAudio();
      
      // Convert base64 audio to blob
      const audioBlob = base64ToBlob(audioContent, 'audio/mp3');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      setAudioSrc(audioUrl);
      
      // Create and play audio using a single reference
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // Set up event handlers
      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => {
        setIsPlaying(false);
        // Don't clear audio src so it can be replayed
      };
      
      // Play the audio
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        setIsPlaying(false);
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      toast({
        title: "Audio Error",
        description: "Could not play the audio response.",
        variant: "destructive"
      });
    }
  };

  const stopAudio = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioSrc) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
      });
    }
    // isPlaying state will be updated via the event handlers
  };

  const clearAudio = () => {
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    // Revoke object URL if exists to free up memory
    if (audioSrc) {
      URL.revokeObjectURL(audioSrc);
      setAudioSrc(null);
    }
    
    setIsPlaying(false);
  };

  const base64ToBlob = (base64: string, mimeType: string) => {
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

  return {
    audioSrc,
    isGenerating,
    isPlaying,
    playAudio,
    stopAudio,
    togglePlayback,
    clearAudio
  };
}

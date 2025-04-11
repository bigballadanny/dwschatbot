
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

export function useAudio(isEnabled = false) {
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const { toast } = useToast();

  const playAudio = (audioContent: string) => {
    if (!isEnabled) return;
    
    try {
      // Clear any existing audio first
      clearAudio();
      
      // Convert base64 audio to blob
      const audioBlob = base64ToBlob(audioContent, 'audio/mp3');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      setAudioSrc(audioUrl);
      
      // Create and play audio
      const audio = new Audio(audioUrl);
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
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
    if (audioSrc) {
      // Find any audio elements playing this source and stop them
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        if (audio.src === audioSrc) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
    }
  };

  const clearAudio = () => {
    // Stop any playing audio
    stopAudio();
    
    // Revoke object URL if exists to free up memory
    if (audioSrc) {
      URL.revokeObjectURL(audioSrc);
      setAudioSrc(null);
    }
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
    playAudio,
    stopAudio,
    clearAudio
  };
}


import { useState, useRef } from 'react';

export function useAudioPlayer() {
  const [currentAudioSrc, setCurrentAudioSrc] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const initializeAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
  };

  const playAudio = (audioContent: string) => {
    const audioSrc = `data:audio/mp3;base64,${audioContent}`;
    setCurrentAudioSrc(audioSrc);
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentAudioSrc(null);
  };

  return {
    currentAudioSrc,
    setCurrentAudioSrc,
    playAudio,
    stopAudio,
    initializeAudio
  };
}

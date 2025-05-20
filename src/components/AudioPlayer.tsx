import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudio } from '@/contexts/AudioContext';

interface AudioPlayerProps {
  className?: string;
  displayControls?: boolean;
  compact?: boolean;
  autoPlay?: boolean;
  onStop?: () => void;
}

/**
 * Enhanced AudioPlayer component that uses the consolidated AudioContext
 */
const AudioPlayer = ({ 
  className, 
  displayControls = true,
  compact = false,
  autoPlay = false,
  onStop
}: AudioPlayerProps) => {
  // Get audio state and methods from context
  const { 
    audioSrc, 
    isPlaying, 
    togglePlayback, 
    stopAudio, 
    clearAudio
  } = useAudio();
  
  // Local state for UI
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const prevVolume = useRef(volume);
  const animationRef = useRef<number | null>(null);
  
  // Reference to audio element for direct manipulation
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    // Use the audio element from context if available
    if (!audioSrc) return;
    
    // Create a new audio element for local control
    const audio = new Audio(audioSrc);
    audioElementRef.current = audio;
    
    // Set initial volume
    audio.volume = volume;
    
    // Define event handlers
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      
      // Auto-play if requested
      if (autoPlay) {
        audio.play().catch(err => console.error('Error playing audio:', err));
      }
    };

    const handleEnded = () => {
      setProgress(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
    
    // Update progress function for smoother UI updates
    const updateProgress = () => {
      if (audio) {
        setProgress((audio.currentTime / audio.duration) * 100 || 0);
        if (!audio.paused) {
          animationRef.current = requestAnimationFrame(updateProgress);
        }
      }
    };
    
    // Add event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', () => {
      animationRef.current = requestAnimationFrame(updateProgress);
    });
    audio.addEventListener('pause', () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    });

    return () => {
      // Cleanup
      if (audioElementRef.current) {
        // Keep reference but pause playback
        audio.pause();
        
        // Remove event listeners
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
        
        // Cancel animation frame
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      }
    };
  }, [audioSrc, autoPlay, volume]);

  // Keep local UI in sync with global playing state
  useEffect(() => {
    if (audioElementRef.current) {
      if (isPlaying && audioElementRef.current.paused) {
        audioElementRef.current.play().catch(err => console.error('Error playing audio:', err));
      } else if (!isPlaying && !audioElementRef.current.paused) {
        audioElementRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    if (!audioElementRef.current) return;
    
    const newVolume = value[0];
    setVolume(newVolume);
    prevVolume.current = newVolume;
    audioElementRef.current.volume = newVolume;
    
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  // Handle mute toggle
  const toggleMute = () => {
    if (!audioElementRef.current) return;
    
    if (isMuted) {
      setVolume(prevVolume.current);
      audioElementRef.current.volume = prevVolume.current;
      setIsMuted(false);
    } else {
      prevVolume.current = volume;
      setVolume(0);
      audioElementRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  // Handle seeking
  const handleSeek = (value: number[]) => {
    if (!audioElementRef.current) return;
    
    const seekTime = (value[0] / 100) * duration;
    audioElementRef.current.currentTime = seekTime;
    setProgress(value[0]);
  };
  
  // Handle stop audio
  const handleStop = () => {
    stopAudio();
    
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = 0;
      setProgress(0);
    }
    
    if (onStop) {
      onStop();
    }
  };

  // Format time in MM:SS
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Calculate current time
  const currentTime = duration * (progress / 100);

  // If no audio or controls display is disabled, just return null
  if (!audioSrc || !displayControls) {
    return null;
  }

  // Compact player layout (just play/pause button)
  if (compact) {
    return (
      <div className={cn("inline-flex items-center", className)}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          onClick={togglePlayback}
        >
          {isPlaying ? 
            <Pause className="h-4 w-4" /> : 
            <Play className="h-4 w-4" />
          }
        </Button>
      </div>
    );
  }

  // Full player layout
  return (
    <div className={cn("w-full flex flex-col space-y-2 p-3 bg-secondary/20 rounded-lg", className)}>
      <div className="flex items-center space-x-2">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8"
          onClick={togglePlayback}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        
        <div className="flex-1">
          <Slider 
            value={[progress]} 
            min={0} 
            max={100} 
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
        </div>
        
        <span className="text-xs text-muted-foreground mx-2 whitespace-nowrap">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
      
      <div className="flex items-center space-x-2 justify-between">
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={toggleMute}
          >
            {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          </Button>
          
          <Slider 
            value={[volume]} 
            min={0} 
            max={1} 
            step={0.01}
            onValueChange={handleVolumeChange}
            className="w-24 cursor-pointer"
          />
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStop}
          className="text-xs"
        >
          Stop
        </Button>
      </div>
    </div>
  );
};

export default AudioPlayer;
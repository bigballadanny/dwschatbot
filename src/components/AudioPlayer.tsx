
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  audioSrc: string;
  className?: string;
}

const AudioPlayer = ({ audioSrc, className }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevVolume = useRef(volume);
  
  useEffect(() => {
    // Create audio element
    const audio = new Audio(audioSrc);
    audioRef.current = audio;

    // Event listeners
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setProgress((audio.currentTime / audio.duration) * 100);
      if (audio.ended) {
        setIsPlaying(false);
      }
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);
    });

    return () => {
      // Cleanup
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        Object.values(audioRef.current as any).forEach(handler => {
          audioRef.current?.removeEventListener?.('loadedmetadata', handler);
          audioRef.current?.removeEventListener?.('timeupdate', handler);
          audioRef.current?.removeEventListener?.('ended', handler);
        });
      }
    };
  }, [audioSrc]);

  // Handle play/pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    
    const newVolume = value[0];
    setVolume(newVolume);
    prevVolume.current = newVolume;
    audioRef.current.volume = newVolume;
    
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  // Handle mute toggle
  const toggleMute = () => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      setVolume(prevVolume.current);
      audioRef.current.volume = prevVolume.current;
      setIsMuted(false);
    } else {
      prevVolume.current = volume;
      setVolume(0);
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  // Handle seeking
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    
    const seekTime = (value[0] / 100) * duration;
    audioRef.current.currentTime = seekTime;
    setProgress(value[0]);
  };

  // Format time in MM:SS
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Calculate current time
  const currentTime = duration * (progress / 100);

  return (
    <div className={cn("w-full flex flex-col space-y-2 p-3 bg-secondary/20 rounded-lg", className)}>
      <div className="flex items-center space-x-2">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8"
          onClick={togglePlay}
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
    </div>
  );
};

export default AudioPlayer;

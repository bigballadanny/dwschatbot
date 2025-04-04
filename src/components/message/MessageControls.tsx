
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Headphones, Copy, Check, Volume2, VolumeX } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import AudioPlayer from '@/components/AudioPlayer';

interface MessageControlsProps {
  content: string;
  citation?: string[];
  isLoading?: boolean;
}

const MessageControls: React.FC<MessageControlsProps> = ({ content, citation, isLoading }) => {
  const [copied, setCopied] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  
  // Effect to clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleTextToSpeech = async () => {
    if (isLoading) return;
    
    // Stop any currently playing audio first
    if (audioRef.current) {
      stopAudio();
      audioRef.current = null;
      setAudioSrc(null);
    }
    
    try {
      setIsGeneratingAudio(true);
      
      // Clean up the text for better speech synthesis
      const textToConvert = content
        .replace(/\*\*/g, '') // Remove asterisks for bold
        .replace(/\*/g, '')    // Remove asterisks for italic
        .replace(/•/g, ', bullet point, ') // Convert bullets to spoken text
        .replace(/\n\n/g, '. ') // Convert double line breaks to pauses
        .replace(/\n([0-9]+)\./g, '. Number $1,') // Convert numbered lists
        .replace(/^([0-9]+)\./gm, 'Number $1,') // Convert numbered list items at line start
        .replace(/\s{2,}/g, ' '); // Replace multiple spaces with single space
      
      toast({
        title: "Generating audio...",
        description: "Please wait while we convert the text to speech.",
      });

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text: textToConvert,
          voice: "en-US-Neural2-F"
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.audioContent) {
        const audioBlob = base64ToBlob(data.audioContent, 'audio/mp3');
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioSrc(audioUrl);
        
        // Create and store audio element for playback control
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onplaying = () => setIsPlaying(true);
        audio.onended = () => setIsPlaying(false);
        audio.onpause = () => setIsPlaying(false);
        
        // Auto-play
        audio.play().catch(err => {
          console.error('Error playing audio:', err);
          setIsPlaying(false);
        });
        
        toast({
          title: "Audio generated",
          description: "Your audio is playing. You can mute it using the audio player controls.",
        });
      }
    } catch (error) {
      console.error('Error generating speech:', error);
      toast({
        title: "Error generating audio",
        description: error instanceof Error ? error.message : "Failed to convert text to speech.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAudio(false);
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

  if (isLoading) {
    return null;
  }

  return (
    <>
      <div className="mt-3 flex items-center">
        {!audioSrc && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="px-2 h-8 text-xs"
            onClick={handleTextToSpeech}
            disabled={isGeneratingAudio}
          >
            <Headphones className="h-3 w-3 mr-1" />
            {isGeneratingAudio ? "Generating..." : "Listen"}
          </Button>
        )}
        
        {audioSrc && isPlaying && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="px-2 h-8 text-xs"
            onClick={stopAudio}
          >
            <VolumeX className="h-3 w-3 mr-1" />
            <span className="ml-1">Stop Audio</span>
          </Button>
        )}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCopy}
                className="px-2 h-8 text-xs"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span className="ml-1">{copied ? "Copied" : "Copy"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{copied ? "Copied to clipboard!" : "Copy message to clipboard"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {audioSrc && (
        <div className="mt-3">
          <AudioPlayer 
            audioSrc={audioSrc} 
            onStop={stopAudio} 
            isPlayingExternally={isPlaying}
          />
        </div>
      )}

      {citation && citation.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          <p className="italic">{citation.join(', ')}</p>
        </div>
      )}
    </>
  );
};

export default MessageControls;


import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Headphones, Copy, Check, Volume2, VolumeX } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/ui/use-toast";
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
      stopAudio();
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
    
    // Ensure we clean up the AudioPlayer source too
    setAudioSrc(null);
  };

  const handleTextToSpeech = async () => {
    if (isLoading) return;
    
    // Stop any currently playing audio first
    stopAudio();
    
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
        
        // Create audio element but don't play automatically - let AudioPlayer handle it
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        // Set event handlers but don't auto-play
        audio.onplaying = () => setIsPlaying(true);
        audio.onended = () => {
          setIsPlaying(false);
          setAudioSrc(null); // Clear source when done
        };
        audio.onpause = () => setIsPlaying(false);
        
        // Set the source for AudioPlayer component
        setAudioSrc(audioUrl);
        
        toast({
          title: "Audio ready",
          description: "Your audio is ready to play",
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
            autoPlay={true}
          />
        </div>
      )}

      {citation && citation.length > 0 && (
        <div className="mt-3 text-xs text-amber-300 border-t border-zinc-700 pt-2">
          <div className="flex items-center mb-1">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <p className="font-semibold">Sources:</p>
          </div>
          <ul className="pl-5 list-disc space-y-1">
            {citation.map((source, index) => (
              <li key={index} className="italic hover:text-amber-200 transition-colors">
                {source}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

export default MessageControls;


import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Headphones, Copy, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import AudioPlayer from '@/components/AudioPlayer';

interface MessageControlsProps {
  content: string;
  isUser: boolean;
  isLoading: boolean;
}

const MessageControls: React.FC<MessageControlsProps> = ({ content, isUser, isLoading }) => {
  const [copied, setCopied] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const { toast } = useToast();
  
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTextToSpeech = async () => {
    if (isUser || isLoading) return;
    
    try {
      setIsGeneratingAudio(true);
      
      const textToConvert = content
        .replace(/\*\*/g, '')
        .replace(/•/g, 'bullet point')
        .replace(/\n\n/g, '. ');
      
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
        
        toast({
          title: "Audio generated",
          description: "Your audio is ready to play.",
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

  if (isUser || isLoading) {
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
          <AudioPlayer audioSrc={audioSrc} />
        </div>
      )}
    </>
  );
};

export default MessageControls;


import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Headphones } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import AudioPlayer from './AudioPlayer';

export type MessageSource = 'transcript' | 'web' | 'system' | 'user' | 'fallback';

export interface MessageProps {
  content: string;
  source: MessageSource;
  citation?: string;
  timestamp: Date;
  isLoading?: boolean;
  className?: string;
}

const MessageItem: React.FC<MessageProps> = ({
  content,
  source,
  citation,
  timestamp,
  isLoading = false,
  className
}) => {
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const { toast } = useToast();
  const isUser = source === 'user';
  const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const formattedContent = React.useMemo(() => {
    // First, replace any direct HTML tags with their encoded equivalents to prevent raw HTML rendering
    let sanitizedText = content
      .replace(/<strong>/g, '**')
      .replace(/<\/strong>/g, '**')
      .replace(/<em>/g, '*')
      .replace(/<\/em>/g, '*');
    
    // Handle asterisks for bold formatting (convert *text* to <strong>text</strong>)
    let formattedText = sanitizedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Handle bullet points
    formattedText = formattedText.replace(/^- (.*)/gm, '• $1');
    formattedText = formattedText.replace(/^• (.*)/gm, '• $1'); // Also handle existing bullet points
    
    // Handle numbered lists
    formattedText = formattedText.replace(/^(\d+)\. (.*)/gm, '$1. $2');
    
    // Split by paragraph breaks and create JSX elements
    return formattedText.split('\n\n').map((paragraph, index) => {
      // Check if paragraph is a bullet list
      if (paragraph.includes('\n• ')) {
        const listItems = paragraph.split('\n• ');
        const title = listItems.shift(); // Get the first line as title
        
        return (
          <div key={index} className={index > 0 ? 'mt-4' : ''}>
            {title && <p dangerouslySetInnerHTML={{ __html: title }} />}
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {listItems.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          </div>
        );
      } 
      // Check if paragraph is a numbered list
      else if (/\n\d+\.\s/.test(paragraph)) {
        const listItems = paragraph.split(/\n(\d+\.\s)/);
        const title = listItems.shift(); // Get the first line as title
        
        const numberItems = [];
        for (let i = 0; i < listItems.length; i += 2) {
          if (i + 1 < listItems.length) {
            numberItems.push(listItems[i] + listItems[i + 1]);
          }
        }
        
        return (
          <div key={index} className={index > 0 ? 'mt-4' : ''}>
            {title && <p dangerouslySetInnerHTML={{ __html: title }} />}
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              {numberItems.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ol>
          </div>
        );
      } 
      // Regular paragraph
      else {
        return (
          <p 
            key={index} 
            className={index > 0 ? 'mt-3' : ''} 
            dangerouslySetInnerHTML={{ __html: paragraph }}
          />
        );
      }
    });
  }, [content]);

  const handleTextToSpeech = async () => {
    if (isUser || isLoading) return;
    
    try {
      setIsGeneratingAudio(true);
      
      // Only generate speech for non-user messages
      const textToConvert = content
        .replace(/\*\*/g, '') // Remove bold markers
        .replace(/•/g, 'bullet point') // Replace bullet points
        .replace(/\n\n/g, '. '); // Replace double line breaks with periods
      
      toast({
        title: "Generating audio...",
        description: "Please wait while we convert the text to speech.",
      });

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text: textToConvert,
          voice: "en-US-Neural2-F" // Business-like female voice
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.audioContent) {
        // Convert base64 to audio source
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

  // Convert base64 to Blob
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
  
  return (
    <div className={cn(
      "flex w-full mb-6 animate-fade-in",
      isUser ? "justify-end" : "justify-start",
      className
    )}>
      <div className={cn(
        "max-w-[80%] sm:max-w-[70%] py-3 px-4 rounded-xl shadow-sm",
        "flex flex-col",
        isUser 
          ? "bg-primary text-primary-foreground rounded-tr-none"
          : source === 'system'
            ? "bg-secondary text-secondary-foreground"
            : source === 'fallback'
              ? "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
              : "glassmorphism rounded-tl-none",
        isLoading && "animate-pulse-subtle"
      )}>
        <div className="message-content prose prose-sm dark:prose-invert max-w-none">
          {formattedContent}
        </div>
        
        {citation && (
          <div className="mt-3 pt-2 border-t border-foreground/10 text-sm font-light opacity-80">
            {citation}
          </div>
        )}
        
        {!isUser && !isLoading && (
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
          </div>
        )}
        
        {audioSrc && (
          <div className="mt-3">
            <AudioPlayer audioSrc={audioSrc} />
          </div>
        )}
        
        <div className="flex justify-between items-center mt-2">
          {!isUser && (
            <div className="text-xs font-semibold uppercase tracking-wide">
              {source === 'transcript' ? (
                <span className="text-blue-500 dark:text-blue-300">Transcript Source</span>
              ) : source === 'web' ? (
                <span className="text-emerald-500 dark:text-emerald-300">Web Source</span>
              ) : source === 'fallback' ? (
                <span className="text-amber-600 dark:text-amber-300">Quota Limited Response</span>
              ) : source === 'system' ? (
                <span className="text-gray-500 dark:text-gray-400">System</span>
              ) : null}
            </div>
          )}
          <div className={cn(
            "text-xs opacity-60 ml-auto",
            isUser ? "text-primary-foreground" : "text-foreground"
          )}>
            {timeString}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;

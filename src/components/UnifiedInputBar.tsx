
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Send, Loader2, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export interface UnifiedInputBarProps {
  onSend: (message: string, isVoice: boolean) => Promise<void>;
  onFileUpload?: (files: FileList) => void;
  loading?: boolean;
  disabled?: boolean;
  enableAudio?: boolean;
  onToggleAudio?: () => void;
  placeholder?: string;
  className?: string;
}

const UnifiedInputBar: React.FC<UnifiedInputBarProps> = ({
  onSend,
  onFileUpload,
  loading = false,
  disabled = false,
  enableAudio = true,
  onToggleAudio,
  placeholder = "Type a message or press the mic button to speak...",
  className
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();
  
  // Setup SpeechRecognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        
        recognitionRef.current.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('');
          
          setTranscript(transcript);
          setInputValue(transcript);
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          if (event.error === 'not-allowed') {
            toast({
              title: "Microphone Access Denied",
              description: "Please allow microphone access to use voice input.",
              variant: "destructive",
            });
            setIsRecording(false);
          }
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRecording) {
      stopRecording();
    }
    
    if (!inputValue.trim() || loading || disabled) return;
    
    try {
      await onSend(inputValue, false);
      setInputValue('');
      setTranscript('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  const startRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      recognitionRef.current.start();
      setIsRecording(true);
      setInputValue('');
      setTranscript('');
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  };
  
  const stopRecording = async () => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.stop();
      setIsRecording(false);
      
      if (transcript.trim()) {
        setIsProcessingVoice(true);
        await onSend(transcript, true);
        setTranscript('');
        setInputValue('');
      }
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    } finally {
      setIsProcessingVoice(false);
    }
  };
  
  const handleFileClick = () => {
    if (onFileUpload) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onFileUpload) {
      onFileUpload(e.target.files);
    }
  };
  
  return (
    <form
      className={cn("flex items-center gap-2", className)}
      onSubmit={handleSubmit}
    >
      <Button
        type="button"
        variant={isRecording ? "destructive" : "outline"}
        size="icon"
        className="h-10 w-10 rounded-full flex-shrink-0"
        disabled={loading || disabled || isProcessingVoice}
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>
      
      <div className="relative flex-1">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={disabled || isRecording || loading || isProcessingVoice}
          placeholder={isRecording ? "Listening..." : placeholder}
          className={cn(
            "flex h-12 w-full rounded-full border border-input bg-background px-4 py-6 text-sm shadow-sm", 
            (disabled || isRecording) && "opacity-70"
          )}
        />
      </div>
      
      <div className="flex items-center">
        {onFileUpload && (
          <>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
              multiple
            />
            
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={disabled || loading || isProcessingVoice}
              className={cn(
                "h-10 w-10 text-muted-foreground hover:text-amber-500 transition-colors"
              )}
              onClick={handleFileClick}
              title="Upload document"
            >
              <Loader2 className="h-4 w-4" />
            </Button>
          </>
        )}
        
        {onToggleAudio && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onToggleAudio}
            className="h-10 w-10 text-muted-foreground hover:text-amber-500 transition-colors"
            title={enableAudio ? "Mute audio" : "Enable audio"}
          >
            {enableAudio ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        )}
        
        <Button
          type="submit"
          size="icon"
          disabled={loading || disabled || isProcessingVoice || (!inputValue.trim() && !isRecording)}
          className="h-10 w-10 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-black shadow-md"
        >
          {loading || isProcessingVoice ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </form>
  );
};

export default UnifiedInputBar;


import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Send, Loader2, Mic, MicOff, Volume2, VolumeX, Paperclip } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/integrations/supabase/client';

export interface UnifiedInputBarProps {
  onSend: (message: string, isVoice: boolean) => Promise<void>;
  onFileUpload?: (files: FileList) => void;
  loading?: boolean;
  disabled?: boolean;
  enableAudio?: boolean;
  onToggleAudio?: () => void;
  placeholder?: string;
  className?: string;
  showVoiceFeatures?: boolean; // New prop to control voice feature visibility
}

const UnifiedInputBar: React.FC<UnifiedInputBarProps> = ({
  onSend,
  onFileUpload,
  loading = false,
  disabled = false,
  enableAudio = true,
  onToggleAudio,
  placeholder = "Type a message...",
  className,
  showVoiceFeatures = false // Default to hiding voice features
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRecording) {
      stopRecording();
    }
    
    if (!inputValue.trim() || loading || disabled) return;
    
    try {
      await onSend(inputValue, false);
      setInputValue('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setInputValue('Listening...');
      
      toast({
        title: "Recording Started",
        description: "Speak now, recording will automatically stop after a pause.",
      });
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to use voice input.",
        variant: "destructive",
      });
    }
  };
  
  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;
    
    try {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessingVoice(true);
      setInputValue('Processing your voice...');
      
      // Wait for the mediaRecorder's onstop event
      await new Promise<void>((resolve) => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = () => {
            resolve();
          };
        } else {
          resolve();
        }
      });
      
      if (audioChunksRef.current.length === 0) {
        setIsProcessingVoice(false);
        setInputValue('');
        return;
      }
      
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convert the audio blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
          const base64 = base64String.split(',')[1];
          resolve(base64);
        };
      });
      
      // Send the audio to the Google Speech-to-Text API via our Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('speech-to-text', {
        body: { audioData: base64Audio }
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.transcription) {
        setInputValue(data.transcription);
        await onSend(data.transcription, true);
      } else {
        toast({
          title: "No Speech Detected",
          description: "We couldn't detect any speech. Please try again.",
          variant: "destructive",
        });
        setInputValue('');
      }
      
      // Stop all tracks of the MediaStream
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      
    } catch (error) {
      console.error('Error processing voice:', error);
      toast({
        title: "Voice Processing Error",
        description: "There was a problem processing your voice input.",
        variant: "destructive",
      });
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
      {/* Only show the mic button if showVoiceFeatures is true */}
      {showVoiceFeatures && (
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
      )}
      
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
              <Paperclip className="h-4 w-4" />
            </Button>
          </>
        )}
        
        {/* Only show the audio toggle button if showVoiceFeatures is true */}
        {showVoiceFeatures && onToggleAudio && (
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

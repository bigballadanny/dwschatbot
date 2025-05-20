import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudio } from '@/contexts/AudioContext';
import { toast } from '@/components/ui/use-toast';

interface VoiceInputProps {
  className?: string;
  onTranscript?: (text: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

/**
 * Voice Input component that uses the consolidated AudioContext
 */
const VoiceInput: React.FC<VoiceInputProps> = ({ 
  className,
  onTranscript,
  disabled = false,
  compact = false
}) => {
  // Get recording state and methods from context
  const { 
    isRecording, 
    isProcessing, 
    transcript, 
    startRecording, 
    stopRecording, 
    clearTranscript 
  } = useAudio();

  // Send transcript to parent when available
  useEffect(() => {
    if (transcript && onTranscript) {
      onTranscript(transcript);
      clearTranscript();
    }
  }, [transcript, onTranscript, clearTranscript]);

  // Toggle recording state
  const toggleRecording = async () => {
    if (disabled) return;
    
    if (isRecording) {
      stopRecording();
    } else {
      try {
        await startRecording();
      } catch (error) {
        console.error('Error starting recording:', error);
        toast({
          title: "Microphone Access Error",
          description: "Could not access your microphone. Please check your browser permissions.",
          variant: "destructive"
        });
      }
    }
  };

  // Determine button style based on recording state
  const getButtonStyle = () => {
    if (isRecording) {
      return "bg-red-500 hover:bg-red-600 text-white";
    }
    if (isProcessing) {
      return "bg-amber-500 hover:bg-amber-600 text-white";
    }
    return "bg-blue-500 hover:bg-blue-600 text-white";
  };

  // Compact button for minimal UI
  if (compact) {
    return (
      <Button
        type="button"
        size="icon"
        disabled={disabled}
        className={cn(
          "rounded-full h-10 w-10 text-white transition-colors",
          getButtonStyle(),
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={toggleRecording}
      >
        {isProcessing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>
    );
  }

  // Full button with text
  return (
    <Button
      type="button"
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-2 transition-colors",
        getButtonStyle(),
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={toggleRecording}
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Processing...</span>
        </>
      ) : isRecording ? (
        <>
          <MicOff className="h-5 w-5" />
          <span>Stop Recording</span>
        </>
      ) : (
        <>
          <Mic className="h-5 w-5" />
          <span>Record Voice</span>
        </>
      )}
    </Button>
  );
};

export default VoiceInput;
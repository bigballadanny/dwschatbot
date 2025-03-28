
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Send, Volume2, VolumeX } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { MessageProps } from '@/components/MessageItem';
import MessageItem from '@/components/MessageItem';
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VoiceConversationProps {
  className?: string;
  audioEnabled?: boolean;
  messages: MessageProps[];
  onSendMessage: (message: string) => Promise<void>;
  conversationId?: string | null;
}

// Define the interface for the ref
export interface VoiceConversationRefMethods {
  submitTranscript: (text: string) => Promise<void>;
}

const VoiceConversation = forwardRef<VoiceConversationRefMethods, VoiceConversationProps>(
  ({ className, audioEnabled = true, messages, onSendMessage, conversationId }, ref) => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [internalAudioEnabled, setInternalAudioEnabled] = useState(audioEnabled);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const { toast } = useToast();
    
    // Update internal state when prop changes
    useEffect(() => {
      setInternalAudioEnabled(audioEnabled);
    }, [audioEnabled]);
    
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    useEffect(() => {
      audioRef.current = new Audio();
      
      return () => {
        stopRecording();
      };
    }, []);
    
    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      submitTranscript: (text: string) => submitTranscript(text)
    }));
    
    const setupMediaRecorder = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        
        recorder.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0) {
            setAudioChunks((chunks) => [...chunks, event.data]);
          }
        });
        
        recorder.addEventListener('stop', async () => {
          if (audioChunks.length > 0) {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await processAudioForTranscription(audioBlob);
            setAudioChunks([]);
          }
        });
        
        setMediaRecorder(recorder);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast({
          title: "Microphone Access Error",
          description: "Could not access your microphone. Please check your browser permissions.",
          variant: "destructive",
        });
      }
    };
    
    const processAudioForTranscription = async (audioBlob: Blob) => {
      setIsLoading(true);
      
      try {
        // Convert Blob to base64
        const reader = new FileReader();
        const audioBase64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            // The result is a string like: "data:audio/webm;base64,XXXX"
            // We need to extract the base64 part
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
        });
        
        reader.readAsDataURL(audioBlob);
        const audioBase64 = await audioBase64Promise;
        
        // Send to our Speech-to-Text edge function
        const { data, error } = await supabase.functions.invoke('speech-to-text', {
          body: { audioData: audioBase64 }
        });
        
        if (error) throw error;
        
        if (data.transcription) {
          setTranscript(data.transcription);
          // Auto-submit if we have a good transcription
          if (data.transcription.trim().length > 5) {
            await submitTranscript(data.transcription);
          }
        } else if (data.error) {
          console.error('Speech-to-Text error:', data.error);
          toast({
            title: "Speech Recognition Error",
            description: data.error,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error processing audio for transcription:', error);
        toast({
          title: "Speech Processing Error",
          description: "Failed to process your speech. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    const toggleRecording = async () => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    };
    
    const startRecording = async () => {
      if (!mediaRecorder) {
        await setupMediaRecorder();
      }
      
      if (mediaRecorder && mediaRecorder.state !== 'recording') {
        setIsRecording(true);
        setAudioChunks([]);
        mediaRecorder.start(1000); // Collect chunks every second
      }
    };
    
    const stopRecording = () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      setIsRecording(false);
    };
    
    const toggleAudio = () => {
      setInternalAudioEnabled(!internalAudioEnabled);
      toast({
        title: internalAudioEnabled ? "Audio Disabled" : "Audio Enabled",
        description: internalAudioEnabled ? "Response audio is now muted." : "You will now hear voice responses.",
      });
    };
    
    const submitTranscript = async (text: string): Promise<void> => {
      if (!text.trim() || isLoading) return Promise.resolve();
      
      try {
        await onSendMessage(text);
        setTranscript('');
      } catch (error) {
        console.error('Error submitting transcript:', error);
        toast({
          title: "Error",
          description: "Failed to send your message. Please try again.",
          variant: "destructive",
        });
      }
      
      return Promise.resolve();
    };
    
    const handleInputSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      await submitTranscript(transcript);
    };
    
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <Alert className="mb-4 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
              <AlertDescription>
                This is a voice conversation interface. Press the microphone button to start speaking, 
                or type your questions in the input field below.
              </AlertDescription>
            </Alert>
            
            {messages.map((message, index) => (
              <MessageItem
                key={index}
                content={message.content}
                source={message.source}
                timestamp={message.timestamp}
                isLoading={message.isLoading}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        <div className="border-t glassmorphism">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <form onSubmit={handleInputSubmit} className="flex gap-3 items-center">
              <Button
                type="button"
                variant={isRecording ? "destructive" : "outline"}
                size="icon"
                className="h-12 w-12 rounded-full flex-shrink-0"
                onClick={toggleRecording}
                disabled={isLoading}
              >
                {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              
              <input
                type="text"
                placeholder={isRecording ? "Listening..." : "Type your question or press the mic button to speak..."}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                disabled={isLoading}
                className="flex h-12 w-full rounded-full border border-input bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              
              <Button 
                type="submit" 
                size="icon" 
                className="h-12 w-12 rounded-full flex-shrink-0"
                disabled={isLoading || !transcript.trim()}
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }
);

VoiceConversation.displayName = "VoiceConversation";

export default VoiceConversation;

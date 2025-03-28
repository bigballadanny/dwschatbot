
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
}

// Define the interface for the ref
interface VoiceConversationRefMethods {
  submitTranscript: (text: string) => Promise<void>;
}

const VoiceConversation = forwardRef<VoiceConversationRefMethods, VoiceConversationProps>(
  ({ className, audioEnabled = true }, ref) => {
    const [messages, setMessages] = useState<MessageProps[]>([{
      content: "Hello! I'm Carl Allen's Expert Bot. How can I help you with business acquisitions today? Press the microphone button and start speaking or type your question below.",
      source: 'system',
      timestamp: new Date(),
    }]);
    
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [internalAudioEnabled, setInternalAudioEnabled] = useState(audioEnabled);
    
    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const { toast } = useToast();
    
    // Update internal state when prop changes
    useEffect(() => {
      setInternalAudioEnabled(audioEnabled);
    }, [audioEnabled]);
    
    useEffect(() => {
      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        // @ts-ignore - TypeScript doesn't recognize webkitSpeechRecognition by default
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          setTranscript(finalTranscript || interimTranscript);
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          toast({
            title: "Speech Recognition Error",
            description: `Error: ${event.error}. Please try again.`,
            variant: "destructive",
          });
        };
        
        recognitionRef.current.onend = () => {
          if (transcript && isRecording) {
            submitTranscript(transcript);
          }
          setIsRecording(false);
        };
      }
      
      audioRef.current = new Audio();
      
      return () => {
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }
      };
    }, []);
    
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      submitTranscript: (text: string) => submitTranscript(text)
    }));
    
    const toggleRecording = () => {
      if (!recognitionRef.current) {
        toast({
          title: "Speech Recognition Not Available",
          description: "Your browser doesn't support speech recognition. Please type your question instead.",
          variant: "destructive",
        });
        return;
      }
      
      if (isRecording) {
        recognitionRef.current.stop();
      } else {
        setTranscript('');
        setIsRecording(true);
        recognitionRef.current.start();
      }
    };
    
    const toggleAudio = () => {
      setInternalAudioEnabled(!internalAudioEnabled);
      toast({
        title: internalAudioEnabled ? "Audio Disabled" : "Audio Enabled",
        description: internalAudioEnabled ? "Response audio is now muted." : "You will now hear voice responses.",
      });
    };
    
    const submitTranscript = async (text: string) => {
      if (!text.trim() || isLoading) return;
      
      const userMessage: MessageProps = {
        content: text,
        source: 'user',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setTranscript('');
      setIsLoading(true);
      
      try {
        setMessages(prev => [...prev, {
          content: "Thinking...",
          source: 'system',
          timestamp: new Date(),
          isLoading: true
        }]);
        
        const { data, error } = await supabase.functions.invoke('voice-conversation', {
          body: { 
            audio: text,
            messages: messages.concat(userMessage),
            isVoiceInput: true
          }
        });
        
        if (error) throw error;
        
        setMessages(prev => prev.filter(msg => !msg.isLoading));
        
        const responseMessage: MessageProps = {
          content: data.content,
          source: 'gemini',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, responseMessage]);
        
        if (internalAudioEnabled && data.audioContent && audioRef.current) {
          const audioSrc = `data:audio/mp3;base64,${data.audioContent}`;
          audioRef.current.src = audioSrc;
          audioRef.current.play().catch(err => {
            console.error('Error playing audio:', err);
          });
        }
      } catch (error) {
        console.error('Error in voice conversation:', error);
        
        setMessages(prev => prev.filter(msg => !msg.isLoading));
        
        setMessages(prev => [...prev, {
          content: "I'm sorry, I couldn't process your request. Please try again.",
          source: 'system',
          timestamp: new Date()
        }]);
        
        toast({
          title: "Error",
          description: "There was a problem processing your request. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
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

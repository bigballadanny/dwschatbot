import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { MessageProps } from '@/components/MessageItem';
import MessageItem from '@/components/MessageItem';
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAudio } from '@/contexts/audio';
import VoiceInput from './VoiceInput';

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
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const { toast } = useToast();
    
    // Get audio functionality from our consolidated context
    const { 
      transcript, 
      isRecording, 
      isProcessing,
      clearTranscript
    } = useAudio();
    
    // Scroll to bottom when messages change
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    // Update input field when transcript changes
    useEffect(() => {
      if (transcript) {
        setUserInput(transcript);
        
        // If we have a substantial transcript, auto-submit it
        if (transcript.trim().length > 5) {
          submitTranscript(transcript);
          clearTranscript();
        }
      }
    }, [transcript]);
    
    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      submitTranscript: (text: string) => submitTranscript(text)
    }));
    
    // Function to submit the transcript to be processed
    const submitTranscript = async (text: string): Promise<void> => {
      if (!text.trim() || isLoading) return Promise.resolve();
      
      setIsLoading(true);
      
      try {
        await onSendMessage(text);
        setUserInput('');
        clearTranscript();
      } catch (error) {
        console.error('Error submitting transcript:', error);
        toast({
          title: "Error",
          description: "Failed to send your message. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
      
      return Promise.resolve();
    };
    
    // Handle form submission
    const handleInputSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      await submitTranscript(userInput);
    };
    
    // Handle transcript from voice input
    const handleVoiceTranscript = (text: string) => {
      setUserInput(text);
      submitTranscript(text);
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
              <VoiceInput 
                compact 
                onTranscript={handleVoiceTranscript} 
                disabled={isLoading}
              />
              
              <input
                type="text"
                placeholder={isRecording ? "Listening..." : isProcessing ? "Processing your speech..." : "Type your question or press the mic button to speak..."}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={isLoading || isRecording || isProcessing}
                className="flex h-12 w-full rounded-full border border-input bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              
              <Button 
                type="submit" 
                size="icon" 
                className="h-12 w-12 rounded-full flex-shrink-0"
                disabled={isLoading || !userInput.trim() || isRecording || isProcessing}
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
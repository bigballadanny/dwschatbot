
import React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight } from "lucide-react";
import UnifiedInputBar from '@/components/UnifiedInputBar';

export interface WelcomeScreenProps {
  onStartChat: () => void;
  onSelectQuestion?: (question: string) => void;
  onSendMessage?: (message: string, isVoice: boolean) => Promise<void>;
  isLoading?: boolean;
  showInputBar?: boolean;
  className?: string;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onStartChat, 
  onSelectQuestion,
  onSendMessage,
  isLoading = false,
  showInputBar = false,
  className 
}) => {
  const { user } = useAuth();
  
  const handleSend = async (message: string, isVoice: boolean = false) => {
    if (onSendMessage) {
      await onSendMessage(message, isVoice);
    } else if (onSelectQuestion) {
      onSelectQuestion(message);
    }
  };
  
  return (
    <div className={cn(
      "w-full max-w-3xl mx-auto px-6 py-12 sm:py-16 flex flex-col items-center justify-center animate-fade-in",
      className
    )}>
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-8">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="w-10 h-10 text-primary"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M12 7v.01" />
          <path d="M16 11v.01" />
          <path d="M8 11v.01" />
        </svg>
      </div>

      <h1 className="text-4xl sm:text-5xl font-bold text-center mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
        DWS AI Assistant
      </h1>
      
      <p className="text-xl text-muted-foreground text-center text-balance mb-8 max-w-2xl">
        Your expert guide for insights from Carl Allen's mastermind about business acquisitions, 
        deal structuring, and more.
      </p>
      
      <div className="p-5 rounded-lg bg-primary/5 border border-primary/10 mb-8 max-w-2xl w-full">
        <h2 className="text-lg font-medium mb-3">How I Can Help You:</h2>
        <ul className="space-y-2">
          <li className="flex items-start">
            <span className="text-primary mr-2">•</span>
            <span>Answer questions based on Carl Allen's mastermind call transcripts</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-2">•</span>
            <span>Provide insights on business acquisitions, due diligence, and financing</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-2">•</span>
            <span>Find information from external sources when needed (with clear attribution)</span>
          </li>
        </ul>
      </div>

      {showInputBar && user ? (
        <div className="w-full max-w-2xl">
          <UnifiedInputBar
            onSend={handleSend}
            loading={isLoading}
            disabled={!user}
            enableAudio={false}
            placeholder="Ask anything about business acquisitions..."
            className="w-full"
          />
        </div>
      ) : !user ? (
        <Button 
          size="lg" 
          className="px-6 py-6 text-lg hover-scale"
          onClick={() => window.location.href = '/auth'}
        >
          Sign In to Start <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      ) : (
        <Button 
          size="lg"
          className="px-6 py-6 text-lg hover-scale"
          onClick={onStartChat}
        >
          Start Chatting <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

export default WelcomeScreen;

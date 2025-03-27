
import React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export interface WelcomeScreenProps {
  onStartChat: () => void;
  onSelectQuestion?: (question: string) => void;
  className?: string;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onStartChat, 
  onSelectQuestion,
  className 
}) => {
  const { user } = useAuth();
  
  return (
    <div className={cn(
      "w-full max-w-3xl mx-auto px-6 py-16 sm:py-24 flex flex-col items-center justify-center animate-fade-in",
      className
    )}>
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-8">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="w-8 h-8 text-primary"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M12 7v.01" />
          <path d="M16 11v.01" />
          <path d="M8 11v.01" />
        </svg>
      </div>

      <h1 className="text-4xl font-medium text-center text-balance mb-6">
        Welcome to DWS AI
      </h1>
      
      <p className="text-xl text-muted-foreground text-center text-balance mb-10 max-w-2xl">
        I'm a specialized AI designed to provide insights from Carl Allen's mastermind call transcripts about business acquisitions, deal structuring, and more.
      </p>
      
      <div className="space-y-5 text-center max-w-2xl">
        <p className="text-balance">
          My primary knowledge source is Carl Allen's mastermind call transcripts. I'll prioritize information found in these transcripts when answering your questions.
        </p>
        
        <p className="text-balance">
          For questions not covered in the transcripts, I can search online for information, clearly indicating when I'm using non-transcript sources.
        </p>
      </div>
      
      <div className="mt-10">
        {user ? (
          <div className="space-y-4">
            <Button 
              className="px-8 py-6 text-lg hover-scale"
              onClick={onStartChat}
            >
              Start a Conversation
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center mb-4">
              Please sign in to start using DWS AI
            </p>
            <Button 
              className="px-8 py-6 text-lg hover-scale"
              onClick={() => window.location.href = '/auth'}
            >
              Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeScreen;

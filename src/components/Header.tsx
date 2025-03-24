
import React from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Home, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import ConversationHistory, { Conversation } from "@/components/ConversationHistory";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className }) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  // Sample conversation history - in a real app this would come from a database or localStorage
  const conversations: Conversation[] = [
    {
      id: "1",
      title: "Business Acquisition Basics",
      preview: "What are the key steps in acquiring a small business?",
      date: new Date(Date.now() - 86400000) // yesterday
    },
    {
      id: "2",
      title: "Financing Options",
      preview: "How can I finance a business purchase without using my own capital?",
      date: new Date(Date.now() - 172800000) // 2 days ago
    }
  ];
  
  const handleSelectConversation = (conversationId: string) => {
    console.log(`Selected conversation: ${conversationId}`);
    // In a real app, this would load the selected conversation
  };
  
  const goHome = () => {
    navigate('/');
  };
  
  return (
    <header className={cn(
      "w-full py-6 px-8 flex items-center justify-between sticky top-0 z-10",
      "glassmorphism border-b",
      "animate-fade-in",
      className
    )}>
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={goHome}
          aria-label="Home"
        >
          <Home className="h-5 w-5" />
        </Button>
        
        <ConversationHistory 
          conversations={conversations}
          onSelectConversation={handleSelectConversation}
        />
      </div>
      
      <div className="flex flex-col items-center">
        <h1 className="text-2xl font-medium tracking-tight text-primary">
          Carl Allen Expert Bot
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your guide to Carl Allen's business acquisition wisdom
        </p>
      </div>
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>
    </header>
  );
};

export default Header;

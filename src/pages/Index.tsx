import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ChatInterface from '@/components/ChatInterface';
import Header from '@/components/Header';
import WelcomeScreen from '@/components/WelcomeScreen';
import PopularQuestions from '@/components/PopularQuestions';
import ChatSidebar from '@/components/ChatSidebar';
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PanelLeft } from 'lucide-react';

// This is a small component that will only render when the sidebar is collapsed
const SidebarOpenButton = () => {
  const { state, toggleSidebar } = useSidebar();
  
  if (state !== "collapsed") return null;
  
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="absolute left-4 top-16 z-30 h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-accent"
      onClick={toggleSidebar}
      title="Open sidebar"
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Open sidebar</span>
    </Button>
  );
};

const Index = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const chatRef = useRef<{ submitQuestion: (question: string) => void }>(null);
  const location = useLocation();

  // Check if a conversation ID or initial question is provided in URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const conversationId = params.get('conversation');
    const question = params.get('q');

    if (conversationId || question) {
      setShowWelcome(false);
    }

    if (question && chatRef.current) {
      // Allow time for the chat interface to initialize
      setTimeout(() => {
        chatRef.current?.submitQuestion(question);
      }, 1000);
    }
  }, [location]);

  const handleAskQuestion = (question: string) => {
    setShowWelcome(false);
    
    // Small delay to ensure ChatInterface is mounted
    setTimeout(() => {
      chatRef.current?.submitQuestion(question);
    }, 100);
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <ChatSidebar />
        <SidebarOpenButton />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <Header />
            
            <div className="flex-1 overflow-y-auto">
              {showWelcome ? (
                <div className="container mx-auto px-4 py-8">
                  <WelcomeScreen 
                    onStartChat={() => setShowWelcome(false)} 
                    onSelectQuestion={handleAskQuestion}
                  />
                  <PopularQuestions onSelectQuestion={handleAskQuestion} />
                </div>
              ) : (
                <ChatInterface ref={chatRef} initialQuestion={null} />
              )}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;

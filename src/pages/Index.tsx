
import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ChatInterface from '@/components/ChatInterface';
import Header from '@/components/Header';
import WelcomeScreen from '@/components/WelcomeScreen';
import PopularQuestions from '@/components/PopularQuestions';
import ChatSidebar from '@/components/ChatSidebar';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

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
        <SidebarInset>
          <div className="flex flex-col h-full">
            <Header />
            
            <div className="flex-1 overflow-y-auto">
              {showWelcome ? (
                <div className="container mx-auto px-4 py-8">
                  <WelcomeScreen />
                  <PopularQuestions onAskQuestion={handleAskQuestion} />
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

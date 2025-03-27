
import React, { useState, useRef } from 'react';
import Header from '@/components/Header';
import WelcomeScreen from '@/components/WelcomeScreen';
import ChatInterface from '@/components/ChatInterface';

const Index = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [initialQuestion, setInitialQuestion] = useState<string | null>(null);
  const chatRef = useRef<{ submitQuestion: (question: string) => void } | null>(null);
  
  const handleStartChat = () => {
    setShowWelcome(false);
  };

  const handleSelectQuestion = (question: string) => {
    setInitialQuestion(question);
    setShowWelcome(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 flex flex-col">
        {showWelcome ? (
          <WelcomeScreen 
            onStartChat={handleStartChat} 
            onSelectQuestion={handleSelectQuestion} 
          />
        ) : (
          <ChatInterface 
            className="flex-1" 
            initialQuestion={initialQuestion}
            ref={chatRef}
          />
        )}
      </main>
    </div>
  );
};

export default Index;

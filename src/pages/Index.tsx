
import React, { useState } from 'react';
import Header from '@/components/Header';
import WelcomeScreen from '@/components/WelcomeScreen';
import ChatInterface from '@/components/ChatInterface';

const Index = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  
  const handleStartChat = () => {
    setShowWelcome(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 flex flex-col">
        {showWelcome ? (
          <WelcomeScreen onStartChat={handleStartChat} />
        ) : (
          <ChatInterface className="flex-1" />
        )}
      </main>
    </div>
  );
};

export default Index;

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import WelcomeScreen from '@/components/WelcomeScreen';
import PopularQuestions from '@/components/PopularQuestions';
import { SidebarInset } from "@/components/ui/sidebar";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/context/AuthContext';
import ChatContainer, { ContextChatContainer } from '@/components/chat/ChatContainer';
import { useChat } from '@/contexts/ChatContext';
import { useAudio } from '@/contexts/AudioContext';

const Index = () => {
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get chat functionality from context
  const {
    messages,
    isLoading,
    hasInteracted,
    enableOnlineSearch,
    conversationId,
    sendMessage,
    resetChat,
    toggleOnlineSearch,
    createNewConversation,
    handleFileUpload
  } = useChat();

  // Get audio functionality from context
  const {
    audioSrc,
    isPlaying,
    enabled: audioEnabled,
    toggleEnabled: toggleAudio,
    togglePlayback,
    stopAudio,
    clearAudio
  } = useAudio();

  // Handle URL parameters and initial state setup
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlConversationId = params.get('conversation');
    const question = params.get('q');

    console.log("URL params:", { urlConversationId, question });
    
    // Show welcome screen if no conversation or question
    if (!urlConversationId && !question) {
      setShowWelcome(!user);
    } else {
      setShowWelcome(false);
    }

    if (question && user) {
      // Wait a moment to allow the UI to render before sending the question
      const timer = setTimeout(() => {
        console.log("Handling question from URL param:", question);
        handleSendMessage(question);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [location.search, user]);

  // Handle asking a question from the popular questions component
  const handleAskQuestion = async (question: string) => {
    if (!user) {
      toast({ title: "Please sign in to start chatting", variant: "default" });
      return;
    }
    
    setShowWelcome(false);
    
    // Always create a new conversation when asking a question from popular questions
    console.log("Creating new conversation for popular question");
    const newConversationId = await createNewConversation(question);
    if (newConversationId) {
      // Update URL 
      navigate(`/?conversation=${newConversationId}`, { replace: true });
      
      // Send the message after a short delay to ensure proper setup
      setTimeout(() => {
        handleSendMessage(question);
      }, 300);
    }
  };

  // Handle sending a message to the chat
  const handleSendMessage = async (message: string, isVoiceInput: boolean = false) => {
    await sendMessage(message, isVoiceInput);
  };

  // Handle creating a new conversation
  const handleCreateNewConversation = async () => {
    if (!user) {
      toast({ title: "Please sign in to create a new chat"});
      navigate('/', { replace: true });
      return;
    }
    
    console.log("Creating new conversation from UI action");
    const newConversationId = await createNewConversation('New Conversation');
    if (newConversationId) {
      console.log("Setting new conversation ID:", newConversationId);
      navigate(`/?conversation=${newConversationId}`, { replace: true });
      setShowWelcome(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {showWelcome ? (
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-8 max-w-3xl">
            <WelcomeScreen 
              onStartChat={handleCreateNewConversation} 
              onSelectQuestion={handleAskQuestion} 
            />
            <PopularQuestions onSelectQuestion={handleAskQuestion} className="mt-8" />
          </div>
        </div>
      ) : (
        <ContextChatContainer />
      )}
    </div>
  );
};

export default Index;
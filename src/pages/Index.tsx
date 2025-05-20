import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import WelcomeScreen from '@/components/WelcomeScreen';
import PopularQuestions from '@/components/PopularQuestions';
import { SidebarInset } from "@/components/ui/sidebar";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/context/AuthContext';
import ChatContainer, { ContextChatContainer } from '@/components/chat/ChatContainer';
import { useChat } from '@/contexts/ChatContext';
import { useAudio } from '@/contexts/AudioContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, InfoIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const { user, isAuthenticated } = useAuth();
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeTransitioning, setWelcomeTransitioning] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const welcomeScreenRef = useRef<HTMLDivElement>(null);

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
    
    // Show welcome screen if no conversation or question
    if (!urlConversationId && !question) {
      setShowWelcome(!conversationId || !hasInteracted);
    } else {
      setWelcomeTransitioning(true);
      // Use a timer to create a smooth transition
      setTimeout(() => {
        setShowWelcome(false);
        setWelcomeTransitioning(false);
      }, 300);
    }

    if (question && isAuthenticated) {
      // Wait a moment to allow the UI to render before sending the question
      const timer = setTimeout(() => {
        handleSendMessage(question);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [location.search, isAuthenticated, conversationId, hasInteracted]);

  // Scroll to the top when showing welcome screen
  useEffect(() => {
    if (showWelcome && welcomeScreenRef.current) {
      welcomeScreenRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showWelcome]);

  // Handle asking a question from the popular questions component
  const handleAskQuestion = async (question: string) => {
    if (!isAuthenticated) {
      toast({ 
        title: "Authentication Required", 
        description: "Please sign in to start chatting",
        variant: "default" 
      });
      return;
    }
    
    setWelcomeTransitioning(true);
    
    // Create a new conversation when asking a question from popular questions
    const newConversationId = await createNewConversation(question);
    if (newConversationId) {
      // Update URL 
      navigate(`/?conversation=${newConversationId}`, { replace: true });
      
      // Use a timer for smooth transition
      setTimeout(() => {
        setShowWelcome(false);
        setWelcomeTransitioning(false);
        
        // Send the message after a short delay to ensure proper setup
        setTimeout(() => {
          handleSendMessage(question);
        }, 300);
      }, 300);
    }
  };

  // Handle sending a message to the chat
  const handleSendMessage = async (message: string, isVoiceInput: boolean = false) => {
    await sendMessage(message, isVoiceInput);
  };

  // Handle creating a new conversation
  const handleCreateNewConversation = async () => {
    if (!isAuthenticated) {
      toast({ 
        title: "Authentication Required", 
        description: "Please sign in to create a new chat",
      });
      navigate('/auth', { replace: true });
      return;
    }
    
    const newConversationId = await createNewConversation('New Conversation');
    if (newConversationId) {
      navigate(`/?conversation=${newConversationId}`, { replace: true });
      
      setWelcomeTransitioning(true);
      setTimeout(() => {
        setShowWelcome(false);
        setWelcomeTransitioning(false);
      }, 300);
    }
  };
  
  // Handle returning to welcome screen
  const handleReturnToWelcome = () => {
    navigate('/', { replace: true });
    setShowWelcome(true);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <AnimatePresence mode="wait">
        {showWelcome ? (
          <motion.div 
            key="welcome"
            ref={welcomeScreenRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={`flex-1 overflow-y-auto ${welcomeTransitioning ? 'pointer-events-none' : ''}`}
          >
            <div className={`container mx-auto px-4 py-8 ${isMobile ? 'w-full' : 'max-w-4xl'}`}>
              <WelcomeScreen 
                onStartChat={handleCreateNewConversation} 
                onSelectQuestion={handleAskQuestion} 
              />
              <PopularQuestions 
                onSelectQuestion={handleAskQuestion} 
                className="mt-8" 
                limit={isMobile ? 3 : 5}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 relative h-full"
          >
            {/* Floating action buttons */}
            <div className="absolute top-4 right-4 z-20 flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm"
                      onClick={handleReturnToWelcome}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Back to welcome</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm"
                      onClick={handleCreateNewConversation}
                    >
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">New conversation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <ContextChatContainer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
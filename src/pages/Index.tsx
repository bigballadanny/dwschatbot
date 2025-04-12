import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import WelcomeScreen from '@/components/WelcomeScreen';
import { SidebarInset } from "@/components/ui/sidebar";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/context/AuthContext';
import ChatContainer from '@/components/chat/ChatContainer';
import { useChat } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import { Conversation } from '@/components/ConversationHistory';

const Index = () => {
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    messages,
    isLoading,
    audioSrc,
    isAudioEnabled,
    isPlaying,
    enableOnlineSearch,
    hasInteracted,
    sendMessage,
    createNewConversation,
    resetChat,
    toggleOnlineSearch,
    toggleAudio,
    togglePlayback,
    stopAudio,
    handleFileUpload
  } = useChat({
    user,
    conversationId,
    audioEnabled
  });

  useEffect(() => {
    const loadUserConversations = async () => {
      if (!user) {
        setConversations([]);
        return;
      }

      try {
        console.log(`Loading conversations for user: ${user.id}`);
        const { data: conversationsData, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        if (conversationsData) {
          console.log(`Found ${conversationsData.length} conversations for user ${user.id}`);
          const formattedConversations: Conversation[] = conversationsData.map(conv => ({
            id: conv.id,
            title: conv.title || 'Untitled Conversation',
            preview: conv.title || 'Click to view this conversation',
            date: new Date(conv.updated_at)
          }));

          setConversations(formattedConversations);
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
        toast({ 
          title: "Failed to load conversations",
          variant: "destructive"
        });
      }
    };

    loadUserConversations();
  }, [user, conversationId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlConversationId = params.get('conversation');
    const question = params.get('q');

    console.log(`URL parameters: conversation=${urlConversationId}, q=${question}`);
    
    const shouldShowWelcome = !user || (!urlConversationId && !question);
    setShowWelcome(shouldShowWelcome);

    if (urlConversationId) {
      console.log(`Setting conversation ID from URL: ${urlConversationId}`);
      setConversationId(urlConversationId);
      setShowWelcome(false);
    } else {
      setConversationId(null);
    }

    if (question && user) {
      const timer = setTimeout(() => {
        handleSendMessage(question, false);
        setShowWelcome(false);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [location.search, user]);

  useEffect(() => {
    setAudioEnabled(isAudioEnabled);
  }, [isAudioEnabled]);

  const handleAskQuestion = async (question: string) => {
    if (!user) {
      toast({ title: "Please sign in to start chatting", variant: "default" });
      return;
    }
    
    setShowWelcome(false);
    
    const newConversationId = await createNewConversation();
    if (newConversationId) {
      setConversationId(newConversationId);
      navigate(`/?conversation=${newConversationId}`, { replace: true });
      
      setTimeout(() => {
        handleSendMessage(question, false);
      }, 300);
    }
  };

  const handleSendMessage = async (message: string, isVoiceInput: boolean = false) => {
    await sendMessage(message, isVoiceInput);
  };

  const handleCreateNewConversation = async () => {
    if (!user) {
      toast({ title: "Please sign in to create a new chat"});
      navigate('/', { replace: true });
      return;
    }
    
    await createNewConversation();
    setShowWelcome(false);
  };

  const handleSelectConversation = (selectedConversationId: string) => {
    console.log("Selected conversation:", selectedConversationId);
    navigate(`/?conversation=${selectedConversationId}`, { replace: true });
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
          </div>
        </div>
      ) : (
        <ChatContainer
          messages={messages}
          isLoading={isLoading}
          audioEnabled={isAudioEnabled}
          currentAudioSrc={audioSrc}
          isPlaying={isPlaying}
          enableOnlineSearch={enableOnlineSearch}
          conversationId={conversationId}
          user={user}
          onSendMessage={handleSendMessage}
          onToggleAudio={toggleAudio}
          onToggleOnlineSearch={toggleOnlineSearch}
          onFileUpload={handleFileUpload}
          onAudioStop={stopAudio}
          onTogglePlayback={togglePlayback}
        />
      )}
    </div>
  );
};

export default Index;

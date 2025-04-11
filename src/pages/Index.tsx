
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import WelcomeScreen from '@/components/WelcomeScreen';
import PopularQuestions from '@/components/PopularQuestions';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/context/AuthContext';
import SidebarOpenButton from '@/components/sidebar/SidebarOpenButton';
import ChatContainer from '@/components/chat/ChatContainer';
import ChatSidebar from '@/components/ChatSidebar';
import { useChatController } from '@/hooks/useChatController';

const Index = () => {
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    messages,
    isLoading,
    audioSrc,
    isAudioEnabled,
    enableOnlineSearch,
    hasInteracted,
    sendMessage,
    createNewConversation,
    resetChat,
    toggleOnlineSearch,
    toggleAudio,
    stopAudio
  } = useChatController({
    user,
    conversationId,
    audioEnabled
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlConversationId = params.get('conversation');
    const question = params.get('q');

    const shouldShowWelcome = !user || (!urlConversationId && !question);
    setShowWelcome(shouldShowWelcome);

    if (urlConversationId) {
      setConversationId(urlConversationId);
    }

    if (question && user) {
      setTimeout(() => {
        handleSendMessage(question, false);
      }, 800);
    }
  }, [location.search, user]);

  useEffect(() => {
    setAudioEnabled(isAudioEnabled);
  }, [isAudioEnabled]);

  const handleAskQuestion = (question: string) => {
    if (!user) {
      toast({ title: "Please sign in to start chatting", variant: "default" });
      return;
    }
    setShowWelcome(false);
    handleSendMessage(question, false);
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
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;
    toast({ 
      title: "File Upload Note", 
      description: `File "${files[0].name}" selected. Analysis feature not implemented.` 
    });
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <ChatSidebar
          currentConversationId={conversationId || undefined}
          onSelectConversation={(id) => {
            if (id !== conversationId) {
              navigate(id ? `/?conversation=${id}` : '/', { replace: true });
            }
          }}
          onCreateNew={handleCreateNewConversation}
        />
        <SidebarOpenButton />
        <SidebarInset>
          <div className="flex flex-col h-full bg-muted/30">
            <Header />

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
              <ChatContainer
                messages={messages}
                isLoading={isLoading}
                audioEnabled={audioEnabled}
                currentAudioSrc={audioSrc}
                enableOnlineSearch={enableOnlineSearch}
                conversationId={conversationId}
                user={user}
                onSendMessage={handleSendMessage}
                onToggleAudio={toggleAudio}
                onToggleOnlineSearch={toggleOnlineSearch}
                onFileUpload={handleFileUpload}
                onAudioStop={stopAudio}
              />
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;

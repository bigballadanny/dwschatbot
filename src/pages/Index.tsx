
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ChatInterface from '@/components/ChatInterface';
import Header from '@/components/Header';
import WelcomeScreen from '@/components/WelcomeScreen';
import PopularQuestions from '@/components/PopularQuestions';
import ChatSidebar from '@/components/ChatSidebar';
import VoiceConversation, { VoiceConversationRefMethods } from '@/components/VoiceConversation';
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PanelLeft, MessageSquare, Mic, Volume2, VolumeX } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { MessageProps } from '@/components/MessageItem';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/context/AuthContext';

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
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [messages, setMessages] = useState<MessageProps[]>([{
    content: "Hello! I'm Carl Allen's Expert Bot. I'm here to answer your questions about business acquisitions, deal structuring, negotiations, due diligence, and more based on Carl Allen's mastermind call transcripts. What would you like to know?",
    source: 'system',
    timestamp: new Date(),
  }]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [enableOnlineSearch, setEnableOnlineSearch] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const chatRef = useRef<{ submitQuestion: (question: string) => void }>(null);
  const voiceRef = useRef<VoiceConversationRefMethods>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if a conversation ID or initial question is provided in URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlConversationId = params.get('conversation');
    const question = params.get('q');

    // Auto-hide welcome screen if authenticated
    if (user) {
      setShowWelcome(false);
    }

    if (urlConversationId || question) {
      setShowWelcome(false);
    }

    if (urlConversationId) {
      setConversationId(urlConversationId);
      loadConversationMessages(urlConversationId);
    } else if (!conversationId && user) {
      createNewConversation();
    }

    if (question) {
      // Allow time for the conversation to initialize
      setTimeout(() => {
        handleSendMessage(question);
        setHasInteracted(true);
      }, 1000);
    }
  }, [location, user]);

  const loadConversationMessages = async (id: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const formattedMessages = data.map((message): MessageProps => ({
          content: message.content,
          source: message.is_user ? 'user' : 'transcript',
          timestamp: new Date(message.created_at),
        }));
        
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast({
        title: "Error Loading Conversation",
        description: "There was a problem loading the conversation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const createNewConversation = async () => {
    // Only create a new conversation if user is authenticated
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert([
          { 
            title: 'New Conversation',
            user_id: user.id
          }
        ])
        .select();
          
      if (error) throw error;
        
      if (data && data.length > 0) {
        setConversationId(data[0].id);
          
        await supabase
          .from('messages')
          .insert([
            {
              conversation_id: data[0].id,
              content: messages[0].content,
              is_user: false
            }
          ]);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error Creating Conversation",
        description: "There was a problem creating a new conversation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAskQuestion = (question: string) => {
    setShowWelcome(false);
    handleSendMessage(question);
    setHasInteracted(true);
  };

  const handleSendMessage = async (message: string): Promise<void> => {
    if (!message.trim() || isLoading) return Promise.resolve();
    
    // If user is not authenticated, prompt them to sign in
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to send messages and save your conversation history.",
        variant: "default",
      });
      return Promise.resolve();
    }
    
    // Create a conversation if one doesn't exist
    if (!conversationId) {
      await createNewConversation();
      // If we still don't have a conversation ID, something went wrong
      if (!conversationId) {
        toast({
          title: "Error",
          description: "Unable to create a conversation. Please try again.",
          variant: "destructive",
        });
        return Promise.resolve();
      }
    }
    
    const userMessage: MessageProps = {
      content: message,
      source: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversationId,
            content: userMessage.content,
            is_user: true
          }
        ]);
      
      const loadingMessage: MessageProps = {
        content: enableOnlineSearch 
          ? "Searching through Carl Allen's transcripts and online resources..." 
          : "Searching through Carl Allen's transcripts...",
        source: 'system',
        timestamp: new Date(),
        isLoading: true
      };
      
      setMessages(prev => [...prev, loadingMessage]);
      
      // Call the voice-conversation function for processing
      const { data, error } = await supabase.functions.invoke('voice-conversation', {
        body: { 
          audio: message,
          messages: messages.concat(userMessage),
          isVoiceInput: false
        }
      });
      
      if (error) throw error;
      
      setMessages(prev => prev.filter(msg => !msg.isLoading));
      
      const responseMessage: MessageProps = {
        content: data.content,
        source: 'gemini',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, responseMessage]);
      
      await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversationId,
            content: responseMessage.content,
            is_user: false
          }
        ]);
      
      if (internalAudioEnabled && data.audioContent) {
        const audioSrc = `data:audio/mp3;base64,${data.audioContent}`;
        const audio = new Audio(audioSrc);
        audio.play().catch(err => {
          console.error('Error playing audio:', err);
        });
      }
      
      // Update conversation title with first message if it's a new conversation
      if (!hasInteracted && message.trim()) {
        await supabase
          .from('conversations')
          .update({ title: message.substring(0, 50) })
          .eq('id', conversationId);
          
        setHasInteracted(true);
      }
    } catch (error) {
      console.error('Error generating response:', error);
      
      setMessages(prev => [
        ...prev.filter(msg => !msg.isLoading), 
        {
          content: "I'm sorry, there was an error processing your request. Please try again.",
          source: 'system',
          timestamp: new Date()
        }
      ]);
      
      toast({
        title: "Error",
        description: "There was a problem processing your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
    
    return Promise.resolve();
  };

  const toggleVoiceMode = () => {
    setVoiceEnabled(!voiceEnabled);
  };

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
  };

  // For using the internalAudioEnabled state within handleSendMessage
  const internalAudioEnabled = audioEnabled;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <ChatSidebar />
        <SidebarOpenButton />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <Header />
            
            {showWelcome ? (
              <div className="flex-1 overflow-y-auto">
                <div className="container mx-auto px-4 py-8">
                  <WelcomeScreen 
                    onStartChat={() => setShowWelcome(false)} 
                    onSelectQuestion={handleAskQuestion}
                  />
                  <PopularQuestions 
                    onSelectQuestion={handleAskQuestion} 
                    className="mt-8" 
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-4 py-2 flex justify-between items-center border-b">
                  <div className="flex items-center">
                    <Button
                      variant={voiceEnabled ? "default" : "outline"}
                      size="sm"
                      className="mr-2"
                      onClick={toggleVoiceMode}
                      title={voiceEnabled ? "Switch to text only" : "Enable voice input"}
                    >
                      {voiceEnabled ? <Mic className="h-4 w-4 mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                      {voiceEnabled ? "Voice Mode" : "Text Mode"}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={toggleAudio}
                      title={audioEnabled ? "Mute audio" : "Enable audio"}
                    >
                      {audioEnabled ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
                      {audioEnabled ? "Sound On" : "Sound Off"}
                    </Button>
                  </div>
                </div>
                
                <div className="h-[calc(100vh-8.5rem)] flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    {voiceEnabled ? (
                      <VoiceConversation 
                        ref={voiceRef}
                        className="h-full" 
                        audioEnabled={audioEnabled}
                        messages={messages}
                        onSendMessage={handleSendMessage}
                        conversationId={conversationId}
                      />
                    ) : (
                      <ChatInterface 
                        ref={chatRef} 
                        initialQuestion={null} 
                        className="h-full"
                        messages={messages}
                        onSendMessage={handleSendMessage}
                        conversationId={conversationId}
                      />
                    )}
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;

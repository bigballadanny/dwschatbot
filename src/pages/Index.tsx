
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import WelcomeScreen from '@/components/WelcomeScreen';
import PopularQuestions from '@/components/PopularQuestions';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/context/AuthContext';
import SidebarOpenButton from '@/components/sidebar/SidebarOpenButton';
import ChatContainer from '@/components/chat/ChatContainer';
import { MessageData } from '@/components/message/MessageList';
import ChatSidebar from '@/components/ChatSidebar';

interface MessageMetadata {
  source?: string;
  citation?: string;
}

interface SupabaseMessage {
  content: string;
  conversation_id: string;
  created_at: string;
  id: string;
  is_user: boolean;
  metadata?: MessageMetadata;
  user_id?: string;
}

const Index = () => {
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [messages, setMessages] = useState<MessageData[]>([{
    content: "Hello! I'm Carl Allen's Expert Bot. Ask me anything about M&A based on Carl's teachings.",
    source: 'system',
    timestamp: new Date(),
  }]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [enableOnlineSearch, setEnableOnlineSearch] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [currentAudioSrc, setCurrentAudioSrc] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlConversationId = params.get('conversation');
    const question = params.get('q');

    const shouldShowWelcome = !user || (!urlConversationId && !question);
    setShowWelcome(shouldShowWelcome);

    if (urlConversationId) {
      setConversationId(urlConversationId);
      loadConversationMessages(urlConversationId);
    } else if (!user && !question) {
       setMessages([{
           content: "Hello! I'm Carl Allen's Expert Bot. Ask me anything...",
           source: 'system', 
           timestamp: new Date(),
       }]);
       setConversationId(null);
       setHasInteracted(false);
       setShowWelcome(true);
    }

    if (question && user) {
      setTimeout(() => {
        handleSendMessage(question, false);
      }, 800);
    }
    setCurrentAudioSrc(null);
  }, [location.search, user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('conversation-changes')
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'conversations', filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.old?.id === conversationId) {
          navigate('/', { replace: true });
          setConversationId(null);
          setMessages([{
            content: "Hello! I'm Carl Allen's Expert Bot...",
            source: 'system', 
            timestamp: new Date(),
          }]);
          setHasInteracted(false);
          setShowWelcome(true);
          setCurrentAudioSrc(null);
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, conversationId, navigate]);

  const loadConversationMessages = async (id: string) => {
    if (!user) {
        navigate('/'); return;
    }
    setIsLoading(true);
    setCurrentAudioSrc(null);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) {
        const formattedMessages = data.map((msg: SupabaseMessage): MessageData => ({
          content: msg.content,
          source: msg.is_user ? 'user' : ((msg.metadata?.source as 'user' | 'system' | 'gemini') || 'gemini'),
          timestamp: new Date(msg.created_at),
          citation: msg.metadata?.citation ? [msg.metadata.citation] : undefined
        }));
        setMessages(formattedMessages);
        setHasInteracted(true);
        setShowWelcome(false);
      } else {
        const { data: convoData } = await supabase.from('conversations').select('id').eq('id', id).eq('user_id', user.id).maybeSingle();
        if (convoData) {
            setMessages([{
                content: "Ask me anything...", 
                source: 'system', 
                timestamp: new Date(),
            }]);
            setHasInteracted(false);
            setShowWelcome(false);
        } else {
            navigate('/');
            toast({ title: "Conversation not found", variant: "destructive" });
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast({ title: "Error Loading Conversation", variant: "destructive" });
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewConversation = async () => {
    if (!user) return null;
    setIsLoading(true);
    setCurrentAudioSrc(null);
    try {
      const { data, error } = await supabase.from('conversations').insert([{ user_id: user.id, title: 'New Chat' }]).select().single();
      if (error) throw error;
      if (data) {
        setConversationId(data.id);
        const initialMsg = { 
          content: "Hello! Ask me anything about M&A.", 
          source: 'system' as 'system', 
          timestamp: new Date() 
        };
        setMessages([initialMsg]);
        await supabase.from('messages').insert([{ 
          conversation_id: data.id, 
          user_id: user.id, 
          content: initialMsg.content, 
          is_user: false, 
          metadata: { source: 'system' } 
        }]);
        setHasInteracted(false);
        setShowWelcome(false);
        navigate(`/?conversation=${data.id}`, { replace: true });
        return data.id;
      } else {
        throw new Error("Conversation creation returned no data.");
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({ title: "Error Creating Conversation", variant: "destructive" });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskQuestion = (question: string) => {
      if (!user) {
          toast({ title: "Please sign in to start chatting", variant: "default" });
          return;
      }
    setShowWelcome(false);
    handleSendMessage(question, false);
  };

  const handleSendMessage = async (message: string, isVoiceInput: boolean = false): Promise<void> => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading) return;
    if (!user) {
      toast({ title: "Authentication Required", description: "Please sign in.", variant: "default" });
      return;
    }

    let currentConvId = conversationId;
    let isFirstUserInteraction = !hasInteracted;

    setCurrentAudioSrc(null);

    if (!currentConvId) {
      currentConvId = await createNewConversation();
      if (!currentConvId) return;
      isFirstUserInteraction = true;
    }

    const userMessage: MessageData = { 
      content: trimmedMessage, 
      source: 'user', 
      timestamp: new Date() 
    };
    
    // Fix the recursive type issue by separating message arrays
    const currentMessages = [...messages];
    setMessages([
      ...currentMessages,
      userMessage,
      { content: '', source: 'system', isLoading: true, timestamp: new Date() }
    ]);
    
    setIsLoading(true);

    try {
      // Extract only the necessary info from messages to avoid deep type issues
      const messageHistory = currentMessages
        .filter(msg => !msg.isLoading)
        .map(msg => ({ content: msg.content, source: msg.source }));
      
      messageHistory.push({ content: trimmedMessage, source: 'user' });

      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: {
          query: trimmedMessage,
          messages: messageHistory,
          isVoiceInput: false,
          enableOnlineSearch: enableOnlineSearch,
          conversationId: currentConvId
        }
      });

      if (error || !data?.content) {
        throw new Error(error?.message || data?.error || 'Function returned empty response');
      }

      const responseMessage: MessageData = {
        content: data.content,
        source: (data.source || 'gemini') as 'gemini' | 'system' | 'user',
        timestamp: new Date(),
        citation: data.citation
      };

      setMessages(prev => [...prev.filter(msg => !msg.isLoading), responseMessage]);

      await supabase.from('messages').insert([
        { conversation_id: currentConvId, user_id: user.id, content: trimmedMessage, is_user: true },
        {
          conversation_id: currentConvId, user_id: user.id,
          content: responseMessage.content, is_user: false,
          metadata: { source: responseMessage.source, citation: responseMessage.citation }
        }
      ]);

      if (audioEnabled && data.audioContent) {
        setCurrentAudioSrc(`data:audio/mp3;base64,${data.audioContent}`);
      } else {
        setCurrentAudioSrc(null);
      }

      if (isFirstUserInteraction) {
        await supabase.from('conversations').update({ title: trimmedMessage.substring(0, 40) }).eq('id', currentConvId);
        setHasInteracted(true);
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setMessages(prev => [
        ...prev.filter(msg => !msg.isLoading),
        { 
          content: `Error: ${error instanceof Error ? error.message : 'Request failed.'}`, 
          source: 'system', 
          timestamp: new Date() 
        }
      ]);
      toast({ 
        title: "Error Processing Message", 
        description: error instanceof Error ? error.message : "Please try again.", 
        variant: "destructive" 
      });
      setCurrentAudioSrc(null);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAudio = () => {
    const willBeEnabled = !audioEnabled;
    setAudioEnabled(willBeEnabled);
    if (!willBeEnabled) {
      setCurrentAudioSrc(null);
    }
    toast({
      title: willBeEnabled ? "Audio Enabled" : "Audio Disabled",
      description: willBeEnabled ? "Voice responses will play." : "Voice responses muted.",
    });
  };

  const handleAudioPlayerStop = () => {
    setCurrentAudioSrc(null);
  };

  const handleToggleOnlineSearch = (enabled: boolean) => {
    setEnableOnlineSearch(enabled);
    toast({ title: enabled ? "Online Search Enabled" : "Online Search Disabled" });
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;
    toast({ title: "File Upload Note", description: `File "${files[0].name}" selected. Analysis feature not implemented.` });
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <ChatSidebar
          currentConversationId={conversationId || undefined}
          onSelectConversation={(id) => {
            setCurrentAudioSrc(null);
            if (id !== conversationId) {
              navigate(id ? `/?conversation=${id}` : '/ ', { replace: true });
            }
          }}
          onCreateNew={() => {
            setCurrentAudioSrc(null);
            if (user) {
              createNewConversation();
            } else {
              navigate('/', { replace: true });
              toast({ title: "Please sign in to create a new chat"});
            }
          }}
        />
        <SidebarOpenButton />
        <SidebarInset>
          <div className="flex flex-col h-full bg-muted/30">
            <Header />

            {showWelcome ? (
              <div className="flex-1 overflow-y-auto">
                <div className="container mx-auto px-4 py-8 max-w-3xl">
                  <WelcomeScreen 
                    onStartChat={() => { 
                      if(user) { 
                        createNewConversation(); 
                      } else { 
                        toast({title: 'Please sign in first'}); 
                      } 
                    }} 
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
                currentAudioSrc={currentAudioSrc}
                enableOnlineSearch={enableOnlineSearch}
                conversationId={conversationId}
                user={user}
                onSendMessage={handleSendMessage}
                onToggleAudio={toggleAudio}
                onToggleOnlineSearch={handleToggleOnlineSearch}
                onFileUpload={handleFileUpload}
                onAudioStop={handleAudioPlayerStop}
              />
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;

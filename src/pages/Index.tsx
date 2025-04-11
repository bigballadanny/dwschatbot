import React, { useRef, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MessageItem, { MessageProps, MessageSource } from '@/components/MessageItem';
import Header from '@/components/Header';
import WelcomeScreen from '@/components/WelcomeScreen';
import PopularQuestions from '@/components/PopularQuestions';
import ChatSidebar from '@/components/ChatSidebar';
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PanelLeft } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/context/AuthContext';
import SearchModeToggle from '@/components/SearchModeToggle';
import UnifiedInputBar from '@/components/UnifiedInputBar';
import AudioPlayer from '@/components/AudioPlayer';
import { cn } from "@/lib/utils";

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
  const [audioEnabled, setAudioEnabled] = useState(false); // Default audio off
  const [messages, setMessages] = useState<MessageProps[]>([{
    content: "Hello! I'm Carl Allen's Expert Bot. Ask me anything about M&A based on Carl's teachings.", // Simplified
    source: 'system' as MessageSource,
    timestamp: new Date(),
  }]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [enableOnlineSearch, setEnableOnlineSearch] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentAudioSrc, setCurrentAudioSrc] = useState<string | null>(null); // State for the player source

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { state: sidebarState } = useSidebar();

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
           source: 'system' as MessageSource, 
           timestamp: new Date(),
       }]);
       setConversationId(null);
       setHasInteracted(false);
       setShowWelcome(true); // Show welcome if logged out and no convo
    }

    if (question && user) {
      setTimeout(() => {
        handleSendMessage(question, false);
      }, 800);
    }
    setCurrentAudioSrc(null); // Clear audio player when location changes

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
            source: 'system' as MessageSource, 
            timestamp: new Date(),
          }]);
          setHasInteracted(false);
          setShowWelcome(true);
          setCurrentAudioSrc(null);
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, conversationId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        const formattedMessages = data.map((msg: SupabaseMessage): MessageProps => ({
          content: msg.content,
          source: msg.is_user ? 'user' : ((msg.metadata?.source as MessageSource) || 'gemini'),
          timestamp: new Date(msg.created_at),
          citation: msg.metadata?.citation
        }));
        setMessages(formattedMessages);
        setHasInteracted(true);
        setShowWelcome(false);
      } else {
        const { data: convoData } = await supabase.from('conversations').select('id').eq('id', id).eq('user_id', user.id).maybeSingle();
        if (convoData) {
            setMessages([{
                content: "Ask me anything...", 
                source: 'system' as MessageSource, 
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
          source: 'system' as MessageSource, 
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

    setCurrentAudioSrc(null); // Clear previous audio player

    if (!currentConvId) {
      currentConvId = await createNewConversation();
      if (!currentConvId) return;
      isFirstUserInteraction = true;
    }

    const userMessage: MessageProps = { 
      content: trimmedMessage, 
      source: 'user' as MessageSource, 
      timestamp: new Date() 
    };
    setMessages(prev => [...prev, userMessage, { 
      content: '', 
      source: 'system' as MessageSource, 
      isLoading: true, 
      timestamp: new Date() 
    }]);
    setIsLoading(true);

    try {
      const messageHistory = messages
        .filter(msg => !msg.isLoading)
        .map(msg => ({ content: msg.content, source: msg.source }))
        .slice(-10);
      messageHistory.push({ content: trimmedMessage, source: 'user' as MessageSource });

      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: {
          query: trimmedMessage,
          messages: messageHistory,
          isVoiceInput: false, // Keep false, voice input handled separately if needed
          enableOnlineSearch: enableOnlineSearch,
          conversationId: currentConvId
        }
      });

      if (error || !data?.content) {
        throw new Error(error?.message || data?.error || 'Function returned empty response');
      }

      const responseMessage: MessageProps = {
        content: data.content,
        source: (data.source || 'gemini') as MessageSource,
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
        { content: `Error: ${error instanceof Error ? error.message : 'Request failed.'}`, source: 'system' as MessageSource, timestamp: new Date() }
      ]);
      toast({ title: "Error Processing Message", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
      setCurrentAudioSrc(null);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAudio = () => {
    const willBeEnabled = !audioEnabled;
    setAudioEnabled(willBeEnabled);
    if (!willBeEnabled) {
      setCurrentAudioSrc(null); // Hide player if disabling globally
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
           currentConversationId={conversationId}
           onSelectConversation={(id) => {
             setCurrentAudioSrc(null);
             if (id !== conversationId) {
               navigate(id ? `/?conversation=${id}` : '/ ', { replace: true });
               // Let useEffect handle state updates based on navigation
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
                  <WelcomeScreen onStartChat={() => { if(user) { createNewConversation(); } else { toast({title: 'Please sign in first'}); } }} onSelectQuestion={handleAskQuestion} />
                  <PopularQuestions onSelectQuestion={handleAskQuestion} className="mt-8" />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col relative">
                 <ScrollArea className="flex-1 px-4 py-6 pb-40"> {/* Increased padding-bottom for player space */}
                   <div className="mx-auto max-w-3xl space-y-4">
                     {messages.map((message, index) => (
                       <MessageItem
                         key={`${conversationId || 'new'}-${index}`}
                         content={message.content}
                         source={message.source}
                         citation={message.citation}
                         timestamp={message.timestamp}
                         isLoading={message.isLoading}
                       />
                     ))}
                     <div ref={messagesEndRef} />
                   </div>
                 </ScrollArea>

                 <div className={cn(
                   "absolute bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-sm z-10",
                 )}>
                   <div className="max-w-3xl mx-auto px-4 pt-3 pb-4 space-y-3">
                        {currentAudioSrc && (
                            <AudioPlayer
                                audioSrc={currentAudioSrc}
                                onStop={handleAudioPlayerStop} // Function to call when player stops itself
                                className="mb-2"
                            />
                        )}

                       <div className="flex items-center gap-3 justify-between">
                         <UnifiedInputBar
                           onSend={handleSendMessage}
                           onFileUpload={handleFileUpload}
                           loading={isLoading}
                           disabled={isLoading || (!user && !conversationId)} // More accurate disabled state
                           enableAudio={audioEnabled} // Pass state to show correct icon
                           onToggleAudio={toggleAudio} // Pass toggle handler
                           placeholder={user ? "Ask anything..." : "Please sign in to chat"}
                           className="flex-1"
                           showVoiceFeatures={true} // Show mic/audio buttons
                         />
                         <SearchModeToggle
                           enableOnlineSearch={enableOnlineSearch}
                           onToggle={handleToggleOnlineSearch}
                           className="text-xs"
                           disabled={!user || !conversationId}
                         />
                       </div>
                   </div>
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

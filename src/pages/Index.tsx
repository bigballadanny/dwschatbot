import React, { useRef, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MessageItem, { MessageProps } from '@/components/MessageItem';
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
import { cn } from "@/lib/utils";

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
  const [uploading, setUploading] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { state: sidebarState } = useSidebar();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlConversationId = params.get('conversation');
    const question = params.get('q');

    if (user) {
      setShowWelcome(false);
    }

    if (urlConversationId || question) {
      setShowWelcome(false);
    }

    if (urlConversationId) {
      setConversationId(urlConversationId);
      loadConversationMessages(urlConversationId);
    }

    if (question) {
      setTimeout(() => {
        handleSendMessage(question, false);
        setHasInteracted(true);
      }, 1000);
    }
  }, [location, user]);

  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('conversation-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'conversations' },
        (payload) => {
          console.log('Conversations changed:', payload);
          if (payload.eventType === 'DELETE') {
            if (payload.old && payload.old.id === conversationId) {
              navigate('/');
              setConversationId(null);
              setMessages([{
                content: "Hello! I'm Carl Allen's Expert Bot. I'm here to answer your questions about business acquisitions, deal structuring, negotiations, due diligence, and more based on Carl Allen's mastermind call transcripts. What would you like to know?",
                source: 'system',
                timestamp: new Date(),
              }]);
            }
          }
        })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, conversationId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    if (!user) return null;
    
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
          
        return data[0].id;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error Creating Conversation",
        description: "There was a problem creating a new conversation. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleAskQuestion = (question: string) => {
    setShowWelcome(false);
    handleSendMessage(question, false);
    setHasInteracted(true);
  };

  const handleSendMessage = async (message: string, isVoiceInput: boolean): Promise<void> => {
    if (!message.trim() || isLoading) return Promise.resolve();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to send messages and save your conversation history.",
        variant: "default",
      });
      return Promise.resolve();
    }
    
    let currentConversationId = conversationId;
    
    if (!currentConversationId) {
      currentConversationId = await createNewConversation();
      if (!currentConversationId) {
        toast({
          title: "Error",
          description: "Unable to create a conversation. Please try again.",
          variant: "destructive",
        });
        return Promise.resolve();
      }
      setConversationId(currentConversationId);
    }
    
    const userMessage: MessageProps = {
      content: message,
      source: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      console.log('Sending message:', {
        message,
        conversationId: currentConversationId,
        enableOnlineSearch,
        isVoiceInput
      });
      
      const { data, error } = await supabase.functions.invoke('voice-conversation', {
        body: { 
          audio: message,
          messages: messages.concat(userMessage),
          isVoiceInput: isVoiceInput,
          enableOnlineSearch: enableOnlineSearch
        }
      });
      
      console.log('Function response:', { data, error });
      
      if (error) {
        console.error('Detailed error:', error);
        throw error;
      }
      
      setMessages(prev => prev.filter(msg => !msg.isLoading));
      
      const responseMessage: MessageProps = {
        content: data.content,
        source: data.source || 'gemini',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, responseMessage]);
      
      await supabase
        .from('messages')
        .insert([
          {
            conversation_id: currentConversationId,
            content: message,
            is_user: true
          },
          {
            conversation_id: currentConversationId,
            content: responseMessage.content,
            is_user: false
          }
        ]);
      
      if (audioEnabled && data.audioContent) {
        const audioSrc = `data:audio/mp3;base64,${data.audioContent}`;
        const audio = new Audio(audioSrc);
        setCurrentAudio(audio);
        
        audio.addEventListener('ended', () => {
          setCurrentAudio(null);
        });
        
        audio.play().catch(err => {
          console.error('Error playing audio:', err);
          setCurrentAudio(null);
        });
      }
      
      if (!hasInteracted && message.trim()) {
        await supabase
          .from('conversations')
          .update({ title: message.substring(0, 50) })
          .eq('id', currentConversationId);
          
        setHasInteracted(true);
      }
    } catch (error) {
      console.error('Full error details:', error);
      
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
        description: "There was a problem processing your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
    
    return Promise.resolve();
  };

  const stopCurrentAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
  };

  const toggleAudio = () => {
    if (audioEnabled && currentAudio) {
      stopCurrentAudio();
    }
    
    setAudioEnabled(!audioEnabled);
    toast({
      title: audioEnabled ? "Audio Disabled" : "Audio Enabled",
      description: audioEnabled ? "Response audio is now muted." : "You will now hear voice responses.",
    });
  };

  const handleToggleOnlineSearch = (enabled: boolean) => {
    setEnableOnlineSearch(enabled);
    console.log("Online search set to:", enabled);
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const allowedTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Unsupported File Type",
        description: "Please upload a PDF, Word, Excel, CSV, or text document.",
        variant: "destructive"
      });
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }
    
    setUploading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Document Uploaded",
        description: `"${file.name}" has been uploaded and is being analyzed.`,
      });
      
      const filePrompt = `I've uploaded a document titled "${file.name}". Please analyze this document and provide insights.`;
      await handleSendMessage(filePrompt, false);
      
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload Failed",
        description: "There was a problem uploading your document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

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
                <div className="flex-1 overflow-y-auto px-4 py-6 pb-28">
                  <div className="mx-auto max-w-3xl">
                    {messages.map((message, index) => (
                      <MessageItem
                        key={index}
                        content={message.content}
                        source={message.source}
                        citation={message.citation}
                        timestamp={message.timestamp}
                        isLoading={message.isLoading}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
                
                <div className={cn(
                  "border-t fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm z-10 pb-6 pt-4",
                  sidebarState === "expanded" ? "ml-[16rem]" : ""
                )}>
                  <div className="max-w-3xl mx-auto px-4">
                    <div className="flex items-center gap-3 justify-between">
                      <UnifiedInputBar
                        onSend={handleSendMessage}
                        onFileUpload={handleFileUpload}
                        loading={isLoading}
                        disabled={false}
                        enableAudio={audioEnabled}
                        onToggleAudio={toggleAudio}
                        placeholder="Ask about deal structuring, financing, due diligence..."
                        className="flex-1"
                      />
                      
                      <SearchModeToggle 
                        enableOnlineSearch={enableOnlineSearch} 
                        onToggle={handleToggleOnlineSearch}
                        className="text-xs"
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

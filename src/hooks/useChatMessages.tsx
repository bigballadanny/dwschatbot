
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { MessageData } from '@/components/message/MessageList';
import { useNavigate } from 'react-router-dom';

interface UseChatMessagesProps {
  user: any;
  conversationId: string | null;
  audioEnabled: boolean;
}

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

// Define a simplified message structure for sending to API
interface SimplifiedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function useChatMessages({ 
  user, 
  conversationId, 
  audioEnabled 
}: UseChatMessagesProps) {
  const [messages, setMessages] = useState<MessageData[]>([{
    content: "Hello! I'm Carl Allen's Expert Bot. Ask me anything about M&A based on Carl's teachings.",
    source: 'system',
    timestamp: new Date(),
  }]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAudioSrc, setCurrentAudioSrc] = useState<string | null>(null);
  const [enableOnlineSearch, setEnableOnlineSearch] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Load conversation messages when conversationId changes
  useEffect(() => {
    if (conversationId) {
      loadConversationMessages(conversationId);
    } else if (!user) {
       setMessages([{
           content: "Hello! I'm Carl Allen's Expert Bot. Ask me anything...",
           source: 'system', 
           timestamp: new Date(),
       }]);
       setHasInteracted(false);
    }
    setCurrentAudioSrc(null);
  }, [conversationId, user]);

  // Monitor conversation deletion
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('conversation-changes')
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'conversations', filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.old?.id === conversationId) {
          navigate('/', { replace: true });
          resetChat();
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, conversationId, navigate]);

  const resetChat = () => {
    setMessages([{
      content: "Hello! I'm Carl Allen's Expert Bot...",
      source: 'system', 
      timestamp: new Date(),
    }]);
    setHasInteracted(false);
    setCurrentAudioSrc(null);
  };

  const loadConversationMessages = async (id: string) => {
    if (!user) {
        navigate('/'); 
        return;
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
      } else {
        const { data: convoData } = await supabase.from('conversations').select('id').eq('id', id).eq('user_id', user.id).maybeSingle();
        if (convoData) {
            setMessages([{
                content: "Ask me anything...", 
                source: 'system', 
                timestamp: new Date(),
            }]);
            setHasInteracted(false);
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
        const newConversationId = data.id;
        const initialMsg = { 
          content: "Hello! Ask me anything about M&A.", 
          source: 'system' as 'system', 
          timestamp: new Date() 
        };
        
        setMessages([initialMsg]);
        
        await supabase.from('messages').insert([{ 
          conversation_id: newConversationId, 
          user_id: user.id, 
          content: initialMsg.content, 
          is_user: false, 
          metadata: { source: 'system' } 
        }]);
        
        setHasInteracted(false);
        navigate(`/?conversation=${newConversationId}`, { replace: true });
        return newConversationId;
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

  const sendMessage = async (message: string, isVoiceInput: boolean = false): Promise<void> => {
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
    
    // Update messages with the new user message and loading state
    setMessages(prevMessages => [
      ...prevMessages,
      userMessage,
      { content: '', source: 'system', isLoading: true, timestamp: new Date() }
    ]);
    
    setIsLoading(true);

    try {
      // Create a fixed structure for message history to avoid recursive type issues
      const messageHistory: SimplifiedMessage[] = [];
      
      // Process each message and convert to the simplified format
      for (const msg of messages.filter(msg => !msg.isLoading)) {
        messageHistory.push({
          role: msg.source === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
      
      // Add the new user message to history
      messageHistory.push({ 
        role: 'user', 
        content: trimmedMessage 
      });

      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: {
          query: trimmedMessage,
          messages: messageHistory,
          isVoiceInput: isVoiceInput,
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

      // Update messages with the response
      setMessages(prev => [...prev.filter(msg => !msg.isLoading), responseMessage]);

      await supabase.from('messages').insert([
        { 
          conversation_id: currentConvId, 
          user_id: user.id, 
          content: trimmedMessage, 
          is_user: true 
        },
        {
          conversation_id: currentConvId, 
          user_id: user.id,
          content: responseMessage.content, 
          is_user: false,
          metadata: { 
            source: responseMessage.source, 
            citation: responseMessage.citation 
          }
        }
      ]);

      if (audioEnabled && data.audioContent) {
        setCurrentAudioSrc(`data:audio/mp3;base64,${data.audioContent}`);
      }

      if (isFirstUserInteraction) {
        await supabase.from('conversations').update({ title: trimmedMessage.substring(0, 40) }).eq('id', currentConvId);
        setHasInteracted(true);
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
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
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOnlineSearch = (enabled: boolean) => {
    setEnableOnlineSearch(enabled);
    toast({ title: enabled ? "Online Search Enabled" : "Online Search Disabled" });
  };

  const handleAudioStop = () => {
    setCurrentAudioSrc(null);
  };

  return {
    messages,
    isLoading,
    currentAudioSrc,
    enableOnlineSearch,
    hasInteracted,
    sendMessage,
    createNewConversation,
    resetChat,
    toggleOnlineSearch,
    handleAudioStop,
    setCurrentAudioSrc
  };
}

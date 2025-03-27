
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, AlertTriangle } from "lucide-react";
import MessageItem, { MessageProps } from './MessageItem';
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from '@tanstack/react-query';
import { generateGeminiResponse } from '@/utils/geminiUtils';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import SearchModeToggle from './SearchModeToggle';

interface ChatInterfaceProps {
  className?: string;
  initialQuestion?: string | null;
}

const INITIAL_MESSAGES: MessageProps[] = [
  {
    content: "Hello! I'm the Carl Allen Expert Bot. I'm here to answer your questions about business acquisitions, deal structuring, negotiations, due diligence, and more based on Carl Allen's mastermind call transcripts. What would you like to know?",
    source: 'system',
    timestamp: new Date(),
  }
];

const ChatInterface = forwardRef<
  { submitQuestion: (question: string) => void }, 
  ChatInterfaceProps
>(({ className, initialQuestion }, ref) => {
  const [messages, setMessages] = useState<MessageProps[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [apiQuotaExceeded, setApiQuotaExceeded] = useState(false);
  const [apiDisabled, setApiDisabled] = useState(false);
  const [enableOnlineSearch, setEnableOnlineSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  
  const { data: transcripts, refetch: refetchTranscripts } = useQuery({
    queryKey: ['transcripts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transcripts')
        .select('id, title, content, created_at, file_path, source');
        
      if (error) {
        console.error('Error fetching transcripts:', error);
        return [];
      }
      
      console.log(`Fetched ${data?.length || 0} transcripts for AI knowledge base`);
      return data || [];
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
  
  useImperativeHandle(ref, () => ({
    submitQuestion: (question: string) => {
      if (conversationId) {
        handleSubmitQuestion(question);
      } else {
        const checkInterval = setInterval(() => {
          if (conversationId) {
            clearInterval(checkInterval);
            handleSubmitQuestion(question);
          }
        }, 500);
        
        setTimeout(() => clearInterval(checkInterval), 10000);
      }
    }
  }));
  
  // Get conversation ID from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlConversationId = params.get('conversation');
    
    if (urlConversationId) {
      setConversationId(urlConversationId);
      loadConversationMessages(urlConversationId);
    } else if (user) {
      createNewConversation();
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
          source: message.is_user ? 'user' : 'gemini',
          timestamp: new Date(message.created_at),
        }));
        
        setMessages(formattedMessages);
      } else {
        // If no messages found, add the initial welcome message to this conversation
        setMessages(INITIAL_MESSAGES);
        
        await supabase
          .from('messages')
          .insert([
            {
              conversation_id: id,
              content: INITIAL_MESSAGES[0].content,
              is_user: false
            }
          ]);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const createNewConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert([
          { 
            title: 'New Conversation',
            user_id: user?.id
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
              content: INITIAL_MESSAGES[0].content,
              is_user: false
            }
          ]);
            
        if (initialQuestion) {
          setTimeout(() => handleSubmitQuestion(initialQuestion), 800);
        }
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };
  
  useEffect(() => {
    refetchTranscripts();
  }, [refetchTranscripts]);
  
  const handleSubmitQuestion = async (questionText: string) => {
    if (!questionText.trim() || isLoading || !conversationId) return;
    
    const userMessage: MessageProps = {
      content: questionText,
      source: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
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
      
      await refetchTranscripts();
      
      const queryStartTime = Date.now();
      
      const responseMessage = await generateGeminiResponse(
        questionText, 
        transcripts || [], 
        messages.concat(userMessage),
        conversationId,
        enableOnlineSearch
      );
      
      if (responseMessage.source === 'fallback') {
        setApiQuotaExceeded(true);
        toast({
          title: "API Quota Limit Reached",
          description: "Responses are currently limited due to high demand. Full AI capabilities will be restored soon.",
          variant: "destructive",
          duration: 5000,
        });
      } else if (responseMessage.source === 'system' && responseMessage.content.includes("Gemini API has not been enabled")) {
        setApiDisabled(true);
        toast({
          title: "Gemini API Not Enabled",
          description: "The Gemini API needs to be enabled in your Google Cloud Console.",
          variant: "destructive",
          duration: 8000,
        });
      }
      
      const totalResponseTime = Date.now() - queryStartTime;
      console.log(`Total response time: ${totalResponseTime}ms`);
      
      await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversationId,
            content: responseMessage.content,
            is_user: false
          }
        ]);
      
      setMessages(prev => [...prev.slice(0, prev.length - 1), responseMessage]);
      
      if (messages.length <= 3) {
        await supabase
          .from('conversations')
          .update({ title: questionText.substring(0, 50) })
          .eq('id', conversationId);
      }
    } catch (error) {
      console.error('Error generating response:', error);
      
      setMessages(prev => [
        ...prev.slice(0, prev.length - 1), 
        {
          content: "I'm sorry, there was an error processing your request. Please try again.",
          source: 'system',
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmitQuestion(input);
  };
  
  const handleToggleOnlineSearch = (enabled: boolean) => {
    setEnableOnlineSearch(enabled);
    toast({
      title: enabled ? "Online Search Enabled" : "Using Transcripts Only",
      description: enabled 
        ? "Responses will now use online information when transcripts don't have relevant content." 
        : "Responses will be limited to Carl Allen's transcript content only.",
      duration: 3000,
    });
  };
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {apiQuotaExceeded && (
        <Alert variant="default" className="m-4 bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>API Quota Exceeded</AlertTitle>
          <AlertDescription>
            The AI service is currently experiencing high demand and has reached its quota limit. 
            You're now receiving fallback responses with general information. Please try again later for full AI capabilities.
          </AlertDescription>
        </Alert>
      )}
      
      {apiDisabled && (
        <Alert variant="default" className="m-4 bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Gemini API Setup Required</AlertTitle>
          <AlertDescription>
            The Gemini API is not enabled for your Google Cloud project. Please follow the instructions in the chat to enable it.
            After enabling the API, reload this page to connect to the Gemini service.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center justify-end p-4 border-b">
        <SearchModeToggle 
          enableOnlineSearch={enableOnlineSearch}
          onToggle={handleToggleOnlineSearch}
        />
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
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
      
      <div className="border-t glassmorphism">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3 items-center">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Ask about deal structuring, financing, due diligence..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="py-6 px-4 rounded-full text-base"
            />
            <Button 
              type="submit" 
              size="icon" 
              className="h-12 w-12 rounded-full flex-shrink-0"
              disabled={isLoading || !input.trim() || !conversationId}
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";

export default ChatInterface;

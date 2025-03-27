
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import MessageItem, { MessageProps } from './MessageItem';
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from '@tanstack/react-query';
import { generateGeminiResponse } from '@/utils/geminiUtils';

interface ChatInterfaceProps {
  className?: string;
}

const INITIAL_MESSAGES: MessageProps[] = [
  {
    content: "Hello! I'm the Carl Allen Expert Bot. I'm here to answer your questions about business acquisitions, deal structuring, negotiations, due diligence, and more based on Carl Allen's mastermind call transcripts. What would you like to know?",
    source: 'system',
    timestamp: new Date(),
  }
];

const ChatInterface: React.FC<ChatInterfaceProps> = ({ className }) => {
  const [messages, setMessages] = useState<MessageProps[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Use React Query to fetch transcripts with automatic refetching
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
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchInterval: 60000, // Refetch every minute to get any newly uploaded transcripts
  });
  
  useEffect(() => {
    const createConversation = async () => {
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
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
    };
    
    if (user) {
      createConversation();
    }
  }, [user]);
  
  // Manually refetch transcripts when the component mounts to ensure we have the latest data
  useEffect(() => {
    refetchTranscripts();
  }, [refetchTranscripts]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading || !conversationId) return;
    
    const userMessage: MessageProps = {
      content: input,
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
        content: "Searching through Carl Allen's transcripts...",
        source: 'system',
        timestamp: new Date(),
        isLoading: true
      };
      
      setMessages(prev => [...prev, loadingMessage]);
      
      // Refetch transcripts to ensure we have the latest data before generating a response
      await refetchTranscripts();
      
      const responseMessage = await generateGeminiResponse(
        input, 
        transcripts || [], 
        messages.concat(userMessage)
      );
      
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
          .update({ title: input.substring(0, 50) })
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
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
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
};

export default ChatInterface;

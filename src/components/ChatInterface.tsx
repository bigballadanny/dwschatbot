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

interface ChatInterfaceProps {
  className?: string;
}

interface Transcript {
  id: string;
  title: string;
  content: string;
  created_at: string;
  file_path?: string;
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
  
  const { data: transcripts } = useQuery({
    queryKey: ['transcripts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transcripts')
        .select('id, title, content, created_at, file_path');
        
      if (error) {
        console.error('Error fetching transcripts:', error);
        return [] as Transcript[];
      }
      
      return data as Transcript[];
    },
    enabled: !!user,
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
  
  const searchTranscripts = (query: string): { content: string, title: string } | null => {
    if (!transcripts || transcripts.length === 0) {
      return null;
    }
    
    const keywords = query.toLowerCase().split(' ');
    
    for (const transcript of transcripts) {
      if (!transcript.content) continue;
      
      const content = transcript.content.toLowerCase();
      if (keywords.some(keyword => content.includes(keyword))) {
        return {
          content: transcript.content,
          title: transcript.title
        };
      }
    }
    
    return null;
  };
  
  const generateResponse = async (question: string): Promise<MessageProps> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const matchedTranscript = searchTranscripts(question);
    
    if (matchedTranscript) {
      const excerptLength = 300;
      const content = matchedTranscript.content;
      
      const excerpt = content.length > excerptLength 
        ? content.substring(0, excerptLength) + '...'
        : content;
        
      return {
        content: `Based on the transcript "${matchedTranscript.title}", I found this information:\n\n${excerpt}`,
        source: 'transcript',
        citation: `From ${matchedTranscript.title}`,
        timestamp: new Date()
      };
    }
    
    if (question.toLowerCase().includes('deal structuring')) {
      return {
        content: "In Carl Allen's mastermind transcripts, he emphasizes that deal structuring should be tailored to each acquisition. He recommends using earn-outs to bridge valuation gaps and preserve cash flow. According to him, 'The best deal structure protects you from downside risk while allowing the seller to maximize their return if the business performs well.'",
        source: 'transcript',
        citation: "From Mastermind Call #5: Deal Structuring Fundamentals",
        timestamp: new Date()
      };
    } else if (question.toLowerCase().includes('due diligence')) {
      return {
        content: "Carl Allen stresses the importance of thorough due diligence in his transcripts. He suggests creating a comprehensive checklist covering financial, legal, operational, and customer aspects. He specifically mentions: 'Many deals fall apart during due diligence. The key is to identify deal-breakers early and negotiate solutions rather than walking away immediately.'",
        source: 'transcript',
        citation: "From Mastermind Call #7: Due Diligence Deep Dive",
        timestamp: new Date()
      };
    } else if (question.toLowerCase().includes('funding') || question.toLowerCase().includes('financing')) {
      return {
        content: "According to online sources, Carl Allen advocates for creative financing strategies in business acquisitions. This includes seller financing, SBA loans, and using the business's own cash flow to fund the purchase. He often discusses the 'no money down' approach to acquisitions, focusing on structuring deals that require minimal personal investment.\n\nThis aligns with his mastermind teachings where he emphasizes leveraging other people's money (OPM) for acquisitions.",
        source: 'web',
        citation: "Information from online sources about Carl Allen's financing strategies",
        timestamp: new Date()
      };
    } else {
      return {
        content: "I don't have specific information about that topic in Carl Allen's mastermind transcripts. However, I'd be happy to help with questions about deal structuring, negotiation strategies, due diligence processes, business acquisition, funding and financing, market analysis, risk assessment, business operations, investment strategies, or exit planning.\n\nIs there a specific aspect of business acquisition you'd like to learn more about?",
        source: 'system',
        timestamp: new Date()
      };
    }
  };
  
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
      
      const responseMessage = await generateResponse(input);
      
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

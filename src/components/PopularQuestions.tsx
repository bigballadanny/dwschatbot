
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

interface PopularQuestionsProps {
  onSelectQuestion: (question: string) => void;
  className?: string;
  limit?: number;
  timeRange?: 'day' | 'week' | 'month' | 'all';
}

const PopularQuestions: React.FC<PopularQuestionsProps> = ({ 
  onSelectQuestion, 
  className,
  limit = 5,
  timeRange = 'week'
}) => {
  const { data: popularQueries, isLoading } = useQuery({
    queryKey: ['popular-queries', timeRange],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_queries', { 
        time_period: timeRange === 'all' ? null : timeRange,
        limit_count: limit
      });
      
      if (error) {
        console.error('Error fetching popular queries:', error);
        return [];
      }
      
      return data || [];
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Fallback questions if no popular questions are available yet
  const fallbackQuestions = [
    "What's the best way to structure a business acquisition deal?",
    "How do I find off-market businesses for sale?",
    "What financing options are available for acquiring a small business?",
    "How do I conduct proper due diligence?",
    "What are common red flags when evaluating a business?"
  ];

  const displayQuestions = popularQueries?.length ? 
    popularQueries.map(item => item.query) : 
    fallbackQuestions;

  const handleQuestionClick = (question: string) => {
    // Call the onSelectQuestion callback with the selected question
    console.log('Question clicked:', question);
    onSelectQuestion(question);
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Popular Questions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((_, index) => (
              <div 
                key={index} 
                className="h-10 bg-muted animate-pulse rounded-md"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {displayQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3 px-4 font-normal hover:bg-primary/10 active:scale-[0.98] transition-all"
                onClick={() => handleQuestionClick(question)}
              >
                {question}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PopularQuestions;

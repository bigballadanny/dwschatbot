
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquare, TrendingUp, Sparkles } from "lucide-react";
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/AuthContext';

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
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  
  const { data: popularQueries, isLoading } = useQuery({
    queryKey: ['popular-queries', timeRange, limit],
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
    enabled: isAuthenticated, // Only fetch if user is authenticated
  });

  // Fallback questions if no popular questions are available yet
  const fallbackQuestions = [
    "What's the best way to structure a business acquisition deal?",
    "How do I find off-market businesses for sale?",
    "What financing options are available for acquiring a small business?",
    "How do I conduct proper due diligence?",
    "What are common red flags when evaluating a business?"
  ];

  const displayQuestions = (popularQueries?.length ? 
    popularQueries.map(item => item.query) : 
    fallbackQuestions).slice(0, limit);

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.2
      }
    }
  };
  
  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={container}
      className={className}
    >
      <Card className="w-full border-amber-200/30 bg-primary-foreground/40 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Popular Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: limit }).map((_, index) => (
                <div 
                  key={index} 
                  className="h-14 bg-amber-50/10 animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : (
            <motion.div 
              variants={container}
              className="space-y-3"
            >
              {displayQuestions.map((question, index) => (
                <motion.div key={index} variants={item}>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left h-auto py-3 px-4 font-normal",
                      "border-amber-200/30 hover:border-amber-400/50 hover:bg-amber-50/10",
                      "active:scale-[0.98] transition-all gap-3"
                    )}
                    onClick={() => onSelectQuestion(question)}
                  >
                    <TrendingUp className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <span>{question}</span>
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          )}
          
          {!isAuthenticated && (
            <motion.div 
              variants={item} 
              className="mt-4 p-3 rounded-lg bg-amber-50/5 border border-amber-100/20 text-sm text-muted-foreground text-center"
            >
              Sign in to see questions asked by other users
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PopularQuestions;

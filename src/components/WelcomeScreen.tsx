
import React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth/AuthContext";
import { ArrowRight, MessageSquare, Building, DollarSign, Search, FileText, Bot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/ui/use-mobile';

export interface WelcomeScreenProps {
  onStartChat: () => void;
  onSelectQuestion?: (question: string) => void;
  className?: string;
}

const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <Card className="bg-primary-foreground border-primary/20 hover:border-primary/50 hover:shadow-md transition-all duration-200">
    <CardContent className="p-6">
      <div className="flex flex-col items-center text-center mb-2">
        <div className="rounded-full bg-primary/10 p-3 mb-4">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </CardContent>
  </Card>
);

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onStartChat, 
  onSelectQuestion,
  className 
}) => {
  const { user, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  
  // Animation variants for staggered children
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };
  
  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className={cn(
        "w-full mx-auto px-6 py-8 sm:py-12 flex flex-col items-center justify-center",
        className
      )}
    >
      <motion.div 
        variants={item}
        className="flex items-center justify-center mb-6"
      >
        <img 
          src="/lovable-uploads/a4f2b4db-0dac-4c7e-864c-54391e47cf0f.png" 
          alt="DealMaker Wealth Society" 
          className="h-14 sm:h-16" 
        />
      </motion.div>

      <motion.h1 
        variants={item}
        className="text-3xl sm:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent"
      >
        M&A Mastermind AI Assistant
      </motion.h1>
      
      <motion.p 
        variants={item}
        className="text-lg text-muted-foreground text-center text-balance mb-8 max-w-2xl"
      >
        Your expert guide for insights from Carl Allen's mastermind about business acquisitions, 
        deal structuring, and more.
      </motion.p>
      
      <motion.div 
        variants={item}
        className="w-full mb-10"
      >
        <div className={cn(
          "grid gap-4",
          isMobile ? "grid-cols-1" : "grid-cols-3"
        )}>
          <FeatureCard 
            icon={MessageSquare} 
            title="Expert Insights" 
            description="Get answers based on Carl Allen's mastermind transcripts and expertise" 
          />
          <FeatureCard 
            icon={Building} 
            title="Acquisition Strategies" 
            description="Learn about finding, evaluating, and structuring business acquisitions" 
          />
          <FeatureCard 
            icon={DollarSign} 
            title="Deal Financing" 
            description="Discover options for funding your business purchases with expert advice" 
          />
        </div>
      </motion.div>
      
      <motion.div 
        variants={item}
        className="p-5 rounded-xl bg-amber-50/10 border border-amber-200/30 mb-8 max-w-2xl w-full"
      >
        <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
          <Bot className="w-5 h-5 text-amber-500" />
          <span>How I Can Help You</span>
        </h2>
        <ul className="space-y-3">
          <li className="flex items-start">
            <span className="text-amber-500 mr-2 mt-0.5">•</span>
            <span>Ask questions about business acquisitions, deal structuring, and financing</span>
          </li>
          <li className="flex items-start">
            <span className="text-amber-500 mr-2 mt-0.5">•</span>
            <span>Get insights from Carl Allen's mastermind call transcripts</span>
          </li>
          <li className="flex items-start">
            <span className="text-amber-500 mr-2 mt-0.5">•</span>
            <span>Upload documents for analysis with AI-powered assistance</span>
          </li>
          <li className="flex items-start">
            <span className="text-amber-500 mr-2 mt-0.5">•</span>
            <span>Use voice input to chat hands-free when you're on the go</span>
          </li>
        </ul>
      </motion.div>
      
      <motion.div variants={item}>
        {!isAuthenticated ? (
          <Button 
            size="lg" 
            className="px-8 py-6 text-lg bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-black shadow-md transition-all duration-200 font-medium"
            onClick={() => window.location.href = '/auth'}
          >
            Sign In to Start <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        ) : (
          <Button 
            size="lg"
            className="px-8 py-6 text-lg bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-black shadow-md transition-all duration-200 font-medium"
            onClick={onStartChat}
          >
            Start Chatting <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        )}
      </motion.div>
      
      {isAuthenticated && (
        <motion.p 
          variants={item}
          className="mt-4 text-sm text-muted-foreground"
        >
          You can also try one of the popular questions below
        </motion.p>
      )}
    </motion.div>
  );
};

export default WelcomeScreen;

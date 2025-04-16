
import React from 'react';
import { cn } from "@/lib/utils";
import { Lightbulb, AlertCircle, Info } from 'lucide-react';

interface SummaryContentProps {
  summary: string;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'warning' | 'info' | 'success';
}

export const SummaryContent: React.FC<SummaryContentProps> = ({ 
  summary, 
  className,
  title = "Summary",
  icon,
  variant = 'default'
}) => {
  if (!summary) return null;
  
  const getDefaultIcon = () => {
    switch (variant) {
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'success':
        return <Lightbulb className="h-5 w-5 text-green-500" />;
      default:
        return <Lightbulb className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (variant) {
      case 'warning':
        return 'bg-amber-50 border-amber-100';
      case 'info':
        return 'bg-blue-50 border-blue-100';
      case 'success':
        return 'bg-green-50 border-green-100';
      default:
        return 'bg-gray-50 border-gray-100';
    }
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
        {icon || getDefaultIcon()}
        {title}
      </h3>
      <div className={cn("text-gray-700 whitespace-pre-wrap p-4 rounded-md border", getBackgroundColor())}>
        {summary}
      </div>
    </div>
  );
};

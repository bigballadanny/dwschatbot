
import React from 'react';
import { cn } from "@/lib/utils";

interface SummaryContentProps {
  summary: string;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
}

export const SummaryContent: React.FC<SummaryContentProps> = ({ 
  summary, 
  className,
  title = "Summary",
  icon
}) => {
  if (!summary) return null;
  
  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      <div className="text-gray-700 whitespace-pre-wrap bg-gray-50 border border-gray-100 p-4 rounded-md">
        {summary}
      </div>
    </div>
  );
};

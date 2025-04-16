
import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from "@/lib/utils";

interface KeyPointsListProps {
  points: string[];
  className?: string;
  title?: string;
  icon?: React.ReactNode;
}

export const KeyPointsList: React.FC<KeyPointsListProps> = ({ 
  points,
  className,
  title = "Key Points",
  icon
}) => {
  if (!points.length) return null;
  
  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
        {icon || <CheckCircle2 className="h-5 w-5 text-green-500" />}
        {title}
      </h3>
      <ul className="space-y-2 list-none">
        {points.map((point, idx) => (
          <li key={idx} className="bg-green-50 border border-green-100 p-3 rounded-md flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 shrink-0" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

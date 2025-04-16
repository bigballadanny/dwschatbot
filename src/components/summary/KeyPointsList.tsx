
import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from "@/lib/utils";

interface KeyPointsListProps {
  points: string[];
  className?: string;
  title?: string;
}

export const KeyPointsList: React.FC<KeyPointsListProps> = ({ 
  points,
  className,
  title = "Key Points" 
}) => {
  if (!points.length) return null;
  
  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        {title}
      </h3>
      <ul className="space-y-2 list-none">
        {points.map((point, idx) => (
          <li key={idx} className="bg-gray-50 border border-gray-100 p-3 rounded-md">
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
};

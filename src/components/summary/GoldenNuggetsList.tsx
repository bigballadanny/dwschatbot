
import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";

interface GoldenNuggetsListProps {
  nuggets: string[];
  className?: string;
  title?: string;
}

export const GoldenNuggetsList: React.FC<GoldenNuggetsListProps> = ({ 
  nuggets,
  className,
  title = "Golden Nuggets"
}) => {
  if (!nuggets.length) return null;
  
  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-500" />
        {title}
      </h3>
      <ul className="space-y-2 list-none">
        {nuggets.map((nugget, idx) => (
          <li key={idx} className="bg-amber-50 border border-amber-100 p-3 rounded-md">
            <div className="flex">
              <div className="text-amber-700 font-medium">{nugget}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

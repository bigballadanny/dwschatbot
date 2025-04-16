
import React from 'react';
import { Sparkles } from 'lucide-react';

interface GoldenNuggetsListProps {
  nuggets: string[];
}

export const GoldenNuggetsList: React.FC<GoldenNuggetsListProps> = ({ nuggets }) => {
  if (!nuggets.length) return null;
  
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
        Golden Nuggets
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

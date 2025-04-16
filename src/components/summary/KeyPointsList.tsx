
import React from 'react';

interface KeyPointsListProps {
  points: string[];
}

export const KeyPointsList: React.FC<KeyPointsListProps> = ({ points }) => {
  if (!points.length) return null;
  
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Key Points</h3>
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

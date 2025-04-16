
import React from 'react';

interface SummaryContentProps {
  summary: string;
}

export const SummaryContent: React.FC<SummaryContentProps> = ({ summary }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Summary</h3>
      <div className="text-gray-700 whitespace-pre-wrap">
        {summary}
      </div>
    </div>
  );
};

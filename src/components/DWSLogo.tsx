import React from 'react';
import { cn } from '@/lib/utils';

interface DWSLogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const DWSLogo: React.FC<DWSLogoProps> = ({ 
  className, 
  showText = false,
  size = 'md' 
}) => {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "relative bg-gradient-to-br from-dws-gold to-dws-gold-dark rounded",
        sizes[size]
      )}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1"
        >
          {/* DWS Monogram */}
          <text
            x="50"
            y="60"
            textAnchor="middle"
            className="fill-black font-bold"
            style={{ fontSize: '40px' }}
          >
            DWS
          </text>
        </svg>
      </div>
      {showText && (
        <div>
          <p className={cn("font-bold text-dws-gold", textSizes[size])}>
            DealMaker
          </p>
          <p className={cn("font-medium text-dws-blue", textSizes[size])}>
            Wealth Society
          </p>
        </div>
      )}
    </div>
  );
};

export default DWSLogo;

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

interface AlertsListProps {
  alerts: string[];
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  variant?: 'warning' | 'error' | 'info';
}

export const AlertsList: React.FC<AlertsListProps> = ({ 
  alerts,
  className,
  title = "Alerts",
  icon,
  variant = 'warning'
}) => {
  if (!alerts.length) return null;
  
  const getIconColor = () => {
    switch (variant) {
      case 'error':
        return 'text-red-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-amber-500';
    }
  };
  
  const getBackgroundColor = () => {
    switch (variant) {
      case 'error':
        return 'bg-red-50 border-red-100';
      case 'info':
        return 'bg-blue-50 border-blue-100';
      default:
        return 'bg-amber-50 border-amber-100';
    }
  };
  
  const getTextColor = () => {
    switch (variant) {
      case 'error':
        return 'text-red-700';
      case 'info':
        return 'text-blue-700';
      default:
        return 'text-amber-700';
    }
  };
  
  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
        {icon || <AlertCircle className={cn("h-5 w-5", getIconColor())} />}
        {title}
      </h3>
      <ul className="space-y-2 list-none">
        {alerts.map((alert, idx) => (
          <li key={idx} className={cn("p-3 rounded-md flex items-start gap-2", getBackgroundColor())}>
            <AlertCircle className={cn("h-4 w-4 mt-1 shrink-0", getIconColor())} />
            <span className={getTextColor()}>{alert}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

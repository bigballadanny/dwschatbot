
import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  XCircle,
  X,
  Loader2 
} from 'lucide-react';
import { 
  Toast,
  ToastAction
} from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";

export interface CustomToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'loading';
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

export const useCustomToast = () => {
  const { toast } = useToast();
  
  const showToast = ({
    title,
    description,
    variant = 'default',
    action,
    duration,
  }: CustomToastProps) => {
    toast({
      title,
      description,
      variant,
      duration,
      action: action ? (
        <ToastAction altText={action.label} onClick={action.onClick}>
          {action.label}
        </ToastAction>
      ) : undefined,
    });
  };
  
  const success = (title: string, description?: string) => 
    showToast({ title, description, variant: 'success' });
  
  const error = (title: string, description?: string) => 
    showToast({ title, description, variant: 'destructive' });
  
  const warning = (title: string, description?: string) => 
    showToast({ title, description, variant: 'warning' });
  
  const info = (title: string, description?: string) => 
    showToast({ title, description });
  
  const loading = (title: string, description?: string) => 
    showToast({ title, description, variant: 'loading', duration: 100000 });
  
  return {
    showToast,
    success,
    error,
    warning,
    info,
    loading
  };
};

export const ToastContent: React.FC<{
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'loading';
}> = ({ title, description, variant = 'default' }) => {
  const getIcon = () => {
    switch (variant) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'destructive':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };
  
  return (
    <Toast>
      <div className="flex gap-2">
        {getIcon()}
        <div className="grid gap-1">
          {title && <div className="font-semibold">{title}</div>}
          {description && <div className="text-sm opacity-90">{description}</div>}
        </div>
      </div>
      <X className="h-4 w-4 opacity-70 cursor-pointer" />
    </Toast>
  );
};

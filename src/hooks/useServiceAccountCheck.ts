
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ServiceAccountHealth {
  isValid: boolean;
  hasProjectId?: boolean;
  hasClientEmail?: boolean;
  hasPrivateKey?: boolean;
  privateKeyFormat?: string;
  error?: string;
}

interface HealthCheckResponse {
  status: string;
  timestamp: string;
  serviceAccount: ServiceAccountHealth;
}

export function useServiceAccountCheck() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fix: Remove the path property and use the correct syntax for the health endpoint
      const { data, error } = await supabase.functions.invoke('ai-chat/health', {
        method: 'GET'
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to check service account health');
      }
      
      setHealth(data);
    } catch (err) {
      console.error('Error checking service account health:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Optional: Check health on mount
    // checkHealth();
  }, []);

  return {
    health,
    isLoading,
    error,
    checkHealth,
  };
}

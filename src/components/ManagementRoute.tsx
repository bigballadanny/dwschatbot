
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ManagementRouteProps {
  children: React.ReactNode;
}

const ManagementRoute: React.FC<ManagementRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  const { data: hasManagerRole, isLoading: isCheckingRole } = useQuery({
    queryKey: ['hasManagerRole', user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['manager', 'admin']);
      
      if (error) {
        console.error('Error checking user role:', error);
        return false;
      }
      
      return data && data.length > 0;
    },
    enabled: !!user,
  });
  
  if (isLoading || isCheckingRole) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" />;
  }
  
  if (!hasManagerRole) {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
};

export default ManagementRoute;

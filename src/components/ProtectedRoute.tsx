
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

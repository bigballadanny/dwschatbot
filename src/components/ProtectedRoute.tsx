
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { showError } from "@/utils/toastUtils";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  useEffect(() => {
    console.log("ProtectedRoute auth state:", { user, isLoading });
    
    if (!isLoading && !user) {
      showError("Authentication Required", "Please log in to access this page");
    }
  }, [user, isLoading]);
  
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-t-primary rounded-full animate-spin"></div>
        <div className="mt-4 text-lg font-medium">Loading authentication...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;

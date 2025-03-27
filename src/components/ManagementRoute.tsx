
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';

interface ManagementRouteProps {
  children: React.ReactNode;
  adminRequired?: boolean;
}

const ManagementRoute: React.FC<ManagementRouteProps> = ({ 
  children,
  adminRequired = false
}) => {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();

  // If still loading, show nothing (or could add a loading spinner)
  if (authLoading || adminLoading) {
    return null;
  }

  // If not logged in, redirect to auth page
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If admin is required and user is not admin, redirect to home
  if (adminRequired && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // If user is logged in, render the protected component
  return <>{children}</>;
};

export default ManagementRoute;

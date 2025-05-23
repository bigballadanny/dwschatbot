
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/AuthContext';
import { useAdmin } from '@/contexts/admin/AdminContext';

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

  console.log("ManagementRoute - adminRequired:", adminRequired, "isAdmin:", isAdmin, "user:", !!user);
  
  // If still loading, show a loading indicator
  if (authLoading || adminLoading) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  // If not logged in, redirect to auth page
  if (!user) {
    console.log("User not authenticated, redirecting to auth");
    return <Navigate to="/auth" replace />;
  }

  // If admin is required and user is not admin, redirect to home
  if (adminRequired && !isAdmin) {
    console.log("Admin access required but user is not admin, redirecting to home");
    return <Navigate to="/" replace />;
  }

  // If user is logged in and meets admin requirements, render the protected component
  return <>{children}</>;
};

export default ManagementRoute;


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
  adminRequired = false,
}) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  // If still loading authentication or admin status, show nothing or a loading spinner
  if (authLoading || adminLoading) {
    return <div>Loading...</div>;
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/auth" />;
  }

  // If admin access required but user is not admin, redirect to home
  if (adminRequired && !isAdmin) {
    return <Navigate to="/" />;
  }

  // If all checks pass, render the children
  return <>{children}</>;
};

export default ManagementRoute;

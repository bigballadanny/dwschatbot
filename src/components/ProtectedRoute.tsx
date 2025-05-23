
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/AuthContext';
import { showError } from "@/utils/toastUtils";
import { WavyBackground } from '@/components/ui/wavy-background';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [redirecting, setRedirecting] = useState(false);
  
  // Only show a console log in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("ProtectedRoute auth state:", { 
        user: user ? 'authenticated' : 'unauthenticated', 
        isLoading, 
        path: location.pathname 
      });
    }
    
    if (!isLoading && !user) {
      // Set redirecting state to true to show a smooth transition
      setRedirecting(true);
      
      // Show error message (but not on initial load to avoid confusion)
      if (location.pathname !== '/') {
        showError("Authentication Required", "Please log in to access this page");
      }
    }
  }, [user, isLoading, location.pathname]);
  
  // Consistent loading state that matches the auth page style
  if (isLoading || redirecting) {
    const darkWaveColors = [
      "#1e3a8a",
      "#3730a3",
      "#5b21b6",
      "#6d28d9",
      "#4f46e5",
    ];
    
    return (
      <WavyBackground 
        colors={darkWaveColors}
        waveOpacity={0.3}
        backgroundFill="#030712" 
        blur={2}
        speed="slow"
        waveWidth={100}
        containerClassName="min-h-screen w-full"
      >
        <div className="h-screen flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-blue-400/30 rounded-full animate-spin"></div>
          <div className="mt-6 text-xl font-medium text-white">
            {redirecting ? "Redirecting to login..." : "Loading your session..."}
          </div>
        </div>
      </WavyBackground>
    );
  }
  
  // Redirect to auth page if not authenticated
  if (!user) {
    // Save the current location to redirect back after login
    // This will help users return to where they were trying to go
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }
  
  // User is authenticated, render children
  return <>{children}</>;
};

export default ProtectedRoute;

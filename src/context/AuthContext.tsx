
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const refreshSession = async () => {
    try {
      console.log('Refreshing session...');
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Error refreshing session:', error);
        return;
      }
      
      setSession(data.session);
      setUser(data.session?.user ?? null);
      console.log('Session refreshed successfully');
    } catch (error) {
      console.error('Error in refreshSession:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        // Show toast for certain auth events
        if (event === 'SIGNED_IN') {
          // Check if this is a quick login user
          const isQuickLogin = session?.user?.user_metadata?.is_quick_login;
          
          toast({
            title: "Signed in successfully",
            description: isQuickLogin 
              ? "Welcome! You're using quick login access."
              : `Welcome${session?.user?.email ? ' ' + session.user.email : ''}!`,
            className: "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground",
          });
        } else if (event === 'SIGNED_OUT') {
          toast({
            title: "Signed out",
            description: "You have been signed out successfully",
            className: "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground",
          });
        } else if (event === 'USER_UPDATED') {
          toast({
            title: "Profile updated",
            description: "Your profile has been updated successfully",
            className: "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground",
          });
        } else if (event === 'PASSWORD_RECOVERY') {
          toast({
            title: "Password reset",
            description: "Please enter your new password",
            className: "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground",
          });
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Auth token refreshed successfully');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Set up token refresh
    const setupTokenRefresh = () => {
      // Set up periodic token refresh (every 30 minutes)
      const refreshInterval = setInterval(() => {
        refreshSession();
      }, 30 * 60 * 1000); // 30 minutes
      
      return () => clearInterval(refreshInterval);
    };
    
    const refreshCleanup = setupTokenRefresh();

    return () => {
      subscription.unsubscribe();
      refreshCleanup();
    };
  }, [toast]);

  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      // The onAuthStateChange listener will update the state
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error signing out",
        description: "An error occurred while signing out",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, signOut, isLoading, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { toast } from '@/components/ui/use-toast';

interface UserWithExtras {
  id: string;
  email?: string;
  avatarUrl?: string;
  displayName?: string;
}

export interface AuthContextType {
  user: UserWithExtras | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Create the context with undefined as default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserWithExtras | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const getCurrentUser = async () => {
      setLoading(true);
      try {
        // Get session data
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData && sessionData.session) {
          setSession(sessionData.session);
          
          // Get user data
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            throw userError;
          }
          
          if (userData && userData.user) {
            // Get profile data if available
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', userData.user.id)
              .single();
            
            // Enhance user with profile data
            const enhancedUser: UserWithExtras = {
              id: userData.user.id,
              email: userData.user.email,
              avatarUrl: profileData?.avatar_url || undefined,
              displayName: profileData?.display_name || userData.user.email
            };
            
            setUser(enhancedUser);
          }
        } else {
          setUser(null);
          setSession(null);
        }
      } catch (error: any) {
        console.error('Error getting auth user:', error.message);
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    getCurrentUser();

    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        
        if (event === 'SIGNED_OUT' || !newSession) {
          setUser(null);
          return;
        }
        
        if (newSession?.user) {
          // Get profile data if available
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', newSession.user.id)
            .single();
          
          // Enhance user with profile data
          const enhancedUser: UserWithExtras = {
            id: newSession.user.id,
            email: newSession.user.email,
            avatarUrl: profileData?.avatar_url || undefined,
            displayName: profileData?.display_name || newSession.user.email
          };
          
          setUser(enhancedUser);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Success!",
        description: "You've successfully signed in.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: error.message || "Please check your credentials and try again.",
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Account created!",
        description: "Please check your email for a confirmation link.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: error.message || "Please try again with a different email.",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      setUser(null);
      setSession(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign out failed",
        description: error.message || "An error occurred while signing out.",
      });
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
};

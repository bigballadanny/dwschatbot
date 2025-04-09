
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
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
        // Get session without excessive destructuring
        const sessionResult = await supabase.auth.getSession();
        const currentSession = sessionResult.data.session;
        
        if (currentSession) {
          setSession(currentSession);
          
          // Get user data without excessive destructuring
          const userResult = await supabase.auth.getUser();
          
          if (userResult.error) {
            throw userResult.error;
          }
          
          if (userResult.data.user) {
            // Get profile data if available
            const profileResult = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', userResult.data.user.id)
              .single();
            
            // Enhance user with profile data
            const enhancedUser: UserWithExtras = {
              id: userResult.data.user.id,
              email: userResult.data.user.email,
              avatarUrl: profileResult.data?.avatar_url || undefined,
              displayName: profileResult.data?.display_name || userResult.data.user.email
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

    // Set up auth state listener with simplified approach
    const authListener = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        
        if (event === 'SIGNED_OUT' || !newSession) {
          setUser(null);
          return;
        }
        
        if (newSession?.user) {
          // Get profile data if available
          const profileResult = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', newSession.user.id)
            .single();
          
          // Enhance user with profile data
          const enhancedUser: UserWithExtras = {
            id: newSession.user.id,
            email: newSession.user.email,
            avatarUrl: profileResult.data?.avatar_url || undefined,
            displayName: profileResult.data?.display_name || newSession.user.email
          };
          
          setUser(enhancedUser);
        }
      }
    );

    return () => {
      authListener.data.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
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
      const { data, error } = await supabase.auth.signUp({ email, password });
      
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

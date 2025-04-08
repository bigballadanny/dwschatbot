
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any } | undefined>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error: any } | undefined>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => undefined,
  signOut: async () => {},
  signUp: async () => undefined
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Method to sign in
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  // Method to sign up
  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  // Method to sign out
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
    signUp
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

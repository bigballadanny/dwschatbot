
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { showError, showSuccess } from "@/utils/toastUtils";

// Type for authentication operation responses
interface AuthResponse {
  error: AuthError | null;
  success?: boolean;
  message?: string;
}

// Enhanced context type with better error typing and additional auth methods
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResponse>;
  updatePassword: (password: string) => Promise<AuthResponse>;
  quickLogin: (email: string) => Promise<AuthResponse>;
}

const initialAuthContext: AuthContextType = {
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  resetPassword: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
  quickLogin: async () => ({ error: null }),
};

const AuthContext = createContext<AuthContextType>(initialAuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize authentication session
  useEffect(() => {
    const getInitialSession = async () => {
      try {
        setIsLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session?.user);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Initial auth session loaded:', {
            authenticated: !!session?.user,
            path: location.pathname
          });
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Set up auth subscription for real-time auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Auth state changed:', event, 'User:', session?.user?.email);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session?.user);
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [location.pathname]);

  // Enhanced signup with better error handling
  const signUp = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      const { data: _, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });
      
      if (error) throw error;
      
      return { 
        error: null,
        success: true,
        message: "Please check your email for a confirmation link"
      };
    } catch (error) {
      console.error('Error signing up:', error);
      const authError = error as AuthError;
      return { 
        error: authError,
        success: false,
        message: authError.message || "An error occurred during signup"
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced signin with better error handling
  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      const { data: _, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      return { 
        error: null,
        success: true,
        message: "Logged in successfully"
      };
    } catch (error) {
      console.error('Error signing in:', error);
      const authError = error as AuthError;
      return { 
        error: authError,
        success: false,
        message: authError.message || "An error occurred during sign in"
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced signout with redirection
  const signOut = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      
      // Redirect to auth page with state cleanup
      navigate('/auth', { replace: true });
      showSuccess("Signed out", "You have been successfully signed out");
    } catch (error) {
      console.error('Error signing out:', error);
      const authError = error as Error;
      showError("Sign out failed", authError.message || "There was a problem signing you out");
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // Reset password functionality
  const resetPassword = async (email: string): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });
      
      if (error) throw error;
      
      return { 
        error: null,
        success: true,
        message: "Password reset email sent"
      };
    } catch (error) {
      console.error('Error resetting password:', error);
      const authError = error as AuthError;
      return { 
        error: authError,
        success: false,
        message: authError.message || "Error sending password reset email"
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Update password functionality
  const updatePassword = async (password: string): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      return { 
        error: null,
        success: true,
        message: "Password updated successfully"
      };
    } catch (error) {
      console.error('Error updating password:', error);
      const authError = error as AuthError;
      return { 
        error: authError,
        success: false,
        message: authError.message || "Error updating password"
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Quick login functionality
  const quickLogin = async (email: string): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      const quickPassword = "123123"; // Simplified for demo
      
      // Try signing in first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: quickPassword,
      });
      
      // If login fails, create a new account
      if (signInError) {
        console.log("Quick login sign in failed, attempting to create account:", signInError.message);
        
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: quickPassword,
          options: {
            data: {
              is_quick_login: true
            }
          }
        });
        
        if (signUpError) throw signUpError;
        
        // Try signing in again
        const { error: finalSignInError } = await supabase.auth.signInWithPassword({
          email,
          password: quickPassword,
        });
        
        if (finalSignInError) throw finalSignInError;
      }
      
      return { 
        error: null,
        success: true,
        message: "Quick login successful"
      };
    } catch (error) {
      console.error('Error with quick login:', error);
      const authError = error as AuthError;
      return { 
        error: authError,
        success: false,
        message: authError.message || "Error with quick login"
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Context value with all auth methods and state
  const value = {
    user,
    session,
    isLoading,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    quickLogin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};

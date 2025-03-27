
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface AdminContextType {
  isAdmin: boolean;
  isLoading: boolean;
  makeAdmin: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  isLoading: true,
  makeAdmin: async () => {},
});

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const makeAdmin = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to become an admin",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      // Insert a record to make the current user an admin
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role: 'admin' });

      if (error) {
        console.error('Error making user admin:', error);
        toast({
          title: "Error",
          description: "Failed to update admin status",
          variant: "destructive"
        });
      } else {
        console.log("User made admin successfully");
        setIsAdmin(true);
        toast({
          title: "Success",
          description: "You are now an admin",
        });
      }
    } catch (error) {
      console.error('Error in makeAdmin:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        console.log("Checking admin status for user:", user.id);
        
        // Check if the user has an 'admin' role in the user_roles table
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows returned" which is expected for non-admins
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        } else {
          const isUserAdmin = !!data;
          console.log("User admin status:", isUserAdmin);
          setIsAdmin(isUserAdmin);
        }
      } catch (error) {
        console.error('Error in admin check:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return (
    <AdminContext.Provider value={{ isAdmin, isLoading, makeAdmin }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextType => {
  return useContext(AdminContext);
};

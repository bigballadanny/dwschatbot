import React from 'react';
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu"
import { Button, buttonVariants } from "@/components/ui/button"
import { ModeToggle } from '@/components/ModeToggle';
import { Settings, LogOut } from "lucide-react"
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/context/AuthContext';
import { getUserInitials } from '@/utils/helpers';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useMobile } from '@/hooks/useMobile';
import { Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import AdminManagement from './pages/AdminManagement';
import ManagementRoute from './components/ManagementRoute';
import Analytics from './pages/Analytics';
import Wavy from './pages/Wavy';
import Transcripts from './pages/Transcripts';
import WarRoom from './pages/WarRoom';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Toaster />
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/wavy" element={<Wavy />} />
          
          <Route
            path="/transcripts"
            element={<ProtectedRoute><Transcripts /></ProtectedRoute>}
          />
          
          <Route
            path="/war-room"
            element={<ProtectedRoute><WarRoom /></ProtectedRoute>}
          />

          <Route
            path="/analytics"
            element={
              <ManagementRoute adminRequired>
                <Analytics />
              </ManagementRoute>
            }
          />
          
          <Route
            path="/admin"
            element={
              <ManagementRoute adminRequired>
                <AdminManagement />
              </ManagementRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

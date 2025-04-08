
import React from 'react';
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { AdminProvider } from '@/context/AdminContext';
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
        <AdminProvider>
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
        </AdminProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

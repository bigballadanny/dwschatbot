
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { BookOpen, Headphones, BarChart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';
import { ModeToggle } from "@/components/ModeToggle";
import { useSidebar } from "@/components/ui/sidebar";

const Header: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { toggleSidebar } = useSidebar();
  const location = useLocation();
  
  // Check if we're on the homepage
  const isHomePage = location.pathname === '/';
  const isAnalyticsPage = location.pathname === '/analytics';
  
  console.log("Header - isAdmin:", isAdmin, "user:", !!user, "path:", location.pathname);
  
  const handleLogoClick = () => {
    if (isHomePage) {
      // Toggle sidebar if we're already on the home page
      toggleSidebar();
    }
    // If not on home page, the Link component will navigate to home
  };
  
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          {isHomePage ? (
            <button 
              onClick={handleLogoClick} 
              className="font-bold text-xl flex items-center cursor-pointer hover:text-primary transition-colors"
            >
              <BookOpen className="mr-2 h-6 w-6 text-primary" />
              DWS AI
            </button>
          ) : (
            <Link 
              to="/" 
              className="font-bold text-xl flex items-center cursor-pointer hover:text-primary transition-colors"
            >
              <BookOpen className="mr-2 h-6 w-6 text-primary" />
              DWS AI
            </Link>
          )}
          
          {isAnalyticsPage && isAdmin && (
            <div className="ml-4 px-2 py-1 bg-primary/10 rounded-md text-primary text-sm flex items-center">
              <BarChart className="h-4 w-4 mr-1" />
              Analytics Dashboard
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {user && (
            <Button variant="ghost" size="sm" className="text-xs hidden sm:flex items-center">
              <Headphones className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Text-to-Speech</span>
              <span className="inline sm:hidden">TTS</span>
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-green-500 text-white rounded-full">New</span>
            </Button>
          )}
          
          <ModeToggle />
          
          {!user && (
            <Button asChild size="sm" className="ml-2">
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

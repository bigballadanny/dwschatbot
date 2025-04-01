import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Headphones, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';
import { ModeToggle } from "@/components/ModeToggle";
import { useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
const Header: React.FC = () => {
  const {
    user
  } = useAuth();
  const {
    isAdmin
  } = useAdmin();
  const {
    toggleSidebar
  } = useSidebar();
  const location = useLocation();

  // Check if we're on the homepage
  const isHomePage = location.pathname === '/';
  const handleLogoClick = () => {
    if (isHomePage) {
      // Toggle sidebar if we're already on the home page
      toggleSidebar();
    }
    // If not on home page, the Link component will navigate to home
  };
  return <header className="border-b shadow-sm bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-1 md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          
          {isHomePage ? <button onClick={handleLogoClick} className="font-bold text-xl flex items-center cursor-pointer transition-all hover:scale-105">
              <div className="relative p-2 rounded-lg mr-2 overflow-hidden futuristic-glow">
                <div className="absolute inset-0 animate-pulse-subtle bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 opacity-70 blur-md"></div>
                <img src="/lovable-uploads/d2cda96a-7427-49e3-86f0-42ecd63d9982.png" alt="DealMaker Wealth Society" className="h-8 w-8 relative z-10" />
              </div>
              <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent font-bold">
                DWS AI
              </span>
            </button> : <Link to="/" className="font-bold text-xl flex items-center cursor-pointer transition-all hover:scale-105">
              <div className="relative p-2 rounded-lg mr-2 overflow-hidden futuristic-glow">
                <div className="absolute inset-0 animate-pulse-subtle bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 opacity-70 blur-md"></div>
                <img src="/lovable-uploads/d2cda96a-7427-49e3-86f0-42ecd63d9982.png" alt="DealMaker Wealth Society" className="h-8 w-8 relative z-10" />
              </div>
              <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent font-bold">
                DWS AI
              </span>
            </Link>}
        </div>
        
        <div className="flex items-center space-x-3">
          {user && <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs hidden sm:flex items-center transition-all hover:bg-primary/10">
                      <Headphones className="mr-1 h-4 w-4 text-primary" />
                      <span className="hidden sm:inline">Text-to-Speech</span>
                      <span className="inline sm:hidden">TTS</span>
                      <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-green-500 text-white rounded-full animate-pulse">
                        New
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Listen to AI responses with text-to-speech</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Analytics button removed since it's already in the sidebar */}
            </>}
          
          <ModeToggle />
          
          {!user ? <Button asChild size="sm" className="ml-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all">
              <Link to="/auth">Sign In</Link>
            </Button> : <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-8 w-8 transition-all hover:ring-2 hover:ring-primary/50 cursor-pointer">
                    
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{user.email || 'User Account'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>}
        </div>
      </div>
    </header>;
};
export default Header;
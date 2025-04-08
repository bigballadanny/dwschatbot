
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeToggle } from "@/components/ModeToggle";
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';
import { useMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { LogOut, Settings, Home } from 'lucide-react';
import { getUserInitials } from '@/utils/helpers';

// Header component with War Room link
const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const location = useLocation();
  const isMobile = useMobile();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="sticky top-0 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link to="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl hidden md:inline-block text-primary">DWS AI</span>
            <span className="font-bold text-xl md:hidden text-primary">DWS</span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-1 md:space-x-2">
          {user && (
            <>
              <Link
                to="/"
                className={cn(
                  buttonVariants({ variant: location.pathname === "/" ? "default" : "ghost", size: "sm" }),
                )}
              >
                <Home className="h-4 w-4 mr-2" />
                Chat
              </Link>

              <Link
                to="/transcripts"
                className={cn(
                  buttonVariants({ variant: location.pathname === "/transcripts" ? "default" : "ghost", size: "sm" }),
                )}
              >
                Transcripts
              </Link>
              
              <Link
                to="/war-room"
                className={cn(
                  buttonVariants({ variant: location.pathname === "/war-room" ? "default" : "ghost", size: "sm" }),
                )}
              >
                War Room
              </Link>

              {isAdmin && (
                <Link
                  to="/analytics"
                  className={cn(
                    buttonVariants({ variant: location.pathname === "/analytics" ? "default" : "ghost", size: "sm" }),
                  )}
                >
                  Analytics
                </Link>
              )}
            </>
          )}
        </div>
        
        <div className="ml-auto flex items-center space-x-2">
          <ModeToggle />
          
          {!user ? (
            <Button size="sm" onClick={() => navigate("/auth")}>
              Login
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl} alt={user.displayName || "User"} />
                    <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Admin Settings</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

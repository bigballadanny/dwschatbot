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
import { useMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';
import { LogOut, Settings } from 'lucide-react';

// Keep the Header component and add the War Room link
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

  const getUserInitials = (user: any) => {
    if (!user) return '';
    
    if (user.displayName) {
      const names = user.displayName.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.displayName[0].toUpperCase();
    }
    
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    
    return 'U';
  };

  return (
    <header className="sticky top-0 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link to="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl hidden md:inline-block">DWS AI</span>
            <span className="font-bold text-xl md:hidden">DWS</span>
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

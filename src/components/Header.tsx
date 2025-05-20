
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Headphones } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();

  return (
    <header className="border-b shadow-sm bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Navigation Menu */}
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link to="/" className={navigationMenuTriggerStyle()}>
                Home
              </Link>
            </NavigationMenuItem>
            
            
            {isAdmin && (
              <NavigationMenuItem>
                <NavigationMenuTrigger>Admin</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[200px] gap-3 p-4">
                    <li>
                      <NavigationMenuLink asChild>
                        <Link 
                          to="/transcripts" 
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">Transcripts</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Manage conversation transcripts
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <Link 
                          to="/admin" 
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">Admin Management</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Manage admin users and permissions
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            )}
            
          </NavigationMenuList>
        </NavigationMenu>

        {/* User Account Section */}
        <div className="flex items-center space-x-3">
          {/* Text-to-Speech Button Removed
          {user && (
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
          )}
          */} {/* End of Removed TTS Button */}

          {!user ? (
            <Button asChild size="sm" className="ml-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all">
              <Link to="/auth">Sign In</Link>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 transition-all hover:ring-2 hover:ring-primary/50 cursor-pointer">
                  <AvatarFallback>
                    {user.email?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuItem className="text-sm">
                  {user.email || 'User'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/transcripts">Manage Transcripts</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin">Admin Management</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={signOut} className="text-red-500 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/50 cursor-pointer">
                  Sign out
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

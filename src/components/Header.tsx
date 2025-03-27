
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';
import { BookOpen, BarChart3, Shield } from 'lucide-react';

const HeaderLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link to={to} className="text-sm font-medium hover:text-primary">{children}</Link>
);

const UserAvatar = () => {
  const { user } = useAuth();

  return (
    <Avatar>
      <AvatarImage src={user?.user_metadata?.avatar_url} />
      <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  )
}

const Header: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, makeAdmin } = useAdmin();
  
  console.log("Header - isAdmin:", isAdmin, "user:", !!user);
  
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="font-bold text-xl flex items-center">
            <BookOpen className="mr-2 h-6 w-6 text-primary" />
            DWS AI
          </Link>
          
          <nav className="ml-8 hidden md:flex space-x-4">
            <HeaderLink to="/">Home</HeaderLink>
            <HeaderLink to="/transcripts">Transcripts</HeaderLink>
            {isAdmin && (
              <HeaderLink to="/analytics">
                <span className="flex items-center">
                  <BarChart3 className="mr-1 h-4 w-4" />
                  Analytics
                </span>
              </HeaderLink>
            )}
          </nav>
        </div>
        
        <div className="flex items-center space-x-2">
          {user ? (
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <Button asChild variant="outline" size="sm">
                  <Link to="/analytics">
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Analytics
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={makeAdmin}>
                  <Shield className="h-4 w-4 mr-1" />
                  Become Admin
                </Button>
              )}
              <UserAvatar />
            </div>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

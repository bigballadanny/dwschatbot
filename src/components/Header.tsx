import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ModeToggle";
import { useAuth } from '@/context/AuthContext';
import { BookOpen, Sliders } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useAdmin } from '@/context/AdminContext';

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
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  const handleSignOut = async () => {
    await signOut();
  };
   
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="font-bold text-xl flex items-center">
            <BookOpen className="mr-2 h-6 w-6 text-primary" />
            Carl Allen Expert
          </Link>
          
          <nav className="ml-8 hidden md:flex space-x-4">
            <HeaderLink to="/">Home</HeaderLink>
            <HeaderLink to="/transcripts">Transcripts</HeaderLink>
            <HeaderLink to="/analytics">Analytics</HeaderLink>
          </nav>
        </div>
        
        <div className="flex items-center space-x-2">
          {user ? (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin">
                    <Sliders className="h-4 w-4 mr-1" />
                    Admin
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign Out</Button>
              <UserAvatar />
            </div>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
          <ModeToggle />
        </div>
      </div>
      
      {/* Mobile nav */}
      <div className={`${mobileNavOpen ? 'block' : 'hidden'} md:hidden border-t p-2`}>
        <div className="flex flex-col space-y-2">
          <HeaderLink to="/">Home</HeaderLink>
          <HeaderLink to="/transcripts">Transcripts</HeaderLink>
          <HeaderLink to="/analytics">Analytics</HeaderLink>
          {isAdmin && (
            <HeaderLink to="/admin">Admin Panel</HeaderLink>
          )}
        </div>
      </div>
    </header>
  );
  
};

export default Header;

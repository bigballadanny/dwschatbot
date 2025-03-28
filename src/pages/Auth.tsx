
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate('/');
      }
    };
    
    checkSession();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          navigate('/');
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Check for password reset URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('type') === 'recovery') {
      setResetPassword(true);
    }
  }, []);
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    if (!email || !password) {
      setErrorMessage("Please enter both email and password");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });
      
      if (error) throw error;
      
      setConfirmationSent(true);
      toast({
        title: "Sign up initiated",
        description: "Please check your email for a confirmation link",
      });
    } catch (error: any) {
      const errorMsg = error.message || "An error occurred during sign up";
      setErrorMessage(errorMsg);
      
      if (errorMsg.includes("already registered")) {
        // If user already exists, offer to sign in instead
        toast({
          title: "Account already exists",
          description: "This email is already registered. Try signing in instead.",
        });
      } else {
        toast({
          title: "Error signing up",
          description: errorMsg,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    if (!email || !password) {
      setErrorMessage("Please enter both email and password");
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // If successful, the onAuthStateChange listener will handle navigation
    } catch (error: any) {
      const errorMsg = error.message || "An error occurred during sign in";
      
      setErrorMessage(errorMsg);
      
      if (errorMsg.includes("Invalid login credentials")) {
        toast({
          title: "Invalid credentials",
          description: "Please check your email and password and try again",
          variant: "destructive"
        });
      } else if (errorMsg.includes("Email not confirmed")) {
        toast({
          title: "Email not confirmed",
          description: "Please check your email for a confirmation link",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error signing in",
          description: errorMsg,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    if (!email) {
      setErrorMessage("Please enter your email address");
      return;
    }
    
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?tab=resetpassword`,
      });
      
      if (error) throw error;
      
      setResetSent(true);
      toast({
        title: "Password reset email sent",
        description: "Check your email for a password reset link",
      });
    } catch (error: any) {
      const errorMsg = error.message || "An error occurred during password reset";
      setErrorMessage(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      return;
    }
    
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password
      });
      
      if (error) throw error;
      
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully",
      });
      
      // The auth state change event will redirect to home
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred updating your password");
      toast({
        title: "Error",
        description: error.message || "An error occurred updating your password",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (confirmationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Check your email</CardTitle>
            <CardDescription className="text-center">
              We've sent a confirmation link to <span className="font-medium">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Alert>
              <AlertDescription>
                Please check your email and click the link to complete your registration. 
                You can close this page.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button 
              onClick={() => setConfirmationSent(false)} 
              variant="outline"
              className="w-full"
            >
              Back to sign in
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Check if we're in password reset mode (from email link)
  const params = new URLSearchParams(window.location.search);
  if (params.get('type') === 'recovery') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Set New Password</CardTitle>
            <CardDescription className="text-center">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleUpdatePassword}>
            <CardContent className="space-y-4 pt-4">
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input 
                  id="new-password" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={loading}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : "Update Password"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }
  
  if (resetPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
            <CardDescription className="text-center">
              Enter your email to receive a password reset link
            </CardDescription>
          </CardHeader>
          <form onSubmit={handlePasswordReset}>
            <CardContent className="space-y-4 pt-4">
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              {resetSent && (
                <Alert>
                  <AlertDescription>
                    Reset link sent to {email}. Check your email inbox.
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email-reset">Email</Label>
                <Input 
                  id="email-reset" 
                  type="email" 
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || resetSent}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading || resetSent}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : "Send Reset Link"}
              </Button>
              <Button 
                onClick={() => setResetPassword(false)} 
                variant="ghost"
                type="button"
              >
                Back to sign in
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Carl Allen Expert Bot</CardTitle>
          <CardDescription className="text-center">
            Sign in or create an account to access the AI assistant
          </CardDescription>
        </CardHeader>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <form onSubmit={handleSignIn}>
              <CardContent className="space-y-4 pt-4">
                {errorMessage && (
                  <Alert variant="destructive">
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email-signin">Email</Label>
                  <Input 
                    id="email-signin" 
                    type="email" 
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signin">Password</Label>
                  <Input 
                    id="password-signin" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
                <Button 
                  onClick={() => setResetPassword(true)} 
                  variant="link" 
                  className="p-0 h-auto font-normal text-sm"
                  type="button"
                >
                  Forgot password?
                </Button>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : "Sign In"}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
          
          <TabsContent value="signup">
            <form onSubmit={handleSignUp}>
              <CardContent className="space-y-4 pt-4">
                {errorMessage && (
                  <Alert variant="destructive">
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email-signup">Email</Label>
                  <Input 
                    id="email-signup" 
                    type="email" 
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">Password</Label>
                  <Input 
                    id="password-signup" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : "Create Account"}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Auth;

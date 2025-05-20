
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { AuthError } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { WavyBackground } from "@/components/ui/wavy-background";

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quickLoginEmail, setQuickLoginEmail] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, signIn, resetPassword: resetPasswordAuth, updatePassword: updatePasswordAuth, quickLogin: quickLoginAuth } = useAuth();
  
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // Check if there's a redirect path in location state
        const locationState = location.state as { from?: { pathname: string } };
        const redirectPath = locationState?.from?.pathname || '/';
        
        // Don't redirect back to auth or non-existent pages
        const finalRedirect = redirectPath === '/auth' || !redirectPath ? '/' : redirectPath;
        navigate(finalRedirect, { replace: true });
      }
    };
    
    checkSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          // Check if there's a redirect path in location state
          const locationState = location.state as { from?: { pathname: string } };
          const redirectPath = locationState?.from?.pathname || '/';
          
          // Don't redirect back to auth or non-existent pages
          const finalRedirect = redirectPath === '/auth' || !redirectPath ? '/' : redirectPath;
          navigate(finalRedirect, { replace: true });
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, [navigate, location.state]);

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
      // Use the AuthContext's signUp method
      const { error, success, message } = await signUp(email, password);
      
      if (error) throw error;
      
      setConfirmationSent(true);
      toast({
        title: "Sign up initiated",
        description: message,
      });
    } catch (error) {
      const authError = error as AuthError;
      const errorMsg = authError.message || "An error occurred during sign up";
      setErrorMessage(errorMsg);
      
      if (errorMsg.includes("already registered")) {
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
      // Use the AuthContext's signIn method
      const { error, success, message } = await signIn(email, password);
      
      if (error) throw error;
      
      // Success is handled by the Auth subscription in useEffect
      toast({
        title: "Sign in successful",
        description: "Welcome back!",
      });
      
    } catch (error) {
      const authError = error as AuthError;
      const errorMsg = authError.message || "An error occurred during sign in";
      
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

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    if (!quickLoginEmail) {
      setErrorMessage("Please enter an email for quick login");
      return;
    }
    
    try {
      setLoading(true);
      // Use the AuthContext's quickLogin method
      const { error, success, message } = await quickLoginAuth(quickLoginEmail);
      
      if (error) throw error;
      
      toast({
        title: "Quick login successful",
        description: "You are now signed in with quick access",
      });
      
    } catch (error) {
      console.error("Quick login error:", error);
      const authError = error as AuthError;
      setErrorMessage(authError.message || "An error occurred");
      toast({
        title: "Error with quick login",
        description: authError.message || "An error occurred with quick login",
        variant: "destructive"
      });
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
      // Use the AuthContext's resetPassword method
      const { error, success, message } = await resetPasswordAuth(email);
      
      if (error) throw error;
      
      setResetSent(true);
      toast({
        title: "Password reset email sent",
        description: "Check your email for a password reset link",
      });
    } catch (error) {
      const authError = error as AuthError;
      const errorMsg = authError.message || "An error occurred during password reset";
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
      // Use the AuthContext's updatePassword method
      const { error, success, message } = await updatePasswordAuth(password);
      
      if (error) throw error;
      
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully",
      });
      
      // Redirect to home page after successful password update
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
      
    } catch (error) {
      const authError = error as AuthError;
      setErrorMessage(authError.message || "An error occurred updating your password");
      toast({
        title: "Error",
        description: authError.message || "An error occurred updating your password",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const darkWaveColors = [
    "#1e3a8a",
    "#3730a3",
    "#5b21b6",
    "#6d28d9",
    "#4f46e5",
  ];
  
  if (confirmationSent) {
    return (
      <WavyBackground 
        colors={darkWaveColors}
        waveOpacity={0.3}
        backgroundFill="#030712" 
        blur={2}
        speed="slow"
        waveWidth={100}
        containerClassName="min-h-screen w-full"
      >
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-slate-900/60 backdrop-blur-md border-slate-800">
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-4">
                <img 
                  src="/lovable-uploads/a4f2b4db-0dac-4c7e-864c-54391e47cf0f.png" 
                  alt="DealMaker Wealth Society" 
                  className="h-12" 
                />
              </div>
              <CardTitle className="text-2xl text-center text-white">Check your email</CardTitle>
              <CardDescription className="text-center text-slate-300">
                We've sent a confirmation link to <span className="font-medium">{email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Alert className="bg-slate-800 text-slate-200 border-slate-700">
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
                className="w-full bg-slate-800 text-white border-slate-700 hover:bg-slate-700 hover:border-slate-600 shadow-md hover:shadow-lg transition-all duration-200"
              >
                Back to sign in
              </Button>
            </CardFooter>
          </Card>
        </div>
      </WavyBackground>
    );
  }
  
  const params = new URLSearchParams(window.location.search);
  if (params.get('type') === 'recovery') {
    return (
      <WavyBackground 
        colors={darkWaveColors}
        waveOpacity={0.3}
        backgroundFill="#030712" 
        blur={2}
        speed="slow"
        waveWidth={100}
        containerClassName="min-h-screen w-full"
      >
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-slate-900/60 backdrop-blur-md border-slate-800">
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-4">
                <img 
                  src="/lovable-uploads/a4f2b4db-0dac-4c7e-864c-54391e47cf0f.png" 
                  alt="DealMaker Wealth Society" 
                  className="h-12" 
                />
              </div>
              <CardTitle className="text-2xl text-center text-white">Set New Password</CardTitle>
              <CardDescription className="text-center text-slate-300">
                Enter your new password below
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdatePassword}>
              <CardContent className="space-y-4 pt-4">
                {errorMessage && (
                  <Alert variant="destructive" className="border-red-800 bg-red-950/60 text-red-200">
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-slate-200">New Password</Label>
                  <Input 
                    id="new-password" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    disabled={loading}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
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
      </WavyBackground>
    );
  }
  
  if (resetPassword) {
    return (
      <WavyBackground 
        colors={darkWaveColors}
        waveOpacity={0.3}
        backgroundFill="#030712" 
        blur={2}
        speed="slow"
        waveWidth={100}
        containerClassName="min-h-screen w-full"
      >
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-slate-900/60 backdrop-blur-md border-slate-800">
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-4">
                <img 
                  src="/lovable-uploads/a4f2b4db-0dac-4c7e-864c-54391e47cf0f.png" 
                  alt="DealMaker Wealth Society" 
                  className="h-12" 
                />
              </div>
              <CardTitle className="text-2xl text-center text-white">Reset Password</CardTitle>
              <CardDescription className="text-center text-slate-300">
                Enter your email to receive a password reset link
              </CardDescription>
            </CardHeader>
            <form onSubmit={handlePasswordReset}>
              <CardContent className="space-y-4 pt-4">
                {errorMessage && (
                  <Alert variant="destructive" className="border-red-800 bg-red-950/60 text-red-200">
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}
                {resetSent && (
                  <Alert className="bg-slate-800 text-slate-200 border-slate-700">
                    <AlertDescription>
                      Reset link sent to {email}. Check your email inbox.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email-reset" className="text-slate-200">Email</Label>
                  <Input 
                    id="email-reset" 
                    type="email" 
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading || resetSent}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
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
                  className="text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  Back to sign in
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </WavyBackground>
    );
  }
  
  return (
    <WavyBackground 
      colors={darkWaveColors}
      waveOpacity={0.3}
      backgroundFill="#030712" 
      blur={2}
      speed="slow"
      waveWidth={100}
      containerClassName="min-h-screen w-full"
    >
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900/60 backdrop-blur-md border-slate-800">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <img 
                src="/lovable-uploads/a4f2b4db-0dac-4c7e-864c-54391e47cf0f.png" 
                alt="DealMaker Wealth Society" 
                className="h-12" 
              />
            </div>
            <CardTitle className="text-2xl text-center text-white">DealMaker Wealth Society</CardTitle>
            <CardDescription className="text-center text-slate-300">
              Access Carl Allen's M&A Mastermind AI Assistant
            </CardDescription>
          </CardHeader>
          <Tabs defaultValue="quicklogin" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-800 p-1">
              <TabsTrigger 
                value="signin" 
                className="text-slate-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="text-slate-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
              >
                Sign Up
              </TabsTrigger>
              <TabsTrigger 
                value="quicklogin" 
                className="text-slate-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
              >
                Quick Login
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4 pt-4">
                  {errorMessage && (
                    <Alert variant="destructive" className="border-red-800 bg-red-950/60 text-red-200">
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email-signin" className="text-slate-200">Email</Label>
                    <Input 
                      id="email-signin" 
                      type="email" 
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      autoComplete="email"
                      className="bg-slate-800 border-slate-700 text-white hover:border-slate-600 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signin" className="text-slate-200">Password</Label>
                    <Input 
                      id="password-signin" 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="current-password"
                      className="bg-slate-800 border-slate-700 text-white hover:border-slate-600 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <Button 
                    onClick={() => setResetPassword(true)} 
                    variant="link" 
                    className="p-0 h-auto font-normal text-sm text-blue-400 hover:text-blue-300"
                    type="button"
                  >
                    Forgot password?
                  </Button>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200" 
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
                    <Alert variant="destructive" className="border-red-800 bg-red-950/60 text-red-200">
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email-signup" className="text-slate-200">Email</Label>
                    <Input 
                      id="email-signup" 
                      type="email" 
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      autoComplete="email"
                      className="bg-slate-800 border-slate-700 text-white hover:border-slate-600 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signup" className="text-slate-200">Password</Label>
                    <Input 
                      id="password-signup" 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="new-password"
                      className="bg-slate-800 border-slate-700 text-white hover:border-slate-600 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
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
            
            <TabsContent value="quicklogin">
              <form onSubmit={handleQuickLogin}>
                <CardContent className="space-y-4 pt-4">
                  {errorMessage && (
                    <Alert variant="destructive" className="border-red-800 bg-red-950/60 text-red-200">
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="quick-email" className="text-slate-200">Email</Label>
                    <Input 
                      id="quick-email" 
                      type="email" 
                      placeholder="your@email.com"
                      value={quickLoginEmail}
                      onChange={(e) => setQuickLoginEmail(e.target.value)}
                      disabled={loading}
                      autoComplete="email"
                      className="bg-slate-800 border-slate-700 text-white hover:border-slate-600 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <Alert className="bg-slate-800 text-slate-200 border-slate-700">
                    <AlertDescription>
                      Quick login uses a preset password and skips email verification for easy access to the M&A Mastermind AI Assistant.
                    </AlertDescription>
                  </Alert>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : "Quick Login"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </WavyBackground>
  );
};

export default Auth;

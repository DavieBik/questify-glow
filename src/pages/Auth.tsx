import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  CheckCircle,
  Shield,
  Users,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [currentView, setCurrentView] = useState<'auth' | 'forgot'>('auth');
  const [resetEmail, setResetEmail] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
  });

  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: signInData.email,
      password: signInData.password,
    });
    
    if (error) {
      setError(error.message);
      toast.error('Sign in failed: ' + error.message);
    } else {
      toast.success('Successfully signed in!');
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: signUpData.firstName,
            last_name: signUpData.lastName,
          }
        }
      });
      
      if (error) {
        // Handle specific error cases
        if (error.message.includes('timeout') || error.message.includes('504')) {
          const message = 'Signup is taking longer than expected. Please wait a moment and try again.';
          setError(message);
          toast.error(message);
        } else if (error.message.includes('rate limit')) {
          const message = 'Too many signup attempts. Please try again in a few minutes.';
          setError(message);
          toast.error(message);
        } else {
          setError(error.message);
          toast.error('Sign up failed: ' + error.message);
        }
        setIsLoading(false);
        return;
      }

      const user = data.user;
      const identities = user?.identities ?? [];
      const isExistingAccount =
        identities.length === 0 ||
        Boolean(user?.email_confirmed_at);

      if (isExistingAccount) {
        const message = 'An account with this email already exists. Please sign in instead.';
        setError(message);
        toast.error(message);
        setMode('signin');
        setIsLoading(false);
        return;
      }

      toast.success('Check your email for a verification link to activate your account.');
      setIsLoading(false);
    } catch (err) {
      // Handle network errors
      const message = 'Network error. Please check your connection and try again.';
      setError(message);
      toast.error(message);
      console.error('Signup error:', err);
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
    const resetConfig: { redirectTo?: string } = {};

    const redirectUrl = import.meta.env.VITE_SUPABASE_RESET_REDIRECT ?? `${window.location.origin}/auth/reset-password`;
    if (redirectUrl && redirectUrl !== 'DISABLE') {
      resetConfig.redirectTo = redirectUrl;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, resetConfig);

      if (error) {
        // Handle specific error cases
        if (error.message.includes('rate limit')) {
          const message = 'Too many reset attempts. Please try again in a few minutes.';
          setError(message);
          toast.error(message);
        } else if (error.message.includes('User not found')) {
          const message = 'No account found with this email address.';
          setError(message);
          toast.error(message);
        } else {
          setError(error.message || 'Failed to send reset email');
          toast.error(error.message || 'Failed to send reset email');
        }
      } else {
        toast.success('Password reset email sent! Check your inbox.');
        setCurrentView('auth');
        setResetEmail('');
      }
    } catch (err) {
      // Handle network errors
      const message = 'Network error. Please check your connection and try again.';
      setError(message);
      toast.error(message);
      console.error('Password reset error:', err);
    }

    setIsLoading(false);
  };

  if (currentView === 'forgot') {
    return (
      <div className="min-h-screen bg-background">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:py-10">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary shadow-lg relative">
            <Building2 className="h-8 w-8 text-primary-foreground" />
            <div className="absolute -bottom-1 -right-1 rounded-full bg-background px-1.5 py-0.5 text-xs font-medium text-muted-foreground border">
              LOGO
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Diamond Care Victoria</h1>
            <p className="text-sm text-muted-foreground font-medium">Staff Portal – Secure Access for Diamond Care Victoria Employees</p>
          </div>
        </div>
          <ThemeToggle />
        </header>

        <main className="mx-auto flex max-w-md items-center justify-center px-6 pb-24">
          <Card className="w-full rounded-2xl border border-border bg-card/90 backdrop-blur shadow-elegant">
            <CardContent className="p-8">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
                  Reset Password
                </h2>
                <p className="text-muted-foreground">
                  Enter your email to receive a secure reset link
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <Label htmlFor="reset-email" className="mb-1 block text-sm font-medium text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@organisation.org"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-10 py-2.75 text-[15px] text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                </div>
                
                {error && (
                  <Alert variant="destructive" className="rounded-xl border-2">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-3">
                  <Button 
                    type="submit" 
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Email'}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full rounded-xl py-3"
                    onClick={() => setCurrentView('auth')}
                  >
                    Back to Sign In
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:py-10">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary shadow-lg">
            <Building2 className="h-8 w-8 text-primary-foreground" />
            <div className="absolute -bottom-1 -right-1 rounded-full bg-background px-1.5 py-0.5 text-xs font-medium text-muted-foreground border">
              LOGO
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Diamond Care Victoria</h1>
            <p className="text-sm text-muted-foreground font-medium">Staff Portal – Secure Access for Diamond Care Victoria Employees</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Content */}
      <main className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 px-6 pb-24 md:grid-cols-12 md:pt-4">
        {/* Left column: statement */}
        <section className="md:col-span-7 lg:col-span-7 xl:col-span-8">
          <h2 className="mb-4 text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            Professional care training, delivered with excellence
          </h2>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl mb-12">
            Empowering Diamond Care Victoria staff with comprehensive disability care training, compliance education, and professional development pathways.
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 gap-6 max-w-2xl sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">NDIS Compliant</h3>
                <p className="text-sm text-muted-foreground">Fully aligned with NDIS standards</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Person-Centered Care</h3>
                <p className="text-sm text-muted-foreground">Focused on individual needs</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Quality Assurance</h3>
                <p className="text-sm text-muted-foreground">Continuous improvement focus</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Professional Development</h3>
                <p className="text-sm text-muted-foreground">Career advancement pathways</p>
              </div>
            </div>
          </div>
        </section>

        {/* Right column: auth form */}
        <section className="md:col-span-5 lg:col-span-5 xl:col-span-4">
          <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur shadow-elegant">
            <CardContent className="p-6 sm:p-8">
              {/* Mode Toggle */}
              <div className="mb-6 inline-flex rounded-full bg-muted p-1">
                <button
                  onClick={() => setMode('signin')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    mode === 'signin' 
                      ? 'bg-background shadow-sm text-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sign in
                </button>
                <button
                  onClick={() => setMode('signup')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    mode === 'signup' 
                      ? 'bg-background shadow-sm text-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Create account
                </button>
              </div>

              {mode === 'signin' ? (
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div>
                    <Label htmlFor="signin-email" className="mb-1 block text-sm font-medium text-foreground">Email</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@organisation.org"
                        value={signInData.email}
                        onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-10 py-2.75 text-[15px] text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <Label htmlFor="signin-password" className="block text-sm font-medium text-foreground">Password</Label>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => setCurrentView('forgot')}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Your password"
                        value={signInData.password}
                        onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-10 py-2.75 text-[15px] text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive" className="rounded-xl border-2">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign in'}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </Button>
                  
                  <p className="text-center text-xs text-muted-foreground">
                    For authorised Diamond Care Victoria staff only
                  </p>
                </form>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first-name" className="mb-1 block text-sm font-medium text-foreground">First Name</Label>
                      <Input
                        id="first-name"
                        placeholder="First name"
                        value={signUpData.firstName}
                        onChange={(e) => setSignUpData({ ...signUpData, firstName: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.75 text-[15px] text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="last-name" className="mb-1 block text-sm font-medium text-foreground">Last Name</Label>
                      <Input
                        id="last-name"
                        placeholder="Last name"
                        value={signUpData.lastName}
                        onChange={(e) => setSignUpData({ ...signUpData, lastName: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.75 text-[15px] text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-foreground">Email</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@organisation.org"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-10 py-2.75 text-[15px] text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-foreground">Password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showSignUpPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-10 py-2.75 text-[15px] text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Password must be at least 6 characters long
                    </p>
                  </div>
                  
                  {error && (
                    <Alert variant="destructive" className="rounded-xl border-2">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating account...' : 'Create account'}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </Button>
                </form>
              )}

              <div className="pt-2 space-y-1 text-center">
                <p className="text-xs text-muted-foreground">
                  Powered by <span className="font-semibold text-primary">Skillbridge App</span>
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground/70">
                  By continuing you agree to our Terms and Privacy Policy.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SkillBridge LMS
      </footer>
    </div>
  );
};

export default Auth;


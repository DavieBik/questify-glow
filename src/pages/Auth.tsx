import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  Star,
  Shield,
  Users,
  BookOpen,
  Award,
  TrendingUp,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const Auth = () => {
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [currentView, setCurrentView] = useState<'auth' | 'forgot'>('auth');
  const [resetEmail, setResetEmail] = useState('');

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

    const { error } = await signIn(signInData.email, signInData.password);
    
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

    const { error } = await signUp(
      signUpData.email, 
      signUpData.password, 
      signUpData.firstName, 
      signUpData.lastName
    );
    
    if (error) {
      setError(error.message);
      toast.error('Sign up failed: ' + error.message);
    } else {
      toast.success('Check your email for verification link!');
    }
    
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
      toast.error('Reset failed: ' + error.message);
    } else {
      toast.success('Password reset email sent! Check your inbox.');
      setCurrentView('auth');
      setResetEmail('');
    }

    setIsLoading(false);
  };

  const testimonials = [
    {
      quote: "SkillBridge transformed our team's capabilities. The structured learning paths and real-time progress tracking made all the difference.",
      author: "Sarah Chen",
      role: "Learning Director",
      company: "TechCorp"
    },
    {
      quote: "The gamification features keep our employees engaged. We've seen a 300% increase in course completion rates.",
      author: "Marcus Rodriguez", 
      role: "HR Manager",
      company: "InnovateLabs"
    },
    {
      quote: "Best LMS platform we've used. The analytics dashboard gives us incredible insights into learning effectiveness.",
      author: "Emma Thompson",
      role: "Training Manager", 
      company: "GlobalTech"
    }
  ];

  const features = [
    { icon: BookOpen, text: "Interactive Learning Paths" },
    { icon: Award, text: "Certification Management" },
    { icon: TrendingUp, text: "Advanced Analytics" },
    { icon: Users, text: "Team Collaboration" },
    { icon: Shield, text: "Enterprise Security" },
    { icon: Sparkles, text: "AI-Powered Insights" }
  ];

  if (currentView === 'forgot') {
    return (
      <div className="min-h-screen bg-gradient-hero flex">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
        
        <div className="flex-1 flex items-center justify-center p-4 relative z-10">
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          
          <Card className="w-full max-w-md glass animate-slide-up shadow-elegant">
            <CardContent className="p-8">
              <div className="text-center space-y-6 mb-8">
                <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
                  <GraduationCap className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Reset Password
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Enter your email to receive a secure reset link
                  </p>
                </div>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-sm font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="Enter your email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="pl-10 h-12 border-2 focus:border-primary transition-colors"
                      required
                    />
                  </div>
                </div>
                
                {error && (
                  <Alert variant="destructive" className="border-2">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-3">
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-primary hover:shadow-glow transition-all duration-300" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Email'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full h-12 hover:bg-muted/50"
                    onClick={() => setCurrentView('auth')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Sign In
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
      
      {/* Left Side - Branding & Testimonials */}
      <div className="hidden lg:flex lg:flex-1 relative z-10 flex-col justify-between p-12">
        <div className="absolute top-8 right-8">
          <ThemeToggle />
        </div>
        
        {/* Logo & Branding */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">SkillBridge</h1>
                <p className="text-white/80 text-sm">Professional Learning Platform</p>
              </div>
            </div>
            
            <div className="max-w-md">
              <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                Accelerate Your Team's Growth
              </h2>
              <p className="text-white/90 text-lg leading-relaxed">
                Transform learning into measurable business outcomes with our comprehensive LMS platform.
              </p>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-4 max-w-md">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-3 text-white/90">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <feature.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center space-x-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
            ))}
          </div>
          <blockquote className="text-white/95 text-sm leading-relaxed mb-4">
            "{testimonials[0].quote}"
          </blockquote>
          <div className="text-white/80 text-xs">
            <div className="font-semibold">{testimonials[0].author}</div>
            <div>{testimonials[0].role}, {testimonials[0].company}</div>
          </div>
        </div>
      </div>

      {/* Right Side - Authentication Form */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-4 relative z-10">
        {/* Mobile Theme Toggle */}
        <div className="lg:hidden absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <Card className="w-full max-w-md glass animate-slide-up shadow-elegant">
          <CardContent className="p-8">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center space-y-4 mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
                <GraduationCap className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  SkillBridge
                </h1>
                <p className="text-muted-foreground">Professional Learning Platform</p>
              </div>
              <div className="flex justify-center gap-2">
                <Badge variant="secondary" className="text-xs bg-gradient-primary text-primary-foreground border-0">
                  <Shield className="w-3 h-3 mr-1" />
                  Enterprise Ready
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Trusted by 10K+
                </Badge>
              </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:block text-center space-y-4 mb-8">
              <h2 className="text-2xl font-bold">Welcome Back</h2>
              <p className="text-muted-foreground">Sign in to continue your learning journey</p>
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-muted/50">
                <TabsTrigger 
                  value="signin" 
                  className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-6">
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-sm font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signInData.email}
                        onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                        className="pl-10 h-12 border-2 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={signInData.password}
                        onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                        className="pl-10 pr-10 h-12 border-2 focus:border-primary transition-colors"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-primary hover:text-primary/80 p-0 h-auto"
                      onClick={() => setCurrentView('forgot')}
                    >
                      Forgot password?
                    </Button>
                  </div>

                  {error && (
                    <Alert variant="destructive" className="border-2">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-primary hover:shadow-glow transition-all duration-300" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-6">
                <form onSubmit={handleSignUp} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name" className="text-sm font-medium">First Name</Label>
                      <Input
                        id="first-name"
                        placeholder="First name"
                        value={signUpData.firstName}
                        onChange={(e) => setSignUpData({ ...signUpData, firstName: e.target.value })}
                        className="h-12 border-2 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name" className="text-sm font-medium">Last Name</Label>
                      <Input
                        id="last-name"
                        placeholder="Last name"
                        value={signUpData.lastName}
                        onChange={(e) => setSignUpData({ ...signUpData, lastName: e.target.value })}
                        className="h-12 border-2 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                        className="pl-10 h-12 border-2 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showSignUpPassword ? "text" : "password"}
                        placeholder="Create a secure password (min. 6 characters)"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        className="pl-10 pr-10 h-12 border-2 focus:border-primary transition-colors"
                        minLength={6}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      >
                        {showSignUpPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 6 characters long
                    </p>
                  </div>
                  
                  {error && (
                    <Alert variant="destructive" className="border-2">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-primary hover:shadow-glow transition-all duration-300" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
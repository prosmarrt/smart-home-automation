import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import logoImage from '/prosmart-logo.png';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Trim whitespace from inputs
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    
    if (!trimmedUsername || !password || !confirmPassword) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      // Find invalid characters for better error message
      const invalidChars = trimmedUsername.match(/[^a-zA-Z0-9_]/g);
      const invalidCharsStr = invalidChars ? [...new Set(invalidChars)].join(', ') : 'unknown';
      
      toast({
        title: 'Invalid Username',
        description: `Username can only contain letters, digits, and underscores. Invalid characters found: ${invalidCharsStr}`,
        variant: 'destructive',
      });
      return;
    }

    // Validate email if provided
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    // Validate phone if provided
    if (trimmedPhone && !/^\+?[1-9]\d{1,14}$/.test(trimmedPhone.replace(/[\s-]/g, ''))) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid phone number (e.g., +1234567890)',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await authApi.signUp(
        trimmedUsername, 
        password, 
        trimmedEmail || undefined, 
        trimmedPhone || undefined
      );
      setIsSuccess(true);
      toast({
        title: 'Success',
        description: email 
          ? 'Account created! Please check your email to verify your account.'
          : 'Account created successfully! Waiting for admin approval.',
      });
    } catch (error) {
      console.error('Signup error:', error);
      let errorMessage = 'Failed to create account';
      
      if (error instanceof Error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          errorMessage = 'This username or email is already taken. Please choose another.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Signup Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isSuccess ? (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-center">Account Created!</CardTitle>
              <CardDescription className="text-center">
                {email ? 'Please verify your email' : 'Your account is pending approval'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {email ? (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    We've sent a verification email to <strong>{email}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground text-center">
                    Please check your inbox and click the verification link to activate your account.
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    Didn't receive the email? Check your spam folder or contact support.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    Your account has been created successfully. An administrator will review and approve your account shortly.
                  </p>
                  <p className="text-sm text-muted-foreground text-center">
                    You will be able to log in once your account is approved.
                  </p>
                </>
              )}
              <Button 
                onClick={() => navigate('/login')} 
                className="w-full"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img 
              src={logoImage} 
              alt="Prosmart Egypt Logo" 
              className="h-16 w-auto object-contain"
              onError={(e) => {
                console.error('Logo failed to load');
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
          <CardDescription className="text-center">
            Sign up for Smart Home Automation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
              />
              <p className="text-xs text-muted-foreground">
                Only letters, digits, and underscores allowed
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
              />
              <p className="text-xs text-muted-foreground">
                Provide email for account verification and notifications
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
                autoComplete="tel"
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +20 for Egypt)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="sr-only">
                    {showPassword ? 'Hide password' : 'Show password'}
                  </span>
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="sr-only">
                    {showConfirmPassword ? 'Hide password' : 'Show password'}
                  </span>
                </Button>
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Button
              variant="link"
              className="p-0 h-auto font-semibold"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
          </div>
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground text-center">
              ℹ️ Your account will need to be approved by an administrator before you can log in.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
      )}
    </>
  );
}

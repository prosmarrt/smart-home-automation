import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import logoImage from '/prosmart-logo.png';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Trim whitespace from username
    const trimmedUsername = username.trim();
    
    if (!trimmedUsername || !password) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    // Validate username (only letters, digits, and underscore)
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

    setIsLoading(true);
    try {
      await authApi.signIn(trimmedUsername, password);
      toast({
        title: 'Success',
        description: 'Logged in successfully',
      });
      setTimeout(() => {
        navigate('/');
      }, 100);
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Invalid username or password';
      
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error name:', error.name);
        
        // Handle network errors
        if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection and try again.';
        } else if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid username or password. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please confirm your email before logging in.';
        } else if (error.message.includes('User not found')) {
          errorMessage = 'User not found. Please sign up first.';
        } else if (error.message.includes('NetworkError') || error.message.includes('network')) {
          errorMessage = 'Network error: Please check your internet connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
          <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Sign in to your Smart Home Automation account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Button
              variant="link"
              className="p-0 h-auto font-semibold"
              onClick={() => navigate('/signup')}
            >
              Sign Up
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

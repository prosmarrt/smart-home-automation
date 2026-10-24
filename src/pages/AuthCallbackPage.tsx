import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const navigate = useNavigate();

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Get the hash from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        if (type === 'signup' && accessToken) {
          // Set the session with the access token
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          });

          if (error) throw error;

          setStatus('success');
          setMessage('Email verified successfully! You can now log in.');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else if (type === 'recovery') {
          setStatus('success');
          setMessage('Password reset link verified. Please set your new password.');
          setTimeout(() => {
            navigate('/reset-password');
          }, 2000);
        } else {
          throw new Error('Invalid verification link');
        }
      } catch (error) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Failed to verify email. The link may be expired or invalid.');
      }
    };

    handleEmailVerification();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            )}
            {status === 'success' && (
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="rounded-full bg-red-100 p-3">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            {status === 'loading' && 'Verifying Email'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription className="text-center">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && (
            <p className="text-sm text-muted-foreground text-center">
              Redirecting you to the login page...
            </p>
          )}
          {status === 'error' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Please try signing up again or contact support if the problem persists.
              </p>
              <Button 
                onClick={() => navigate('/signup')} 
                className="w-full"
              >
                Back to Sign Up
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

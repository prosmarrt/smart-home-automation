import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, isApproved, isLoading, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admins bypass approval check - they always have access
  if (!isApproved && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-6 w-6" />
              <CardTitle>Approval Required</CardTitle>
            </div>
            <CardDescription>
              Your account is pending approval
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your account has been created successfully, but it needs to be approved by an administrator before you can access the system.
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact your system administrator for approval.
            </p>
            <Button 
              onClick={signOut} 
              variant="outline" 
              className="w-full"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

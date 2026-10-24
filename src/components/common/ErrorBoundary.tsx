import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    // Clear cache and reload
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }
    window.location.reload();
  };

  private handleClearStorage = () => {
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    this.handleReload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-background">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <CardTitle>Application Error</CardTitle>
              </div>
              <CardDescription>
                Something went wrong while loading the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm font-mono text-muted-foreground">
                  {this.state.error?.message || 'Unknown error'}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Quick Fixes:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Clear your browser cache and reload (Ctrl+Shift+R or Cmd+Shift+R)</li>
                  <li>Try opening the app in an incognito/private window</li>
                  <li>Check your internet connection</li>
                  <li>Verify the database is accessible</li>
                </ol>
              </div>

              <div className="flex gap-2">
                <Button onClick={this.handleReload} variant="default">
                  Reload Application
                </Button>
                <Button onClick={this.handleClearStorage} variant="outline">
                  Clear Storage & Reload
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                <p>If the problem persists:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>Check the browser console (F12) for detailed errors</li>
                  <li>See QUICK_FIX_GUIDE.md for troubleshooting steps</li>
                  <li>Contact support with the error message above</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

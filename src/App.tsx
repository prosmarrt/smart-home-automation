import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Header from '@/components/common/Header';
import { Toaster } from '@/components/ui/toaster';
import routes from './routes';
import { keepAliveService } from '@/services/keepAliveService';

// Minimal loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App: React.FC = () => {
  useEffect(() => {
    // Start global backend keep-alive heartbeat
    keepAliveService.start();

    return () => {
      keepAliveService.stop();
    };
  }, []);

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {routes.map((route, index) => {
                  const Component = route.component;
                  const element = route.protected ? (
                    <ProtectedRoute requireAdmin={route.requireAdmin}>
                      <Component />
                    </ProtectedRoute>
                  ) : (
                    <Component />
                  );
                  
                  return (
                    <Route
                      key={index}
                      path={route.path}
                      element={element}
                    />
                  );
                })}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>
        <Toaster />
      </AuthProvider>
    </Router>
  );
};

export default App;

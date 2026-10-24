import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Shield } from "lucide-react";
import { profileApi } from "@/db/api";
import routes from "../../routes";
import logoImage from "/prosmart-logo.png";
import BackendStatusBadge from "./BackendStatusBadge";

const Header: React.FC = () => {
  const location = useLocation();

  // Don't show header on login/signup/home pages (home page has its own header)
  if (location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/') {
    return null;
  }

  // Use React.Suspense boundary to ensure auth context is ready
  return (
    <React.Suspense fallback={null}>
      <HeaderContent />
    </React.Suspense>
  );
};

const HeaderContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigation = routes.filter((route) => route.visible !== false);

  // CRITICAL: All hooks must be called before any conditional returns
  useEffect(() => {
    if (isAdmin) {
      loadPendingCount();
      // Refresh count every 30 seconds when tab is active
      const interval = setInterval(() => {
        if (!document.hidden) {
          loadPendingCount();
        }
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  // Don't render if user is not loaded yet
  if (!user) {
    return null;
  }

  const loadPendingCount = async () => {
    try {
      const profiles = await profileApi.getAllProfiles();
      const pending = profiles.filter(p => !p.approved).length;
      setPendingCount(pending);
    } catch (error) {
      console.error('Failed to load pending count:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-10">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <img 
                src={logoImage} 
                alt="Prosmart Egypt Logo" 
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  console.error('Logo failed to load from:', e.currentTarget.src);
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="text-xl font-bold text-[#10639fff]">Prosmart Egypt</span>
            </Link>
            <div className="md:hidden">
              <BackendStatusBadge />
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <BackendStatusBadge showLatency={true} />
            {navigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 text-base font-medium rounded-md ${
                  location.pathname === item.path
                    ? "text-primary bg-primary/10"
                    : "text-foreground hover:text-primary hover:bg-muted"
                } transition duration-300`}
              >
                {item.name}
              </Link>
            ))}

            {isAdmin && (
              <Link to="/admin" className="relative">
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin
                  {pendingCount > 0 && (
                    <Badge 
                      className="ml-2 bg-red-600 text-white hover:bg-red-700 px-1.5 py-0 h-5 min-w-5 flex items-center justify-center"
                    >
                      {pendingCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            )}

            {user && (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-foreground uppercase">
                    {profile?.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isAdmin ? 'Admin' : 'User'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="bg-[#0962aee6] bg-none">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;

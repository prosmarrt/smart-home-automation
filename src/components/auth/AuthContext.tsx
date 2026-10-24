import { createContext, useContext, useEffect, useState } from 'react';
import { authApi, profileApi } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { Profile } from '@/types/types';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  isAdmin: false,
  isApproved: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const initAuth = async () => {
      try {
        const currentUser = await authApi.getUser();
        if (!isActive) return;

        setUser(currentUser);

        if (currentUser) {
          // Load profile
          try {
            const userProfile = await profileApi.getProfile();
            if (isActive) setProfile(userProfile);
          } catch (error) {
            console.error('Failed to load profile:', error);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    // Timeout safety net — 5 seconds to allow profile fetch to complete
    const timeout = setTimeout(() => {
      if (isActive) {
        console.warn('Auth check timeout');
        setIsLoading(false);
      }
    }, 5000);

    initAuth().finally(() => clearTimeout(timeout));

    // Listen to Supabase auth events — Supabase SDK automatically manages token refresh natively
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isActive) return;

      if (session?.user) {
        setUser(session.user);

        if (event === 'SIGNED_IN') {
          profileApi.getProfile()
            .then(userProfile => { if (isActive) setProfile(userProfile); })
            .catch(error => console.error('Failed to load profile:', error));
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      isActive = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await profileApi.getProfile();
      setProfile(userProfile);
    }
  };

  const signOut = async () => {
    await authApi.signOut();
    setUser(null);
    setProfile(null);
  };

  const isAdmin = profile?.role === 'admin';
  const isApproved = profile?.approved === true;

  // Always keep the Provider mounted so context consumers get real values.
  // ProtectedRoute handles the loading spinner for protected pages.
  return (
    <AuthContext.Provider value={{ user, profile, isLoading, isAdmin, isApproved, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

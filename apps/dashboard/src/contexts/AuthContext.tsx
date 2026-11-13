import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { isFirebaseConfigured } from '../config/firebase';
import { signIn, signOutUser, checkCounselorClaim } from '../services/authService';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isCounselor: boolean;
  isDemoMode: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCounselor, setIsCounselor] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDemoMode = !isFirebaseConfigured();

  // Listen to auth state changes
  useEffect(() => {
    if (isDemoMode) {
      // In demo mode, auto-authenticate
      setLoading(false);
      return;
    }

    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const hasCounselorRole = await checkCounselorClaim(firebaseUser);
        setIsCounselor(hasCounselorRole);
      } else {
        setIsCounselor(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [isDemoMode]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);

    if (isDemoMode) {
      // In demo mode, simulate successful login
      setIsCounselor(true);
      return;
    }

    try {
      const credential = await signIn(email, password);
      const hasCounselorRole = await checkCounselorClaim(credential.user);

      if (!hasCounselorRole) {
        await signOutUser();
        throw new Error('This account does not have counselor access. Please contact your administrator.');
      }

      setIsCounselor(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
      throw err;
    }
  }, [isDemoMode]);

  const logout = useCallback(async () => {
    setError(null);

    if (isDemoMode) {
      setIsCounselor(false);
      return;
    }

    try {
      await signOutUser();
      setUser(null);
      setIsCounselor(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed.';
      setError(message);
    }
  }, [isDemoMode]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    isAuthenticated: isDemoMode ? isCounselor : !!user,
    isCounselor: isDemoMode ? isCounselor : isCounselor,
    isDemoMode,
    error,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

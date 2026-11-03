import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getMe,
  loginUser,
  logoutUser,
  registerUser,
  updateProfile,
  usernameFromName,
} from './api';
import { clearSession, loadSession, saveSession, saveUser } from './session';
import type { PublicUser } from './types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<PublicUser | null>;
  setUser: (user: PublicUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUserState] = useState<PublicUser | null>(null);

  const setUser = useCallback((next: PublicUser) => {
    setUserState(next);
    void saveUser(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const stored = await loadSession();
      if (!stored) {
        if (!cancelled) setStatus('unauthenticated');
        return;
      }

      // Show the cached profile immediately; /auth/me revalidates it.
      if (stored.user && !cancelled) setUserState(stored.user);

      try {
        const me = await getMe();
        if (cancelled) return;
        setUserState(me);
        await saveUser(me);
        setStatus('authenticated');
      } catch (err) {
        if (cancelled) return;
        const status = (err as { status?: number }).status;
        if (status === 401 || status === 403) {
          await clearSession();
          setUserState(null);
          setStatus('unauthenticated');
          return;
        }
        // Offline with a cached profile: let the app open, requests will
        // surface their own errors.
        if (stored.user) {
          setStatus('authenticated');
        } else {
          setStatus('unauthenticated');
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await loginUser(email, password);
    await saveSession(session.accessToken, session.refreshToken, session.user);
    setUserState(session.user);
    setStatus('authenticated');
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const displayName = name.trim();
    const username = usernameFromName(displayName, email.trim());
    // Register derives `name` from the handle, so set the real display name
    // immediately afterwards. A failure here is cosmetic, not a failed signup.
    await registerUser(username, email, password);
    const session = await loginUser(email, password);
    await saveSession(session.accessToken, session.refreshToken, session.user);

    let me = session.user;
    try {
      me = await updateProfile({ name: displayName });
      await saveUser(me);
    } catch {
      // Keep the handle-derived name rather than blocking the account.
    }

    setUserState(me);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    await logoutUser();
    setUserState(null);
    setStatus('unauthenticated');
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const me = await getMe();
      setUserState(me);
      await saveUser(me);
      return me;
    } catch {
      return null;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signUp, signOut, refreshProfile, setUser }),
    [status, user, signIn, signUp, signOut, refreshProfile, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  clearStoredSession,
  getMe,
  hasStoredSession,
  loadStoredUser,
  loginUser,
  logoutUser,
  registerUser,
  updateProfile,
  updateStoredUser,
  usernameFromName,
  type PublicUser,
} from './api'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  status: AuthStatus
  user: PublicUser | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<PublicUser | null>
  setUser: (user: PublicUser) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Mirrors mobile/lib/auth.tsx: hydrate the cached profile immediately, then
 * revalidate with GET /auth/me. A 401/403 clears the session; a network error
 * keeps a cached profile so the page still renders offline.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUserState] = useState<PublicUser | null>(null)

  const setUser = useCallback((next: PublicUser) => {
    setUserState(next)
    updateStoredUser(next)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!hasStoredSession()) {
        if (!cancelled) setStatus('unauthenticated')
        return
      }

      const cached = loadStoredUser()
      if (cached && !cancelled) setUserState(cached)

      try {
        const me = await getMe()
        if (cancelled) return
        setUserState(me)
        updateStoredUser(me)
        setStatus('authenticated')
      } catch (err) {
        if (cancelled) return
        const code = (err as { status?: number }).status
        if (code === 401 || code === 403) {
          clearStoredSession()
          setUserState(null)
          setStatus('unauthenticated')
          return
        }
        // Offline with a cached profile: let the page open; requests surface
        // their own errors.
        setStatus(cached ? 'authenticated' : 'unauthenticated')
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await loginUser(email, password)
    setUserState(session.user)
    setStatus('authenticated')
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const displayName = name.trim()
    const username = usernameFromName(displayName, email.trim())
    // Register derives `name` from the handle, so set the real display name
    // immediately afterwards. A failure here is cosmetic, not a failed signup.
    await registerUser(username, email, password)
    const session = await loginUser(email, password)

    let me = session.user
    try {
      me = await updateProfile({ name: displayName })
      updateStoredUser(me)
    } catch {
      // Keep the handle-derived name rather than blocking the account.
    }

    setUserState(me)
    setStatus('authenticated')
  }, [])

  const signOut = useCallback(async () => {
    await logoutUser()
    setUserState(null)
    setStatus('unauthenticated')
  }, [])

  const refreshProfile = useCallback(async () => {
    try {
      const me = await getMe()
      setUserState(me)
      updateStoredUser(me)
      return me
    } catch {
      return null
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signUp, signOut, refreshProfile, setUser }),
    [status, user, signIn, signUp, signOut, refreshProfile, setUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return context
}

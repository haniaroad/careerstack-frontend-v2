import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { authStubEnabled } from '@/config'
import { apiFetch, setApiTokenProvider } from '@/lib/api'
import {
  firebaseSignOut,
  getFirebaseAuth,
  getIdToken,
} from '@/lib/firebase'
import type { AuthStatus, SessionPayload } from './types'

type AuthContextValue = {
  status: AuthStatus
  firebaseUser: FirebaseUser | null
  session: SessionPayload | null
  refreshSession: () => Promise<SessionPayload | null>
  setSession: (session: SessionPayload | null) => void
  signOut: () => Promise<void>
  /** Test/local stub sign-in without Firebase */
  stubSignIn: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STUB_TOKEN_KEY = 'careerstack.stubToken'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [session, setSession] = useState<SessionPayload | null>(null)

  const refreshSession = useCallback(async () => {
    try {
      const next = await apiFetch<SessionPayload>('/api/v1/session')
      setSession(next)
      return next
    } catch {
      setSession(null)
      return null
    }
  }, [])

  useEffect(() => {
    setApiTokenProvider(async () => {
      if (authStubEnabled()) {
        return window.localStorage.getItem(STUB_TOKEN_KEY)
      }
      return getIdToken()
    })
  }, [])

  useEffect(() => {
    const onUnauthorized = () => {
      void firebaseSignOut()
      window.localStorage.removeItem(STUB_TOKEN_KEY)
      setFirebaseUser(null)
      setSession(null)
      setStatus('anonymous')
    }
    window.addEventListener('careerstack:unauthorized', onUnauthorized)
    return () => window.removeEventListener('careerstack:unauthorized', onUnauthorized)
  }, [])

  useEffect(() => {
    if (authStubEnabled()) {
      const stub = window.localStorage.getItem(STUB_TOKEN_KEY)
      if (!stub) {
        setStatus('anonymous')
        return
      }
      setStatus('authenticated')
      void refreshSession()
      return
    }

    const auth = getFirebaseAuth()
    if (!auth) {
      setStatus('anonymous')
      return
    }

    return onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user)
      if (!user) {
        setSession(null)
        setStatus('anonymous')
        return
      }
      setStatus('authenticated')
      void refreshSession()
    })
  }, [refreshSession])

  const stubSignIn = useCallback(
    async (email: string) => {
      const uid = `stub-${email.replace(/[^a-z0-9]/gi, '-')}`
      window.localStorage.setItem(STUB_TOKEN_KEY, `test:${uid}:${email}`)
      setStatus('authenticated')
      await refreshSession()
    },
    [refreshSession],
  )

  const signOut = useCallback(async () => {
    window.localStorage.removeItem(STUB_TOKEN_KEY)
    await firebaseSignOut()
    setFirebaseUser(null)
    setSession(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo(
    () => ({
      status,
      firebaseUser,
      session,
      refreshSession,
      setSession,
      signOut,
      stubSignIn,
    }),
    [firebaseUser, refreshSession, session, signOut, status, stubSignIn],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

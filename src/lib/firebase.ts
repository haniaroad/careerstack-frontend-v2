import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  initializeAuth,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'
import { firebaseConfig, isFirebaseConfigured } from '@/config'

let app: FirebaseApp | null = null
let auth: Auth | null = null

function isIndexedDbPersistenceError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return /database is closing|indexeddb|idbdatabase|idb/i.test(message)
}

/**
 * Prefer localStorage persistence over IndexedDB.
 * Chrome/local-dev often hits Firebase's "Database is closing/hidden" IndexedDB bug
 * during popup auth; localStorage avoids that path.
 */
export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured()) return null
  if (auth) return auth

  app = getApps()[0] ?? initializeApp(firebaseConfig())
  try {
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    })
  } catch {
    // initializeAuth throws if auth was already initialized (HMR / double mount).
    auth = getAuth(app)
  }
  return auth
}

export type GoogleSignInResult =
  | { method: 'popup'; user: User }
  | { method: 'redirect' }

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const firebaseAuth = getFirebaseAuth()
  if (!firebaseAuth) throw new Error('Firebase is not configured')
  const provider = new GoogleAuthProvider()

  try {
    const result = await signInWithPopup(firebaseAuth, provider)
    return { method: 'popup', user: result.user }
  } catch (err) {
    if (!isIndexedDbPersistenceError(err)) throw err
    // Popup persistence failed — full-page redirect avoids the broken IndexedDB path.
    await signInWithRedirect(firebaseAuth, provider)
    return { method: 'redirect' }
  }
}

/** Complete a Google redirect return (no-op when there was no redirect). */
export async function completeGoogleRedirect(): Promise<User | null> {
  const firebaseAuth = getFirebaseAuth()
  if (!firebaseAuth) return null
  try {
    const result = await getRedirectResult(firebaseAuth)
    return result?.user ?? null
  } catch (err) {
    if (isIndexedDbPersistenceError(err)) {
      throw new Error(
        'Browser storage blocked Firebase Auth. Clear site data for localhost:5173, hard-refresh, and try again.',
      )
    }
    throw err
  }
}

export async function requestMagicLink(email: string): Promise<void> {
  const firebaseAuth = getFirebaseAuth()
  if (!firebaseAuth) throw new Error('Firebase is not configured')
  const actionCodeSettings = {
    url: `${window.location.origin}/auth/complete`,
    handleCodeInApp: true,
  }
  window.localStorage.setItem('careerstack.emailForSignIn', email)
  try {
    await sendSignInLinkToEmail(firebaseAuth, email, actionCodeSettings)
  } catch (err) {
    if (isIndexedDbPersistenceError(err)) {
      throw new Error(
        'Browser storage blocked Firebase Auth. Clear site data for localhost:5173, hard-refresh, and try again.',
      )
    }
    throw err
  }
}

export async function completeMagicLink(email?: string): Promise<User> {
  const firebaseAuth = getFirebaseAuth()
  if (!firebaseAuth) throw new Error('Firebase is not configured')
  if (!isSignInWithEmailLink(firebaseAuth, window.location.href)) {
    throw new Error('Invalid or expired sign-in link')
  }
  const resolved =
    email ||
    window.localStorage.getItem('careerstack.emailForSignIn') ||
    window.prompt('Confirm your email for sign-in') ||
    ''
  if (!resolved) throw new Error('Email is required to complete magic link sign-in')
  try {
    const result = await signInWithEmailLink(firebaseAuth, resolved, window.location.href)
    window.localStorage.removeItem('careerstack.emailForSignIn')
    return result.user
  } catch (err) {
    if (isIndexedDbPersistenceError(err)) {
      throw new Error(
        'Browser storage blocked Firebase Auth. Clear site data for localhost:5173, hard-refresh, and try again.',
      )
    }
    throw err
  }
}

export async function firebaseSignOut(): Promise<void> {
  const firebaseAuth = getFirebaseAuth()
  if (firebaseAuth) await signOut(firebaseAuth)
}

export async function getIdToken(): Promise<string | null> {
  const firebaseAuth = getFirebaseAuth()
  const user = firebaseAuth?.currentUser
  if (!user) return null
  return user.getIdToken()
}

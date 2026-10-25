import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  initializeAuth,
  isSignInWithEmailLink,
  reauthenticateWithPopup,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'
import { firebaseConfig, isFirebaseConfigured } from '@/config'
import { isSafeReturnTo, peekReturnTo } from '@/lib/publicSurfaces'

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

export async function requestMagicLink(email: string, returnTo?: string | null): Promise<void> {
  const firebaseAuth = getFirebaseAuth()
  if (!firebaseAuth) throw new Error('Firebase is not configured')
  const continueUrl = new URL(`${window.location.origin}/auth/complete`)
  const resume = (returnTo && isSafeReturnTo(returnTo) ? returnTo : null) ?? peekReturnTo()
  if (resume) continueUrl.searchParams.set('returnTo', resume)
  const actionCodeSettings = {
    url: continueUrl.toString(),
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

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const firebaseAuth = getFirebaseAuth()
  const user = firebaseAuth?.currentUser
  if (!user) return null
  return user.getIdToken(forceRefresh)
}

export type StaffReauthResult = 'popup' | 'redirect' | 'magic_link'

/**
 * Interactive sign-in that updates Firebase auth_time.
 * A token refresh leaves auth_time unchanged, so high-risk staff actions stay rejected.
 */
export async function reauthenticateCurrentUser(): Promise<StaffReauthResult> {
  const firebaseAuth = getFirebaseAuth()
  const user = firebaseAuth?.currentUser
  if (!firebaseAuth || !user) throw new Error('Sign in before this action')

  const usesGoogle = user.providerData.some((provider) => provider.providerId === 'google.com')
  if (usesGoogle) {
    const provider = new GoogleAuthProvider()
    try {
      await reauthenticateWithPopup(user, provider)
      const token = await getIdToken(true)
      if (!token) throw new Error('Sign in before this action')
      return 'popup'
    } catch (err) {
      if (!isIndexedDbPersistenceError(err)) throw err
      await signInWithRedirect(firebaseAuth, provider)
      return 'redirect'
    }
  }

  const email = user.email
  if (!email) throw new Error('Sign in again from the sign-in page')
  const returnTo = `${window.location.pathname}${window.location.search}`
  await requestMagicLink(email, returnTo)
  return 'magic_link'
}

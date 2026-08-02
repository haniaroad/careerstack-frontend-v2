import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'
import { firebaseConfig, isFirebaseConfigured } from '@/config'

let app: FirebaseApp | null = null
let auth: Auth | null = null

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured()) return null
  if (!app) {
    app = initializeApp(firebaseConfig())
    auth = getAuth(app)
  }
  return auth
}

export async function signInWithGoogle(): Promise<User> {
  const firebaseAuth = getFirebaseAuth()
  if (!firebaseAuth) throw new Error('Firebase is not configured')
  const result = await signInWithPopup(firebaseAuth, new GoogleAuthProvider())
  return result.user
}

export async function requestMagicLink(email: string): Promise<void> {
  const firebaseAuth = getFirebaseAuth()
  if (!firebaseAuth) throw new Error('Firebase is not configured')
  const actionCodeSettings = {
    url: `${window.location.origin}/auth/complete`,
    handleCodeInApp: true,
  }
  window.localStorage.setItem('careerstack.emailForSignIn', email)
  await sendSignInLinkToEmail(firebaseAuth, email, actionCodeSettings)
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
  const result = await signInWithEmailLink(firebaseAuth, resolved, window.location.href)
  window.localStorage.removeItem('careerstack.emailForSignIn')
  return result.user
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

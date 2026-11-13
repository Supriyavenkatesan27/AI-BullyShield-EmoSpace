import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { auth } from '../config/firebase';

/** Friendly error messages for Firebase auth error codes. */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/user-disabled': 'This account has been disabled. Contact your administrator.',
  'auth/invalid-credential': 'Invalid email or password. Please try again.',
  'auth/network-request-failed': 'Network error. Please check your internet connection.',
};

/**
 * Sign in a counselor with email and password.
 * Returns the UserCredential on success, or throws with a friendly message.
 */
export async function signIn(email: string, password: string): Promise<UserCredential> {
  if (!auth) {
    throw new Error('Firebase is not configured. Please set up your environment variables.');
  }

  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error: unknown) {
    const code = (error as { code?: string }).code || '';
    const message = AUTH_ERROR_MESSAGES[code] || 'Login failed. Please try again.';
    throw new Error(message);
  }
}

/** Sign out the current user. */
export async function signOutUser(): Promise<void> {
  if (!auth) return;
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw new Error('Failed to sign out. Please try again.');
  }
}

/** Get the current authenticated user, or null. */
export function getCurrentUser(): User | null {
  return auth?.currentUser ?? null;
}

/**
 * Check if the current user has the counselor custom claim.
 * Falls back to true in demo mode (Firebase not configured).
 */
export async function checkCounselorClaim(user: User | null): Promise<boolean> {
  if (!user) return false;

  try {
    const tokenResult = await user.getIdTokenResult();
    return tokenResult.claims.role === 'counselor' || tokenResult.claims.role === 'admin' || tokenResult.claims.counselor === true;
  } catch {
    // If we can't get claims, assume not a counselor
    return false;
  }
}

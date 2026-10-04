import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type ParsedToken,
} from 'firebase/auth';
import { auth } from './firebase';

/**
 * Sign in dengan username (panggilan) dan password
 * Email sintetis: {panggilan}@asrama.com
 */
export const signIn = async (username: string, password: string): Promise<User> => {
  const email = `${username.trim().toLowerCase()}@asrama.com`;
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

/**
 * Sign out user
 */
export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

/**
 * Get current user
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

/**
 * Subscribe to auth state changes
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Get user role dari custom claims
 */
export const getUserRole = async (): Promise<'coach' | 'member'> => {
  const user = auth.currentUser;
  if (!user) return 'member';
  
  const idTokenResult = await user.getIdTokenResult();
  const claims = idTokenResult.claims as ParsedToken & { role?: string };
  
  return claims.role === 'coach' ? 'coach' : 'member';
};

/**
 * Get user slug (panggilan/UID)
 */
export const getUserSlug = (): string | null => {
  const user = auth.currentUser;
  return user?.uid || null;
};

/**
 * Check if user is coach
 */
export const isCoach = async (): Promise<boolean> => {
  const role = await getUserRole();
  return role === 'coach';
};

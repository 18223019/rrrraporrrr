/**
 * useUserProfile Hook - Fetch and manage user profile data
 */

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { getUserProfileFromUsername } from '../services/userService';
import type { UserProfile } from '../types/user';

interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const useUserProfile = (): UseUserProfileReturn => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = async () => {
    if (!user?.email) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Extract username from Firebase email (part before @)
      // Firebase email is dummy (e.g., alif@dummy.com)
      // Real email is in Google Sheets, but we lookup by username
      const username = user.email.split('@')[0];
      
      const userProfile = await getUserProfileFromUsername(username);
      
      if (userProfile) {
        // Merge with Firebase user data - BUT KEEP API DATA PRIORITY!
        // API data should NOT be overridden by Firebase data
        const finalProfile = {
          ...userProfile,
          uid: user.uid,
          photoURL: user.photoURL || userProfile.photoURL,
          // DO NOT override name, username, etc from API with Firebase data
        };
        setProfile(finalProfile);
      } else {
        // User not found in members list
        // Create basic profile from Firebase data
        setProfile({
          name: user.displayName || 'User',
          username: user.email.split('@')[0],
          slug: user.email.split('@')[0].toLowerCase(),
          panggilan: user.email.split('@')[0],
          email: user.email,
          uid: user.uid,
          role: 'member',
          displayName: user.displayName || undefined,
          photoURL: user.photoURL || undefined,
          initials: user.displayName 
            ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : 'U',
        });
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      
      // Fallback to Firebase user data
      if (user) {
        setProfile({
          name: user.displayName || 'User',
          username: user.email?.split('@')[0] || 'user',
          slug: user.email?.split('@')[0].toLowerCase() || 'user',
          panggilan: user.email?.split('@')[0] || 'user',
          email: user.email || '',
          uid: user.uid,
          role: 'member',
          displayName: user.displayName || undefined,
          photoURL: user.photoURL || undefined,
          initials: 'U',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user?.uid]); // Re-fetch when user changes

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
  };
};

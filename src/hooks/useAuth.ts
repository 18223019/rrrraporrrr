import { useState, useEffect } from 'react';
import { type User } from 'firebase/auth';
import { onAuthStateChange, getUserRole } from '../services/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'coach' | 'member'>('member');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const userRole = await getUserRole();
        setRole(userRole);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, role, loading };
};

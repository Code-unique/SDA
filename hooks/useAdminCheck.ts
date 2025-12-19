'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

export function useAdminCheck() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { getToken, isLoaded, userId } = useAuth();

  useEffect(() => {
    const checkAdmin = async () => {
      if (!isLoaded) return;
      
      if (!userId) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const token = await getToken();
        const res = await fetch('/api/admin/check', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        setIsAdmin(res.ok);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [isLoaded, userId, getToken]);

  return { isAdmin, loading };
}
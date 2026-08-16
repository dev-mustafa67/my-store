// lib/permissions.ts
'use client';

import { supabase } from './supabase-client';
import { useEffect, useState } from 'react';

export type UserRole = 'owner' | 'employee';

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('users_profile')
    .select('role')
    .eq('id', user.id)
    .single();
  return (data?.role as UserRole) ?? null;
}

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUserRole().then((r) => {
      setRole(r);
      setLoading(false);
    });
  }, []);

  return { role, loading, isOwner: role === 'owner', isEmployee: role === 'employee' };
}

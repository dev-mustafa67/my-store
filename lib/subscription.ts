// lib/subscription.ts
'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase-client';

export type SubscriptionInfo = {
  status: 'trial' | 'pending_payment' | 'active' | 'expired';
  expiresAt: string | null;
  daysLeft: number | null;
  isSuperAdmin: boolean;
  storeId: string | null;
  loading: boolean;
};

export function useSubscription(): SubscriptionInfo {
  const [info, setInfo] = useState<SubscriptionInfo>({
    status: 'trial', expiresAt: null, daysLeft: null, isSuperAdmin: false, storeId: null, loading: true,
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setInfo((p) => ({ ...p, loading: false })); return; }

      const { data: profile } = await supabase
        .from('users_profile')
        .select('store_id, is_super_admin')
        .eq('id', user.id)
        .single();

      if (!profile) { setInfo((p) => ({ ...p, loading: false })); return; }

      const { data: store } = await supabase
        .from('stores')
        .select('subscription_status, subscription_expires_at')
        .eq('id', profile.store_id)
        .single();

      let status = (store?.subscription_status ?? 'trial') as SubscriptionInfo['status'];
      const expiresAt = store?.subscription_expires_at ?? null;
      let daysLeft: number | null = null;

      if (expiresAt) {
        const diffMs = new Date(expiresAt).getTime() - Date.now();
        daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        // انتهت المهلة فعلياً لكن الحالة لم تُحدَّث بعد في القاعدة — اعتبرها منتهية في الواجهة فوراً
        if (daysLeft < 0 && status !== 'active') status = 'expired';
      }

      setInfo({
        status, expiresAt, daysLeft,
        isSuperAdmin: profile.is_super_admin ?? false,
        storeId: profile.store_id,
        loading: false,
      });
    })();
  }, []);

  return info;
}

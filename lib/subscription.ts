'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase-client';

export type SubStatus = 'trial' | 'active' | 'pending_payment' | 'expired';

export interface SubscriptionInfo {
  status: SubStatus;
  daysLeft: number;
  expiresAt: string | null;
  isExpired: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
}

export function useSubscription(): SubscriptionInfo {
  const [sub, setSub] = useState<SubscriptionInfo>({
    status: 'trial',
    daysLeft: 0,
    expiresAt: null,
    isExpired: false,
    isSuperAdmin: false,
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;

    async function checkSubscription() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (isMounted) setSub((s) => ({ ...s, loading: false }));
          return;
        }

        // 1. فحص مسؤول المنصة الرئيسي
        const { data: profile } = await supabase
          .from('users_profile')
          .select('store_id, is_super_admin')
          .eq('id', user.id)
          .single();

        if (profile?.is_super_admin) {
          if (isMounted) {
            setSub({
              status: 'active',
              daysLeft: 999,
              expiresAt: null,
              isExpired: false,
              isSuperAdmin: true,
              loading: false,
            });
          }
          return;
        }

        if (!profile?.store_id) {
          if (isMounted) setSub((s) => ({ ...s, loading: false }));
          return;
        }

        // 2. جلب بيانات المتجر من قاعدة البيانات
        const { data: store } = await supabase
          .from('stores')
          .select('subscription_status, subscription_expires_at')
          .eq('id', profile.store_id)
          .single();

        if (!store) {
          if (isMounted) setSub((s) => ({ ...s, loading: false, isExpired: true }));
          return;
        }

        const now = Date.now();
        const expiresAtTime = store.subscription_expires_at ? new Date(store.subscription_expires_at).getTime() : 0;
        const diffMs = expiresAtTime - now;
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        const status = (store.subscription_status as SubStatus) || 'trial';

        // 3. التحقق الحاسم: المتجر يكون مفعلاً فقط إذا كانت حالته active أو trial مع تاريخ مستقبلي
        const hasValidTime = expiresAtTime > now;
        const isOfficiallyActive = (status === 'active' || status === 'trial') && hasValidTime;
        
        // إذا لم يكن مفعلاً، فهو مقفل فوراً
        const isExpired = !isOfficiallyActive;

        if (isMounted) {
          setSub({
            status,
            daysLeft: hasValidTime ? Math.max(0, daysLeft) : 0,
            expiresAt: store.subscription_expires_at,
            isExpired,
            isSuperAdmin: false,
            loading: false,
          });
        }
      } catch (err) {
        console.error('Subscription check error:', err);
        if (isMounted) setSub((s) => ({ ...s, loading: false, isExpired: true }));
      }
    }

    checkSubscription();
    return () => {
      isMounted = false;
    };
  }, []);

  return sub;
}

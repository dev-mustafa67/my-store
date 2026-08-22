'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase-client';

export type SubStatus = 'trial' | 'active' | 'pending_payment' | 'expired';

export interface SubscriptionInfo {
  status: SubStatus;
  daysLeft: number | null;
  expiresAt: string | null;
  isExpired: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
}

export function useSubscription(): SubscriptionInfo {
  const [sub, setSub] = useState<SubscriptionInfo>({
    status: 'trial',
    daysLeft: null,
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

        // 1. فحص هل المستخدم مسؤول منصة (Super Admin)
        const { data: profile } = await supabase
          .from('users_profile')
          .select('store_id, is_super_admin')
          .eq('id', user.id)
          .single();

        if (profile?.is_super_admin) {
          if (isMounted) {
            setSub({
              status: 'active',
              daysLeft: null,
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

        // 2. جلب بيانات المتجر وتاريخ الانتهاء
        const { data: store } = await supabase
          .from('stores')
          .select('subscription_status, subscription_expires_at')
          .eq('id', profile.store_id)
          .single();

        if (!store) {
          if (isMounted) setSub((s) => ({ ...s, loading: false }));
          return;
        }

        const now = new Date().getTime();
        const expiresAtTime = store.subscription_expires_at ? new Date(store.subscription_expires_at).getTime() : 0;
        
        // حساب الفارق بالأيام
        const diffMs = expiresAtTime - now;
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        let currentStatus: SubStatus = (store.subscription_status as SubStatus) || 'trial';
        let isExpired = false;

        // التحقق الفعلي من الانتهاء
        if (currentStatus === 'pending_payment') {
          // بانتظار مراجعة الدفع من قِبل إدارة المنصة
          isExpired = false;
        } else if (daysLeft <= 0 || currentStatus === 'expired') {
          currentStatus = 'expired';
          isExpired = true;
        }

        if (isMounted) {
          setSub({
            status: currentStatus,
            daysLeft: daysLeft > 0 ? daysLeft : 0,
            expiresAt: store.subscription_expires_at,
            isExpired,
            isSuperAdmin: false,
            loading: false,
          });
        }
      } catch (err) {
        console.error('Error checking subscription:', err);
        if (isMounted) setSub((s) => ({ ...s, loading: false }));
      }
    }

    checkSubscription();
    return () => {
      isMounted = false;
    };
  }, []);

  return sub;
}

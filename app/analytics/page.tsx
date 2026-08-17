// app/analytics/page.tsx
'use client';

import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { supabase } from '@/lib/supabase-client';

export default function AnalyticsPage() {
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('users_profile').select('store_id').eq('id', user!.id).single();
      setStoreId(profile!.store_id);
    })();
  }, []);

  return (
    <div dir="rtl">
      <NavBar />
      {storeId ? <AnalyticsDashboard storeId={storeId} /> : <p className="text-center py-10">جاري التحميل...</p>}
    </div>
  );
}

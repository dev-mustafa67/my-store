// app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useSubscription } from '@/lib/subscription';

export default function AdminPage() {
  const sub = useSubscription();
  const [pending, setPending] = useState<any[]>([]);
  const [stores, setStores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!sub.loading && sub.isSuperAdmin) load();
  }, [sub.loading, sub.isSuperAdmin]);

  async function load() {
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true });
    setPending(payments ?? []);

    const { data: allStores } = await supabase.from('stores').select('id, name');
    const map: Record<string, string> = {};
    (allStores ?? []).forEach((s) => { map[s.id] = s.name; });
    setStores(map);
  }

  async function approve(payment: any) {
    await supabase.from('payments').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', payment.id);

    const { data: store } = await supabase.from('stores').select('subscription_expires_at').eq('id', payment.store_id).single();
    const currentExpiry = store?.subscription_expires_at ? new Date(store.subscription_expires_at) : new Date();
    const base = currentExpiry > new Date() ? currentExpiry : new Date();
    base.setDate(base.getDate() + 30);

    await supabase.from('stores').update({
      subscription_status: 'active',
      subscription_expires_at: base.toISOString(),
    }).eq('id', payment.store_id);

    load();
  }

  async function reject(payment: any) {
    await supabase.from('payments').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', payment.id);
    await supabase.from('stores').update({ subscription_status: 'expired' }).eq('id', payment.store_id);
    load();
  }

  if (sub.loading) return <p className="text-center py-10">جاري التحميل...</p>;
  if (!sub.isSuperAdmin) return <p className="text-center py-10 text-red-600">هذه الصفحة مخصّصة لمالك المنصة فقط.</p>;

  return (
    <div dir="rtl" className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">لوحة مراجعة الاشتراكات</h1>
      {pending.map((p) => (
        <div key={p.id} className="bg-white rounded-2xl shadow p-5 flex justify-between items-center flex-wrap gap-3">
          <div>
            <p className="font-bold text-gray-800">{stores[p.store_id] ?? '—'}</p>
            <p className="text-sm text-gray-500">{Number(p.amount).toLocaleString()} د.ع — {p.reference_note || 'بدون ملاحظة'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => approve(p)} className="px-4 h-9 bg-green-600 text-white rounded-lg text-sm font-bold">قبول</button>
            <button onClick={() => reject(p)} className="px-4 h-9 bg-red-100 text-red-700 rounded-lg text-sm font-bold">رفض</button>
          </div>
        </div>
      ))}
      {pending.length === 0 && <p className="text-gray-400 text-sm">لا توجد طلبات بانتظار المراجعة.</p>}
    </div>
  );
}

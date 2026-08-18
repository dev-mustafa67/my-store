'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useSubscription } from '@/lib/subscription';

export default function AdminContent() {
  const sub = useSubscription();
  const [owners, setOwners] = useState<any[]>([]);

  useEffect(() => {
    if (!sub.loading && sub.isSuperAdmin) load();
  }, [sub.loading, sub.isSuperAdmin]);

  async function load() {
    const { data: profiles } = await supabase
      .from('users_profile')
      .select('id, full_name, email, store_id')
      .eq('role', 'owner');

    const { data: stores } = await supabase
      .from('stores')
      .select('id, name, subscription_status, subscription_expires_at');

    const storeMap: Record<string, any> = {};
    (stores ?? []).forEach((s) => { storeMap[s.id] = s; });

    const combined = (profiles ?? []).map((p) => ({
      ...p,
      store: storeMap[p.store_id],
    }));

    setOwners(combined);
  }

  async function activate(storeId: string) {
    const { data: store } = await supabase.from('stores').select('subscription_expires_at').eq('id', storeId).single();
    const currentExpiry = store?.subscription_expires_at ? new Date(store.subscription_expires_at) : new Date();
    const base = currentExpiry > new Date() ? currentExpiry : new Date();
    base.setDate(base.getDate() + 30);

    await supabase.from('stores').update({
      subscription_status: 'active',
      subscription_expires_at: base.toISOString(),
    }).eq('id', storeId);

    load();
  }

  async function deactivate(storeId: string) {
    await supabase.from('stores').update({ subscription_status: 'expired' }).eq('id', storeId);
    load();
  }

  const statusLabel: Record<string, { text: string; className: string }> = {
    trial: { text: '🟢 تجريبي', className: 'text-green-700 bg-green-50' },
    pending_payment: { text: '🟡 بانتظار', className: 'text-amber-700 bg-amber-50' },
    active: { text: '✅ مشترك', className: 'text-indigo-700 bg-indigo-50' },
    expired: { text: '🔴 منتهي', className: 'text-red-700 bg-red-50' },
  };

  if (sub.loading) return <p className="text-center py-10">جاري التحميل...</p>;
  if (!sub.isSuperAdmin) return <p className="text-center py-10 text-red-600">هذه الصفحة مخصّصة لمالك المنصة فقط.</p>;

  return (
    <div dir="rtl" className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">كل التجّار المسجّلون</h1>
      <p className="text-sm text-gray-500">بعد أن يحوّل التاجر المبلغ خارج التطبيق (زين كاش/تحويل بنكي) وتتأكد منه، اضغط "تفعيل" أمام اسمه.</p>

      {owners.map((o) => {
        const status = o.store?.subscription_status ?? 'trial';
        const label = statusLabel[status] ?? statusLabel.trial;
        const expiresAt = o.store?.subscription_expires_at ? new Date(o.store.subscription_expires_at).toLocaleDateString('ar-IQ') : '—';

        return (
          <div key={o.id} className="bg-white rounded-2xl shadow p-5 flex justify-between items-center flex-wrap gap-3">
            <div>
              <p className="font-bold text-gray-800">{o.store?.name ?? '—'}</p>
              <p className="text-sm text-gray-500">{o.full_name} — {o.email}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${label.className}`}>
                {label.text} — ينتهي: {expiresAt}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => activate(o.store_id)} className="px-4 h-9 bg-green-600 text-white rounded-lg text-sm font-bold">
                تفعيل 30 يوم
              </button>
              <button onClick={() => deactivate(o.store_id)} className="px-4 h-9 bg-red-100 text-red-700 rounded-lg text-sm font-bold">
                إيقاف
              </button>
            </div>
          </div>
        );
      })}
      {owners.length === 0 && <p className="text-gray-400 text-sm">لا يوجد تجّار مسجّلون بعد.</p>}
    </div>
  );
}

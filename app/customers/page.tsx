// app/customers/page.tsx
'use client';

import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase-client';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('users_profile').select('store_id').eq('id', user!.id).single();
    setStoreId(profile!.store_id);

    const { data: custs } = await supabase.from('customers').select('*').eq('store_id', profile!.store_id);

    // لكل زبون، اجلب ملخص مشترياته
    const withHistory = await Promise.all((custs ?? []).map(async (c) => {
      const { data: sales } = await supabase
        .from('sales')
        .select('sale_price_at_time, product_variants(color, size)')
        .eq('customer_id', c.id);

      const totalSpent = (sales ?? []).reduce((s, x) => s + Number(x.sale_price_at_time), 0);
      const sizes = [...new Set((sales ?? []).map((s: any) => s.product_variants?.size).filter(Boolean))];
      const colors = [...new Set((sales ?? []).map((s: any) => s.product_variants?.color).filter(Boolean))];

      return { ...c, purchaseCount: sales?.length ?? 0, totalSpent, sizes, colors };
    }));

    setCustomers(withHistory);
  }

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !storeId) return;
    await supabase.from('customers').insert({ store_id: storeId, name, phone });
    setName(''); setPhone('');
    load();
  }

  return (
    <div dir="rtl">
      <NavBar />
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <form onSubmit={addCustomer} className="bg-white rounded-2xl shadow p-6 flex gap-3 flex-wrap">
          <input placeholder="اسم الزبون" value={name} onChange={e => setName(e.target.value)} className="h-11 px-3 rounded-lg border flex-1" />
          <input placeholder="رقم الهاتف" value={phone} onChange={e => setPhone(e.target.value)} className="h-11 px-3 rounded-lg border flex-1" />
          <button className="px-6 h-11 bg-indigo-600 text-white rounded-xl font-bold">حفظ الزبون</button>
        </form>

        <div className="space-y-3">
          {customers.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl shadow p-5">
              <h4 className="font-bold text-gray-800">{c.name} {c.phone && `— ${c.phone}`}</h4>
              <p className="text-sm text-gray-500 mt-1">عدد المشتريات: {c.purchaseCount} | إجمالي الإنفاق: {c.totalSpent.toLocaleString()} د.ع</p>
              <p className="text-sm text-gray-500">المقاسات المفضّلة: {c.sizes.join('، ') || '—'} | الألوان المفضّلة: {c.colors.join('، ') || '—'}</p>
            </div>
          ))}
          {customers.length === 0 && <p className="text-gray-400 text-sm">لا يوجد زبائن بعد.</p>}
        </div>
      </div>
    </div>
  );
}

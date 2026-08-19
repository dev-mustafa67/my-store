// app/customers/page.tsx
'use client';

import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase-client';
import { Crown, Gem, User } from 'lucide-react';

const VIP_THRESHOLD = 500000;   // د.ع خلال آخر 90 يوماً
const GOLD_THRESHOLD = 200000;

function getTier(totalSpent: number) {
  if (totalSpent >= VIP_THRESHOLD) return { label: 'VIP', icon: Crown, className: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white' };
  if (totalSpent >= GOLD_THRESHOLD) return { label: 'مميز', icon: Gem, className: 'bg-gradient-to-r from-slate-300 to-slate-400 text-white' };
  return { label: 'عادي', icon: User, className: 'bg-gray-100 text-gray-500' };
}

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

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const withHistory = await Promise.all((custs ?? []).map(async (c) => {
      const { data: sales } = await supabase
        .from('sales')
        .select('sale_price_at_time, sold_at, product_variants(color, size)')
        .eq('customer_id', c.id);

      const recentSales = (sales ?? []).filter((s) => new Date(s.sold_at) >= ninetyDaysAgo);
      const totalSpent = recentSales.reduce((s, x) => s + Number(x.sale_price_at_time), 0);
      const sizes = [...new Set((sales ?? []).map((s: any) => s.product_variants?.size).filter(Boolean))];
      const colors = [...new Set((sales ?? []).map((s: any) => s.product_variants?.color).filter(Boolean))];

      return { ...c, purchaseCount: sales?.length ?? 0, totalSpent, sizes, colors };
    }));

    withHistory.sort((a, b) => b.totalSpent - a.totalSpent);
    setCustomers(withHistory);
  }

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !storeId) return;
    await supabase.from('customers').insert({ store_id: storeId, name, phone });
    setName(''); setPhone('');
    load();
  }

  const vipCount = customers.filter((c) => c.totalSpent >= VIP_THRESHOLD).length;

  return (
    <div dir="rtl">
      <NavBar />
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {vipCount > 0 && (
          <div className="bg-gradient-to-l from-amber-400 to-yellow-500 rounded-2xl p-5 text-white flex items-center gap-3 shadow-lg">
            <Crown size={28} />
            <div>
              <p className="font-bold">لديك {vipCount} زبون VIP</p>
              <p className="text-sm opacity-90">هؤلاء أفضل زبائنك خلال آخر 90 يوماً — استهدفهم أولاً عند وصول بضاعة جديدة</p>
            </div>
          </div>
        )}

        <form onSubmit={addCustomer} className="bg-white rounded-2xl shadow p-6 flex gap-3 flex-wrap">
          <input placeholder="اسم الزبون" value={name} onChange={e => setName(e.target.value)} className="h-11 px-3 rounded-lg border flex-1" />
          <input placeholder="رقم الهاتف" value={phone} onChange={e => setPhone(e.target.value)} className="h-11 px-3 rounded-lg border flex-1" />
          <button className="px-6 h-11 bg-indigo-600 text-white rounded-xl font-bold">حفظ الزبون</button>
        </form>

        <div className="space-y-3">
          {customers.map((c) => {
            const tier = getTier(c.totalSpent);
            return (
              <div key={c.id} className="bg-white rounded-2xl shadow p-5 flex justify-between items-start flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-gray-800">{c.name} {c.phone && `— ${c.phone}`}</h4>
                  <p className="text-sm text-gray-500 mt-1">عدد المشتريات: {c.purchaseCount} | إجمالي الإنفاق (90 يوم): {c.totalSpent.toLocaleString()} د.ع</p>
                  <p className="text-sm text-gray-500">المقاسات المفضّلة: {c.sizes.join('، ') || '—'} | الألوان المفضّلة: {c.colors.join('، ') || '—'}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${tier.className}`}>
                  <tier.icon size={13} /> {tier.label}
                </span>
              </div>
            );
          })}
          {customers.length === 0 && <p className="text-gray-400 text-sm">لا يوجد زبائن بعد.</p>}
        </div>
      </div>
    </div>
  );
}

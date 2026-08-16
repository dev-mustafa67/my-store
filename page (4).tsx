// app/debts/page.tsx
'use client';

import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase-client';

export default function DebtsPage() {
  const [debts, setDebts] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('users_profile').select('store_id').eq('id', user!.id).single();
    setStoreId(profile!.store_id);

    const { data } = await supabase
      .from('debts')
      .select('*')
      .eq('store_id', profile!.store_id)
      .order('created_at', { ascending: false });
    setDebts(data ?? []);
  }

  async function addDebt(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName || !amount || !storeId) return;
    await supabase.from('debts').insert({
      store_id: storeId,
      customer_name: customerName,
      amount: Number(amount),
      note: 'دين مسجّل يدوياً',
    });
    setCustomerName(''); setAmount('');
    load();
  }

  async function markPaid(id: string) {
    await supabase.from('debts').update({ paid: true, paid_at: new Date().toISOString() }).eq('id', id);
    load();
  }

  const totalOutstanding = debts.filter(d => !d.paid).reduce((s, d) => s + Number(d.amount), 0);

  return (
    <div dir="rtl">
      <NavBar />
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="bg-indigo-50 rounded-2xl p-5 text-center">
          <p className="text-sm text-indigo-700 font-semibold">إجمالي الديون المستحقة</p>
          <p className="text-2xl font-bold text-indigo-800">{totalOutstanding.toLocaleString()} د.ع</p>
        </div>

        <form onSubmit={addDebt} className="bg-white rounded-2xl shadow p-6 flex gap-3 flex-wrap">
          <input placeholder="اسم الزبون" value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-11 px-3 rounded-lg border flex-1" />
          <input type="number" placeholder="المبلغ" value={amount} onChange={e => setAmount(e.target.value)} className="h-11 px-3 rounded-lg border flex-1" />
          <button className="px-6 h-11 bg-indigo-600 text-white rounded-xl font-bold">تسجيل الدين</button>
        </form>

        <div className="bg-white rounded-2xl shadow p-6 space-y-2">
          {debts.map((d) => (
            <div key={d.id} className={`flex justify-between items-center p-3 rounded-xl text-sm ${d.paid ? 'bg-green-50 opacity-70' : 'bg-red-50'}`}>
              <span>{d.customer_name} — {d.note} — {Number(d.amount).toLocaleString()} د.ع</span>
              {d.paid
                ? <span>✔ تم الاستلام</span>
                : <button onClick={() => markPaid(d.id)} className="px-4 h-8 bg-green-600 text-white rounded-lg text-xs font-bold">تحصيل</button>}
            </div>
          ))}
          {debts.length === 0 && <p className="text-gray-400 text-sm">لا توجد ديون مسجّلة.</p>}
        </div>
      </div>
    </div>
  );
}

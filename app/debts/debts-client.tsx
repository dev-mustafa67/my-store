// app/debts/page.tsx
'use client';

import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase-client';
import { BookText, Phone, CheckCircle2 } from 'lucide-react';

export default function DebtsPage() {
  const [debts, setDebts] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
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
      customer_phone: customerPhone || null,
      amount: Number(amount),
      note: 'دين مسجّل يدوياً',
    });
    setCustomerName(''); setCustomerPhone(''); setAmount('');
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
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-6 text-center text-white shadow-lg">
          <BookText className="mx-auto mb-2 opacity-90" size={24} />
          <p className="text-sm opacity-90">إجمالي الديون المستحقة</p>
          <p className="text-3xl font-bold mt-1">{totalOutstanding.toLocaleString()} د.ع</p>
        </div>

        <form onSubmit={addDebt} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <h3 className="font-bold text-gray-700 text-sm">تسجيل دين جديد</h3>
          <div className="flex gap-3 flex-wrap">
            <input placeholder="اسم الزبون" value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-11 px-3 rounded-lg border border-gray-200 flex-1 min-w-[140px]" />
            <input placeholder="رقم الهاتف" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="h-11 px-3 rounded-lg border border-gray-200 flex-1 min-w-[140px]" />
            <input type="number" placeholder="المبلغ" value={amount} onChange={e => setAmount(e.target.value)} className="h-11 px-3 rounded-lg border border-gray-200 flex-1 min-w-[100px]" />
          </div>
          <button className="w-full sm:w-auto px-6 h-11 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">تسجيل الدين</button>
        </form>

        <div className="space-y-2">
          {debts.map((d) => (
            <div key={d.id} className={`flex justify-between items-center p-4 rounded-2xl text-sm shadow-sm border ${d.paid ? 'bg-green-50 border-green-100 opacity-70' : 'bg-white border-gray-100'}`}>
              <div>
                <p className="font-semibold text-gray-800">{d.customer_name}</p>
                <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-3 flex-wrap">
                  {d.customer_phone && <span className="flex items-center gap-1"><Phone size={11} /> {d.customer_phone}</span>}
                  <span>{d.note}</span>
                  <span className="font-bold text-gray-700">{Number(d.amount).toLocaleString()} د.ع</span>
                </p>
              </div>
              {d.paid
                ? <span className="flex items-center gap-1 text-green-700 text-xs font-bold"><CheckCircle2 size={14} /> تم الاستلام</span>
                : <button onClick={() => markPaid(d.id)} className="px-4 h-8 bg-green-600 text-white rounded-lg text-xs font-bold shrink-0">تحصيل</button>}
            </div>
          ))}
          {debts.length === 0 && <p className="text-gray-400 text-sm text-center py-6">لا توجد ديون مسجّلة.</p>}
        </div>
      </div>
    </div>
  );
}

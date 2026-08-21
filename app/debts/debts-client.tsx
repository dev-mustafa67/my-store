'use client';

import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase-client';
import { BookText, Phone, CheckCircle2, MessageSquare, DollarSign, Clock } from 'lucide-react';

export default function DebtsPage() {
  const [debts, setDebts] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [tab, setTab] = useState<'unpaid' | 'paid'>('unpaid');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('users_profile').select('store_id').eq('id', user!.id).single();
    if (!profile) return;
    setStoreId(profile.store_id);

    const { data } = await supabase
      .from('debts')
      .select('*')
      .eq('store_id', profile.store_id)
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

  // تسديد جزئي نظيف ومباشر على نفس السجل
  async function payPartial(debt: any) {
    const payAmountStr = prompt(`المبلغ المتبقي: ${Number(debt.amount).toLocaleString()} د.ع\nأدخل المبلغ المستلم الآن:`);
    if (!payAmountStr) return;
    const payAmount = Number(payAmountStr);
    if (isNaN(payAmount) || payAmount <= 0) return alert('يرجى إدخال مبلغ صحيح');

    const now = new Date().toISOString();

    if (payAmount >= Number(debt.amount)) {
      await markPaid(debt.id);
    } else {
      const remaining = Number(debt.amount) - payAmount;
      await supabase.from('debts').update({
        amount: remaining,
        note: `${debt.note || ''} | (سُدد ${payAmount.toLocaleString()} د.ع في ${new Date().toLocaleDateString('ar-IQ')})`,
        paid_at: now,
      }).eq('id', debt.id);
      load();
    }
  }

  function sendReminder(debt: any) {
    if (!debt.customer_phone) {
      alert('لا يوجد رقم هاتف مسجل لهذا الزبون');
      return;
    }
    const cleanPhone = debt.customer_phone.replace(/[^0-9]/g, '');
    const msg = `مرحباً أستاذ ${debt.customer_name}، نود تذكيركم بوجود مبلغ مستحق بذمتكم قدره ${Number(debt.amount).toLocaleString()} د.ع. شاكرين تعاونكم معنا! 🙏`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  const activeDebts = debts.filter(d => !d.paid);
  const paidDebts = debts.filter(d => d.paid);
  const totalOutstanding = activeDebts.reduce((s, d) => s + Number(d.amount), 0);

  const displayedList = tab === 'unpaid' ? activeDebts : paidDebts;

  return (
    <div dir="rtl">
      <NavBar />
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-6 text-center text-white shadow-lg">
          <BookText className="mx-auto mb-2 opacity-90" size={24} />
          <p className="text-sm opacity-90">إجمالي الديون المستحقة بذمة الزبائن</p>
          <p className="text-3xl font-bold mt-1">{totalOutstanding.toLocaleString()} د.ع</p>
        </div>

        <form onSubmit={addDebt} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <h3 className="font-bold text-gray-700 text-sm">تسجيل دين جديد</h3>
          <div className="flex gap-3 flex-wrap">
            <input placeholder="اسم الزبون" value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-11 px-3 rounded-lg border border-gray-200 flex-1 min-w-[140px] text-sm outline-none" />
            <input placeholder="رقم الهاتف (للواتساب)" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="h-11 px-3 rounded-lg border border-gray-200 flex-1 min-w-[140px] text-sm outline-none" />
            <input type="number" placeholder="المبلغ" value={amount} onChange={e => setAmount(e.target.value)} className="h-11 px-3 rounded-lg border border-gray-200 flex-1 min-w-[100px] text-sm outline-none" />
          </div>
          <button className="w-full sm:w-auto px-6 h-11 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 text-sm">تسجيل الدين</button>
        </form>

        {/* أزرار التبديل بين الديون المستحقة والمسددة */}
        <div className="flex gap-2 border-b border-gray-200 pb-2">
          <button
            onClick={() => setTab('unpaid')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${tab === 'unpaid' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Clock size={14} /> الديون المستحقة ({activeDebts.length})
          </button>
          <button
            onClick={() => setTab('paid')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${tab === 'paid' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <CheckCircle2 size={14} /> المسددة بالكامل ({paidDebts.length})
          </button>
        </div>

        <div className="space-y-3">
          {displayedList.map((d) => (
            <div key={d.id} className={`flex flex-col sm:flex-row justify-between sm:items-center p-4 rounded-2xl text-sm shadow-sm border gap-3 ${d.paid ? 'bg-green-50/60 border-green-100' : 'bg-white border-gray-100'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-800">{d.customer_name}</p>
                  {!d.paid ? (
                    <span className="bg-red-50 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold">مستحق</span>
                  ) : (
                    <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">مسدد بالكامل</span>
                  )}
                </div>
                <p className="text-gray-500 text-xs mt-1 flex items-center gap-3 flex-wrap">
                  {d.customer_phone && <span className="flex items-center gap-1"><Phone size={11} /> {d.customer_phone}</span>}
                  <span>{d.note}</span>
                  <span className="font-bold text-red-600">{Number(d.amount).toLocaleString()} د.ع</span>
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {!d.paid && d.customer_phone && (
                  <button onClick={() => sendReminder(d)} title="تذكير واتساب" className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg">
                    <MessageSquare size={16} />
                  </button>
                )}
                {!d.paid && (
                  <button onClick={() => payPartial(d)} title="تسديد جزء من المبلغ" className="flex items-center gap-1 px-3 h-8 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600">
                    <DollarSign size={13} /> تسديد جزئي
                  </button>
                )}
                {!d.paid ? (
                  <button onClick={() => markPaid(d.id)} className="px-3.5 h-8 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700">
                    إغلاق الدين
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">سُدد في: {d.paid_at ? new Date(d.paid_at).toLocaleDateString('ar-IQ') : '—'}</span>
                )}
              </div>
            </div>
          ))}
          {displayedList.length === 0 && <p className="text-gray-400 text-sm text-center py-6">لا توجد ديون في هذه القائمة.</p>}
        </div>
      </div>
    </div>
  );
}

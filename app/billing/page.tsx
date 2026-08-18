// app/billing/page.tsx
'use client';

import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase-client';
import { useSubscription } from '@/lib/subscription';

const MONTHLY_PRICE = 25000; // د.ع — عدّلها لاحقاً حسب سعرك النهائي

export default function BillingPage() {
  const sub = useSubscription();
  const [payments, setPayments] = useState<any[]>([]);
  const [amount, setAmount] = useState(String(MONTHLY_PRICE));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { if (sub.storeId) loadPayments(); }, [sub.storeId]);

  async function loadPayments() {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('store_id', sub.storeId)
      .order('submitted_at', { ascending: false });
    setPayments(data ?? []);
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!sub.storeId) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('payments').insert({
      store_id: sub.storeId,
      amount: Number(amount),
      reference_note: note,
      submitted_by: user!.id,
    });
    await supabase.from('stores').update({ subscription_status: 'pending_payment' }).eq('id', sub.storeId);

    setDone(true);
    setSubmitting(false);
    loadPayments();
  }

  const statusLabel: Record<string, string> = {
    trial: '🟢 فترة تجريبية',
    pending_payment: '🟡 بانتظار مراجعة الدفعة',
    active: '✅ مشترك نشط',
    expired: '🔴 الاشتراك منتهي',
  };

  return (
    <div dir="rtl">
      <NavBar />
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-2xl shadow p-6 text-center">
          <p className="text-lg font-bold text-gray-800">{statusLabel[sub.status]}</p>
          {sub.daysLeft !== null && sub.status !== 'active' && (
            <p className="text-sm text-gray-500 mt-1">
              {sub.daysLeft >= 0 ? `متبقٍ ${sub.daysLeft} يوم` : 'انتهت المهلة'}
            </p>
          )}
        </div>

        {sub.status !== 'active' && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="font-bold text-gray-800 mb-3">تجديد الاشتراك — {MONTHLY_PRICE.toLocaleString()} د.ع / شهرياً</h3>
            <p className="text-sm text-gray-600 mb-4">
              حوّل المبلغ عبر زين كاش أو تحويل بنكي إلى: <b className="text-indigo-600">07XXXXXXXXX (زين كاش)</b>،
              ثم أدخل رقم العملية أو ملاحظة تثبت التحويل أدناه، وسنراجعها ونفعّل اشتراكك خلال ساعات.
            </p>

            {done ? (
              <p className="text-green-700 bg-green-50 rounded-xl p-4 text-sm">
                ✅ تم إرسال طلبك، بانتظار المراجعة الآن.
              </p>
            ) : (
              <form onSubmit={submitPayment} className="space-y-3">
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border" placeholder="المبلغ المُحوَّل" />
                <input value={note} onChange={(e) => setNote(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border" placeholder="رقم عملية التحويل أو ملاحظة" />
                <button disabled={submitting} className="w-full h-11 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50">
                  {submitting ? 'جاري الإرسال...' : 'إرسال إثبات الدفع'}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="font-bold text-gray-800 mb-3">سجل الدفعات</h3>
          {payments.map((p) => (
            <div key={p.id} className="flex justify-between items-center py-2 border-b text-sm">
              <span>{Number(p.amount).toLocaleString()} د.ع — {p.reference_note || '—'}</span>
              <span className={p.status === 'approved' ? 'text-green-600' : p.status === 'rejected' ? 'text-red-600' : 'text-amber-600'}>
                {p.status === 'approved' ? '✔ مقبولة' : p.status === 'rejected' ? '✘ مرفوضة' : '⏳ قيد المراجعة'}
              </span>
            </div>
          ))}
          {payments.length === 0 && <p className="text-gray-400 text-sm">لا توجد دفعات مسجّلة بعد.</p>}
        </div>
      </div>
    </div>
  );
}

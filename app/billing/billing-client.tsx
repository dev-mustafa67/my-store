'use client';

import { useState } from 'react';
import NavBar from '@/components/NavBar';
import { useSubscription } from '@/lib/subscription';
import { supabase } from '@/lib/supabase-client';
import { CreditCard, CheckCircle2, Clock, AlertTriangle, XCircle, Copy, Check, MessageSquare, Send, ShieldCheck } from 'lucide-react';

const MONTHLY_PRICE = 10000; // د.ع
const ZAINCASH_NUMBER = '07747970914';
const WHATSAPP_NUMBER = '9647747970914';

export default function BillingPage() {
  const sub = useSubscription();
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  function handleCopyNumber() {
    navigator.clipboard.writeText(ZAINCASH_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('users_profile')
        .select('store_id, full_name')
        .eq('id', user!.id)
        .single();

      if (!profile?.store_id) throw new Error('Store not found');

      // 1. تسجيل الدفعة في جدول payments
      await supabase.from('payments').insert({
        store_id: profile.store_id,
        amount: MONTHLY_PRICE,
        method: 'zaincash_or_bank',
        reference_note: note || 'طلب تجديد اشتراك شهري',
        status: 'pending',
        submitted_by: user!.id,
      });

      // 2. تحديث حالة المتجر إلى بانتظار التأكيد
      await supabase.from('stores').update({
        subscription_status: 'pending_payment',
      }).eq('id', profile.store_id);

      setSubmittedSuccess(true);
      setNote('');

      // 3. فتح واتساب تلقائياً مع تفاصيل الدفعة
      const waMsg = `مرحباً، قمت بتحويل مبلغ الاشتراك (${MONTHLY_PRICE.toLocaleString()} د.ع) لتجديد اشتراك المحل.\nالاسم: ${profile.full_name}\nملاحظة التحويل: ${note || 'لا يوجد'}`;
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`, '_blank');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال الطلب، يرجى التواصل عبر الواتساب مباشرة');
    } finally {
      setSubmitting(false);
    }
  }

  if (sub.loading) {
    return (
      <div dir="rtl">
        <NavBar />
        <div className="max-w-2xl mx-auto p-6 text-center text-gray-500 py-16">
          جاري تحميل بيانات الاشتراك...
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl">
      <NavBar />
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* بطاقة حالة الاشتراك الدقيقة */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-indigo-50 text-indigo-600">
            <CreditCard size={24} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {sub.isSuperAdmin ? (
                <span className="text-indigo-600 flex items-center justify-center gap-1.5">
                  <ShieldCheck size={20} /> حساب إدارة المنصة (غير محدود)
                </span>
              ) : sub.status === 'pending_payment' ? (
                <span className="text-amber-600 flex items-center justify-center gap-1.5">
                  <Clock size={20} /> بانتظار تأكيد الدفع
                </span>
              ) : sub.isExpired ? (
                <span className="text-red-600 flex items-center justify-center gap-1.5">
                  <XCircle size={20} /> الاشتراك منتهي
                </span>
              ) : sub.status === 'trial' ? (
                <span className="text-emerald-600 flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={20} /> فترة تجريبية مجانية
                </span>
              ) : (
                <span className="text-emerald-600 flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={20} /> الاشتراك نشط ومفعل
                </span>
              )}
            </h2>

            {!sub.isSuperAdmin && (
              <p className="text-sm text-gray-500 mt-1">
                {sub.status === 'pending_payment'
                  ? 'تم استلام طلب التحويل وسيتم التفعيل خلال دقائق بعد المطابقة'
                  : sub.isExpired
                  ? 'يرجى تحويل رسوم التجديد لاستئناف العمل على النظام'
                  : sub.daysLeft !== null && sub.daysLeft > 0
                  ? `متبقٍ ${sub.daysLeft} ${sub.daysLeft === 1 ? 'يوم واحد' : sub.daysLeft === 2 ? 'يومان' : 'أيام'} على انتهاء الصلاحية`
                  : 'اشتراك غير محدود'}
              </p>
            )}
          </div>

          {sub.expiresAt && !sub.isSuperAdmin && (
            <div className="text-xs text-gray-400 font-mono bg-gray-50 py-1.5 px-3 rounded-xl inline-block">
              ينتهي في: {new Date(sub.expiresAt).toLocaleDateString('ar-IQ')}
            </div>
          )}
        </div>

        {/* قسم الدفع وتجديد الاشتراك */}
        {!sub.isSuperAdmin && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-5">
            <div className="border-b border-gray-100 pb-4">
              <h3 className="font-bold text-gray-800 text-base">طريقة تجديد الاشتراك الشهري</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                تكلفة الاشتراك: <strong className="text-indigo-600 font-bold text-sm">{MONTHLY_PRICE.toLocaleString()} د.ع / شهرياً</strong>
              </p>
            </div>

            {/* بطاقة رقم زين كاش */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/60 p-4 rounded-2xl border border-indigo-200 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs text-indigo-900 font-medium">رقم المحفظة (زين كاش / تحويل سريع):</p>
                <p className="text-lg font-bold font-mono text-indigo-950 mt-0.5 tracking-wider">{ZAINCASH_NUMBER}</p>
              </div>
              <button
                type="button"
                onClick={handleCopyNumber}
                className="flex items-center gap-1.5 px-4 h-9 bg-white text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold transition shadow-sm border border-indigo-200"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copied ? 'تم النسخ' : 'نسخ الرقم'}</span>
              </button>
            </div>

            {/* نموذج تأكيد الدفع */}
            <form onSubmit={handleSubmitPayment} className="space-y-3 pt-1">
              <label className="block text-xs font-semibold text-gray-700">
                ملاحظة التحويل أو رقم العملية (اختياري):
              </label>
              <input
                type="text"
                placeholder="مثال: تم التحويل من رقم 0780xxxxxxx أو اسم الحساب"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full h-11 px-3.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 h-11 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition shadow-md shadow-indigo-100"
                >
                  <Send size={15} />
                  <span>{submitting ? 'جاري الإرسال...' : 'تأكيد التحويل وتفعيل الاشتراك'}</span>
                </button>

                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('مرحباً، أود الاستفسار بخصوص تجديد اشتراك المحل')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 px-4 h-11 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-md shadow-emerald-100"
                >
                  <MessageSquare size={15} />
                  <span>تواصل عبر واتساب</span>
                </a>
              </div>

              {submittedSuccess && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-xl text-xs font-semibold text-center mt-3">
                  ✅ تم إرسال طلب التجديد بنجاح! سيتم مراجعة الدفعة وتفعيل المتجر فوراً.
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

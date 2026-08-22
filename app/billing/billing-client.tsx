'use client';

import NavBar from '@/components/NavBar';
import { useSubscription } from '@/lib/subscription';
import { CreditCard, CheckCircle2, Clock, XCircle, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react';

const MONTHLY_PRICE = 10000; // د.ع
const WHATSAPP_NUMBER = '9647747970914';

export default function BillingPage() {
  const sub = useSubscription();

  const whatsappMessage = encodeURIComponent(
    'مرحباً، أود الاستفسار بخصوص تجديد اشتراك متجري وتفعيل الحساب.'
  );

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
                  ? 'يرجى التواصل معنا لتجديد الاشتراك واستئناف العمل على النظام'
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

        {/* قسم الدفع وتجديد الاشتراك (الجديد) */}
        {!sub.isSuperAdmin && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 text-center space-y-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold mb-2">
                <Sparkles size={14} /> خطة الاشتراك الشهري
              </div>
              <h3 className="text-2xl font-black text-gray-900">
                {MONTHLY_PRICE.toLocaleString()} د.ع <span className="text-xs text-gray-400 font-normal">/ شهرياً</span>
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                لتجديد اشتراك المحل أو الاستفسار عن طرق الدفع المتاحة، يرجى مراسلتنا عبر الواتساب وسيتم تفعيل حسابك فوراً.
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-100 transition-all"
              >
                <MessageSquare size={18} />
                <span>راسلني على الواتساب للدفع والتجديد</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

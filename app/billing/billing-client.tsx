// app/billing/page.tsx
'use client';

import NavBar from '@/components/NavBar';
import { useSubscription } from '@/lib/subscription';

const MONTHLY_PRICE = 10000; // د.ع — عدّلها لاحقاً حسب سعرك النهائي
const ZAINCASH_NUMBER = '07747970914'; // ضع رقمك الحقيقي هنا

export default function BillingPage() {
  const sub = useSubscription();

  const statusLabel: Record<string, string> = {
    trial: '🟢 فترة تجريبية',
    pending_payment: '🟡 بانتظار التفعيل',
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
          <div className="bg-white rounded-2xl shadow p-6 space-y-3">
            <h3 className="font-bold text-gray-800">تجديد الاشتراك — {MONTHLY_PRICE.toLocaleString()} د.ع / شهرياً</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              حوّل المبلغ عبر زين كاش أو تحويل بنكي إلى الرقم: <b className="text-indigo-600">{ZAINCASH_NUMBER}</b>
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              بعد التحويل، تواصل معنا مباشرة (واتساب أو اتصال) لتأكيد الدفعة — سيتم تفعيل اشتراكك خلال ساعات من طرفنا.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

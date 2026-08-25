'use client';

import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase-client';
import { useSubscription } from '@/lib/subscription';
import { 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Store, 
  Sparkles, 
  ShieldCheck, 
  Calendar,
  MessageCircle
} from 'lucide-react';

export default function BillingPage() {
  const sub = useSubscription();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [planType, setPlanType] = useState<'basic' | 'pro'>('basic');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadStore() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('users_profile')
        .select('store_id, plan_type')
        .eq('id', user.id)
        .single();

      if (profile?.store_id) {
        setStoreId(profile.store_id);
        setPlanType((profile.plan_type as 'basic' | 'pro') || 'basic');
      }
    }
    loadStore();
  }, []);

  const storePublicUrl = storeId ? `${window.location.origin}/store/${storeId}` : '';

  function copyStoreLink() {
    if (!storePublicUrl) return;
    navigator.clipboard.writeText(storePublicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function contactSupport(plan: string) {
    const text = `مرحباً، أود تفعيل اشتراك (${plan}) لمتجري في منصة كاشيري.\nمعرف المتجر: ${storeId}`;
    window.open(`https://wa.me/9647700000000?text=${encodeURIComponent(text)}`, '_blank');
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 pb-16">
      <NavBar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Status Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">حالة الاشتراك:</span>
              <span className={`text-xs font-black px-3 py-1 rounded-full ${sub.isExpired && !sub.isSuperAdmin ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                {sub.isSuperAdmin ? 'أدمن المنصة' : sub.isExpired ? 'منتهي' : 'نشط'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm font-bold text-gray-900">
              <Calendar size={16} className="text-indigo-600" />
              <span>متبقي: {sub.daysLeft} يوم</span>
            </div>
          </div>

          {/* Link in Bio Card */}
          {planType === 'pro' && storeId && (
            <div className="w-full sm:w-auto bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center gap-3">
              <div className="text-xs text-indigo-950 font-bold flex items-center gap-1.5">
                <Store size={16} className="text-indigo-600" /> رابط متجرك للإنستغرام:
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={copyStoreLink}
                  className="flex-1 sm:flex-initial px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-600 hover:text-white transition flex items-center justify-center gap-1"
                >
                  <Copy size={14} /> {copied ? 'تم النسخ!' : 'نسخ الرابط'}
                </button>
                <a 
                  href={storePublicUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Pricing Table */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-gray-900">اختر الباقة المناسبة لعملك</h2>
          <p className="text-xs text-gray-500">اختر بين باقة الكاشير الأساسية أو باقة المتجر الإلكتروني الشاملة</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Plan */}
          <div className={`bg-white rounded-3xl p-6 sm:p-8 border shadow-sm flex flex-col justify-between relative ${planType === 'basic' ? 'border-gray-300' : 'border-gray-100'}`}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-900">باقة الكاشير الأساسية</h3>
                <span className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">للمحلات المباشرة</span>
              </div>
              <div className="text-3xl font-black text-gray-900">
                10,000 <span className="text-xs font-bold text-gray-400">د.ع / شهرياً</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                مثالية للمحلات التي تحتاج نقطة بيع وجرد مخزن وسجل ديون دون الحاجة لمتجر أونلاين.
              </p>

              <div className="space-y-2.5 pt-4 border-t border-gray-100 text-xs font-bold text-gray-700">
                <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> كاشير ومبيعات سريعة بجيبك</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> العمل بدون إنترنت (Offline-First)</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> إدارة المخزن وجرد النواقص</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> سجل الديون والزبائن وإرسال الوصولات واتساب</div>
              </div>
            </div>

            <button 
              onClick={() => contactSupport('الباقة الأساسية - 10,000 د.ع')}
              className="mt-8 w-full h-12 rounded-2xl font-bold text-xs bg-gray-900 text-white hover:bg-gray-800 transition flex items-center justify-center gap-2 shadow-sm"
            >
              <MessageCircle size={16} /> تفعيل الباقة الأساسية
            </button>
          </div>

          {/* Pro + Online Store Plan */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-indigo-500 shadow-xl shadow-indigo-100 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-indigo-600 text-white text-[10px] font-black px-4 py-1 rounded-br-2xl flex items-center gap-1">
              <Sparkles size={12} /> الأكثر طلباً للبيجات والتوصيل
            </div>

            <div className="space-y-4 mt-2">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-indigo-950">باقة البرو + المتجر الإلكتروني</h3>
                <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">شامل الكل</span>
              </div>
              <div className="text-3xl font-black text-indigo-600">
                25,000 <span className="text-xs font-bold text-gray-400">د.ع / شهرياً</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                نظام كاشير متكامل بالإضافة إلى رابط متجر خاص لبيجك تضعه في البايو لاستقبال الطلبات آلياً.
              </p>

              <div className="space-y-2.5 pt-4 border-t border-indigo-50 text-xs font-bold text-gray-700">
                <div className="flex items-center gap-2 text-indigo-900 font-black"><CheckCircle2 size={16} className="text-indigo-600" /> كل ميزات الباقة الأساسية بالكامل</div>
                <div className="flex items-center gap-2 text-indigo-900 font-black"><CheckCircle2 size={16} className="text-indigo-600" /> رابط متجر وكتالوج إلكتروني مخصص لبايو الإنستا</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-600" /> استقبال وتثبيت الطلبات آلياً عبر واتساب</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-600" /> قسم متابعة طلبات التوصيل وحسابات المندوبين</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-600" /> دعم فني مباشر وأولوية في التحديثات</div>
              </div>
            </div>

            <button 
              onClick={() => contactSupport('باقة البرو مع المتجر - 25,000 د.ع')}
              className="mt-8 w-full h-12 rounded-2xl font-bold text-xs bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
            >
              <Sparkles size={16} /> تفعيل باقة البرو والمتجر
            </button>
          </div>
        </div>

        {/* Security / Trust Footer */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-500">
          <ShieldCheck size={18} className="text-emerald-500" />
          <span>الدفع يتم عبر زين كاش أو الماستر كارد بعد التواصل مع الدعم الفني.</span>
        </div>
      </main>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase-client';
import { useSubscription } from '@/lib/subscription';
import { 
  ShieldCheck, 
  Sparkles, 
  ExternalLink,
  Plus
} from 'lucide-react';

interface StoreProfile {
  id: string;
  store_id: string;
  store_name: string | null;
  phone: string | null;
  plan_type: 'basic' | 'pro';
  subscription_end_date: string | null;
  is_super_admin: boolean;
  created_at: string;
}

export default function AdminPage() {
  const sub = useSubscription();
  const router = useRouter();
  const [stores, setStores] = useState<StoreProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!sub.loading && !sub.isSuperAdmin) {
      router.push('/');
      return;
    }
    fetchStores();
  }, [sub.loading, sub.isSuperAdmin]);

  async function fetchStores() {
    setLoading(true);
    const { data, error } = await supabase
      .from('users_profile')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      // إزالة التكرار
      const uniqueStores = Array.from(
        new Map(data.filter((s: any) => s.store_id).map((s: any) => [s.store_id, s])).values()
      );
      setStores(uniqueStores as any);
    }
    setLoading(false);
  }

  // تمديد أيام الاشتراك
  async function addDays(store: StoreProfile, days: number) {
    setActionLoading(store.id);
    const validDate = store.subscription_end_date ? new Date(store.subscription_end_date) : new Date();
    const baseDate = !isNaN(validDate.getTime()) && validDate > new Date() ? validDate : new Date();
    baseDate.setDate(baseDate.getDate() + days);

    const newDateStr = baseDate.toISOString();

    const { error } = await supabase
      .from('users_profile')
      .update({ subscription_end_date: newDateStr })
      .eq('store_id', store.store_id);

    if (!error) {
      setStores(prev => prev.map(s => s.store_id === store.store_id ? { ...s, subscription_end_date: newDateStr } : s));
    }
    setActionLoading(null);
  }

  // تغيير نوع الباقة
  async function togglePlan(store: StoreProfile, newPlan: 'basic' | 'pro') {
    setActionLoading(store.id);
    const { error } = await supabase
      .from('users_profile')
      .update({ plan_type: newPlan })
      .eq('store_id', store.store_id);

    if (!error) {
      setStores(prev => prev.map(s => s.store_id === store.store_id ? { ...s, plan_type: newPlan } : s));
    }
    setActionLoading(null);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 pb-20">
      <NavBar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <ShieldCheck className="text-indigo-600" /> لوحة تحكم المنصة العامة
            </h1>
            <p className="text-xs text-gray-500 mt-1">إدارة الاشتراكات، تفعيل المحلات، وتبديل الباقات</p>
          </div>
          <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-4 py-2 rounded-2xl border border-indigo-100">
            إجمالي المحلات المسجلة: {stores.length}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400 font-bold text-sm">جاري تحميل بيانات المتاجر...</div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {stores.map((s, index) => {
              const endDate = s.subscription_end_date ? new Date(s.subscription_end_date) : null;
              const isValidDate = endDate && !isNaN(endDate.getTime());
              const isExpired = isValidDate ? endDate < new Date() : true;
              const daysLeft = isValidDate 
                ? Math.max(0, Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                : 0;

              return (
                <div key={s.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden hover:shadow-md transition">
                  
                  {/* 1. معلومات المتجر (القسم العلوي) */}
                  <div className="p-5 sm:p-6 space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-bold text-gray-900 text-lg">
                        {s.store_name?.trim() ? s.store_name : `متجر رقم #${index + 1}`}
                      </h3>
                      
                      {/* باجة نوع الباقة */}
                      <span className={`text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1 ${
                        s.plan_type === 'pro' 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {s.plan_type === 'pro' ? <><Sparkles size={12} /> برو (25K)</> : 'كاشير أساسي (10K)'}
                      </span>

                      {/* باجة حالة الاشتراك */}
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                        isExpired ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isExpired ? 'منتهي الصلاحية' : `نشط (متبقي ${daysLeft} يوم)`}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span>📞 {s.phone || 'بدون رقم هاتف'}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>معرف المتجر: <code className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono text-slate-700">{s.store_id}</code></span>
                    </div>

                    {/* رابط المتجر إذا كان برو */}
                    {s.plan_type === 'pro' && (
                      <div className="pt-2">
                        <a 
                          href={`/store/${s.store_id}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-700 font-bold hover:underline bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl"
                        >
                          <ExternalLink size={14} /> معاينة المتجر الإلكتروني للزبائن
                        </a>
                      </div>
                    )}
                  </div>

                  {/* 2. أزرار التحكم (القسم السفلي - شريط الإجراءات) */}
                  <div className="bg-slate-50 p-4 sm:px-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                    
                    {/* أزرار تبديل الباقة */}
                    <div className="flex items-center bg-white border border-gray-200 p-1 rounded-xl shadow-sm w-full sm:w-auto">
                      <button
                        disabled={actionLoading === s.id}
                        onClick={() => togglePlan(s, 'basic')}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition ${
                          s.plan_type !== 'pro' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        باقة أساسية
                      </button>
                      <button
                        disabled={actionLoading === s.id}
                        onClick={() => togglePlan(s, 'pro')}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                          s.plan_type === 'pro' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                      >
                        <Sparkles size={14} /> باقة برو
                      </button>
                    </div>

                    {/* أزرار التمديد */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        disabled={actionLoading === s.id}
                        onClick={() => addDays(s, 7)}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 hover:text-indigo-600 text-gray-700 rounded-xl text-xs font-bold transition shadow-sm text-center"
                      >
                        +7 أيام تجربة
                      </button>
                      <button
                        disabled={actionLoading === s.id}
                        onClick={() => addDays(s, 30)}
                        className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-emerald-200 flex items-center justify-center gap-1.5"
                      >
                        <Plus size={16} /> تفعيل 30 يوم
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

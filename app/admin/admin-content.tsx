'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase-client';
import { useSubscription } from '@/lib/subscription';
import { 
  ShieldCheck, 
  Store, 
  Calendar, 
  Sparkles, 
  ExternalLink,
  Phone,
  Clock,
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
      // إزالة التكرار للمتاجر التي تشترك في نفس store_id
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
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
          <div className="grid grid-cols-1 gap-4">
            {stores.map((s, index) => {
              const endDate = s.subscription_end_date ? new Date(s.subscription_end_date) : null;
              const isValidDate = endDate && !isNaN(endDate.getTime());
              const isExpired = isValidDate ? endDate < new Date() : true;
              const daysLeft = isValidDate 
                ? Math.max(0, Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                : 0;

              return (
                <div key={s.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 hover:shadow-md transition">
                  {/* Store Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 text-base">
                        {s.store_name?.trim() ? s.store_name : `متجر رقم #${index + 1}`}
                      </h3>
                      
                      {/* Plan Badge */}
                      <span className={`text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1 ${
                        s.plan_type === 'pro' 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {s.plan_type === 'pro' ? <><Sparkles size={12} /> برو + متجر (25K)</> : 'كاشير أساسي (10K)'}
                      </span>

                      {/* Status Badge */}
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                        isExpired ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isExpired ? 'منتهي الصلاحية' : `نشط (متبقي ${daysLeft} يوم)`}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      <span>📞 {s.phone || 'بدون رقم هاتف'}</span>
                      <span>•</span>
                      <span>معرف المتجر: <code className="bg-gray-100 px-2 py-0.5 rounded text-[11px] text-gray-700">{s.store_id.slice(0, 13)}...</code></span>
                    </div>

                    {/* Store Public Link */}
                    {s.plan_type === 'pro' && (
                      <div className="pt-1">
                        <a 
                          href={`/store/${s.store_id}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-bold hover:underline bg-indigo-50 px-3 py-1 rounded-xl"
                        >
                          <ExternalLink size={13} /> فتح رابط المتجر الإلكتروني للزبائن
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Management Controls */}
                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                    {/* Plan Selector Buttons */}
                    <div className="flex bg-gray-100 p-1 rounded-2xl">
                      <button
                        disabled={actionLoading === s.id}
                        onClick={() => togglePlan(s, 'basic')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          s.plan_type !== 'pro' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        أساسي
                      </button>
                      <button
                        disabled={actionLoading === s.id}
                        onClick={() => togglePlan(s, 'pro')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                          s.plan_type === 'pro' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-indigo-600'
                        }`}
                      >
                        <Sparkles size={12} /> برو
                      </button>
                    </div>

                    {/* Add Days Buttons */}
                    <button
                      disabled={actionLoading === s.id}
                      onClick={() => addDays(s, 30)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1"
                    >
                      <Plus size={14} /> تفعيل شهر (30 يوم)
                    </button>
                    <button
                      disabled={actionLoading === s.id}
                      onClick={() => addDays(s, 7)}
                      className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
                    >
                      +7 أيام
                    </button>
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

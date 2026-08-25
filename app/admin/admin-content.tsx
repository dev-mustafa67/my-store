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
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Zap
} from 'lucide-react';

interface StoreProfile {
  id: string;
  store_id: string;
  store_name: string;
  phone: string;
  plan_type: 'basic' | 'pro';
  subscription_end_date: string;
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

    if (data) setStores(data as any);
    setLoading(false);
  }

  // تمديد أيام الاشتراك
  async function addDays(store: StoreProfile, days: number) {
    setActionLoading(store.id);
    const currentEnd = new Date(store.subscription_end_date);
    const baseDate = currentEnd > new Date() ? currentEnd : new Date();
    baseDate.setDate(baseDate.getDate() + days);

    const { error } = await supabase
      .from('users_profile')
      .update({ subscription_end_date: baseDate.toISOString() })
      .eq('id', store.id);

    if (!error) {
      setStores(prev => prev.map(s => s.id === store.id ? { ...s, subscription_end_date: baseDate.toISOString() } : s));
    }
    setActionLoading(null);
  }

  // تغيير نوع الباقة (Basic أو Pro)
  async function togglePlan(store: StoreProfile, newPlan: 'basic' | 'pro') {
    setActionLoading(store.id);
    const { error } = await supabase
      .from('users_profile')
      .update({ plan_type: newPlan })
      .eq('id', store.id);

    if (!error) {
      setStores(prev => prev.map(s => s.id === store.id ? { ...s, plan_type: newPlan } : s));
    }
    setActionLoading(null);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 pb-20">
      <NavBar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <ShieldCheck className="text-indigo-600" /> لوحة تحكم المنصة العامة
            </h1>
            <p className="text-xs text-gray-500 mt-1">إدارة اشتراكات المحلات وتفعيل باقات البرو والمتجر الإلكتروني</p>
          </div>
          <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-4 py-2 rounded-2xl border border-indigo-100">
            إجمالي المحلات: {stores.length}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400 font-bold text-sm">جاري تحميل المتاجر...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {stores.map((s) => {
              const isExpired = new Date(s.subscription_end_date) < new Date();
              const daysLeft = Math.max(0, Math.ceil((new Date(s.subscription_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

              return (
                <div key={s.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  {/* Store Details */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 text-base">{s.store_name || 'بدون اسم'}</h3>
                      
                      {/* Plan Badge */}
                      <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        s.plan_type === 'pro' 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {s.plan_type === 'pro' ? <><Sparkles size={12} /> برو + متجر</> : 'كاشير أساسي'}
                      </span>

                      {/* Status Badge */}
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        isExpired ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isExpired ? 'منتهي الصلاحية' : `نشط (باقي ${daysLeft} يوم)`}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500">
                      📞 {s.phone || 'بدون رقم'} • معرف المتجر: <span className="font-mono text-gray-600 text-[11px]">{s.store_id}</span>
                    </p>

                    {/* Store Public Link */}
                    {s.plan_type === 'pro' && (
                      <a 
                        href={`/store/${s.store_id}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline pt-1"
                      >
                        <ExternalLink size={12} /> فتح رابط المتجر الإلكتروني
                      </a>
                    )}
                  </div>

                  {/* Management Controls */}
                  <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0">
                    {/* Plan Selector Buttons */}
                    <div className="flex bg-gray-100 p-1 rounded-2xl">
                      <button
                        disabled={actionLoading === s.id}
                        onClick={() => togglePlan(s, 'basic')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          s.plan_type !== 'pro' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        أساسي (10K)
                      </button>
                      <button
                        disabled={actionLoading === s.id}
                        onClick={() => togglePlan(s, 'pro')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                          s.plan_type === 'pro' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-indigo-600'
                        }`}
                      >
                        <Sparkles size={12} /> برو (25K)
                      </button>
                    </div>

                    {/* Add Days Buttons */}
                    <button
                      disabled={actionLoading === s.id}
                      onClick={() => addDays(s, 30)}
                      className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      +30 يوم
                    </button>
                    <button
                      disabled={actionLoading === s.id}
                      onClick={() => addDays(s, 7)}
                      className="px-3 py-2 bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-200 rounded-xl text-xs font-bold transition"
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

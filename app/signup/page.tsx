'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { Shirt, Mail, Lock, User, Store, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteStoreId = searchParams.get('store');
  const isEmployeeInvite = Boolean(inviteStoreId);

  const [fullName, setFullName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAlreadyRegistered(false);

    const { data: authData, error: authError } = await supabase.auth.signUp({ 
      email: email.trim(), 
      password 
    });

    if (authError?.message?.toLowerCase().includes('already registered') || authError?.message?.toLowerCase().includes('already exists')) {
      setAlreadyRegistered(true);
      setLoading(false);
      return;
    }
    
    if (authError || !authData.user) {
      setError('حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة لاحقاً');
      setLoading(false);
      return;
    }

    let targetStoreId = inviteStoreId;

    if (!isEmployeeInvite) {
      // 💡 حساب 3 أيام تجريبية بدقة من لحظة التسجيل
      const trialExpires = new Date();
      trialExpires.setDate(trialExpires.getDate() + 3);

      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert({ 
          name: storeName.trim(),
          subscription_status: 'trial',
          subscription_expires_at: trialExpires.toISOString()
        })
        .select()
        .single();

      if (storeError || !store) {
        setError('تعذّر إنشاء المحل، يرجى المحاولة لاحقاً');
        setLoading(false);
        return;
      }
      targetStoreId = store.id;
    }

    const { error: profileError } = await supabase.from('users_profile').insert({
      id: authData.user.id,
      full_name: fullName.trim(),
      email: email.trim(),
      role: isEmployeeInvite ? 'employee' : 'owner',
      store_id: targetStoreId,
    });

    if (profileError) {
      setError('تم إنشاء الحساب لكن حدث خطأ بالربط، تواصل مع الدعم الفني');
      setLoading(false);
      return;
    }

    if (isEmployeeInvite) {
      router.push('/pos');
    } else {
      router.push('/products');
    }
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#0f172a] relative overflow-hidden">
      {/* خلفية جمالية */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 py-6">
        <form onSubmit={handleSignup} className="bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/20 p-8 sm:p-10 space-y-5">
          
          <div className="text-center space-y-2 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center mx-auto shadow-lg shadow-indigo-200 text-white">
              {isEmployeeInvite ? <User size={30} /> : <Shirt size={30} />}
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {isEmployeeInvite ? 'انضمام موظف جديد' : 'إنشاء متجر جديد'}
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              {isEmployeeInvite ? 'أكمل بياناتك للبدء بالبيع' : 'سجل الآن وابدأ تجربتك المجانية لمدة 3 أيام'}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">الاسم الكامل</label>
              <div className="relative">
                <User size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  required 
                  placeholder="محمد أحمد"
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-12 pr-12 pl-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all" 
                />
              </div>
            </div>

            {!isEmployeeInvite && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">اسم المحل التجاري</label>
                <div className="relative">
                  <Store size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    required 
                    placeholder="بوتيك الأناقة"
                    value={storeName} 
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full h-12 pr-12 pl-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all" 
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">البريد الإلكتروني</label>
              <div className="relative">
                <Mail size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  required 
                  type="email" 
                  placeholder="admin@store.com"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pr-12 pl-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">كلمة المرور (6 أحرف على الأقل)</label>
              <div className="relative">
                <Lock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  required 
                  type={showPassword ? 'text' : 'password'} 
                  minLength={6} 
                  placeholder="••••••••"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pr-12 pl-12 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all" 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {alreadyRegistered && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-2">
              <p className="text-amber-800 text-xs font-bold">هذا البريد الإلكتروني مسجل لدينا بالفعل</p>
              <Link href="/login" className="inline-block px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition">
                الذهاب لتسجيل الدخول
              </Link>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-semibold rounded-xl p-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" /> {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 mt-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-blue-700 focus:ring-4 focus:ring-indigo-100 disabled:opacity-70 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                {isEmployeeInvite ? 'تأكيد الانضمام للمحل' : 'إنشاء المتجر وبدء التجربة المجانية (3 أيام)'} <ArrowRight size={18} />
              </>
            )}
          </button>

          <p className="text-center text-sm text-gray-600 pt-1 font-medium">
            لديك حساب مسبقاً؟{' '}
            <Link href="/login" className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors">
              تسجيل الدخول
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}

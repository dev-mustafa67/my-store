'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteStoreId = searchParams.get('store');
  const isEmployeeInvite = Boolean(inviteStoreId);

  const [fullName, setFullName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAlreadyRegistered(false);

    // 1. إنشاء المستخدم في Supabase Auth
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
      setError('حدث خطأ أثناء إنشاء الحساب: ' + (authError?.message || ''));
      setLoading(false);
      return;
    }

    let targetStoreId = inviteStoreId;

    // 2. إذا كان مالكاً، يتم إنشاء متجر جديد
    if (!isEmployeeInvite) {
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert({ name: storeName.trim() })
        .select()
        .single();

      if (storeError || !store) {
        setError('تعذّر إنشاء المحل — حاول مجدداً');
        setLoading(false);
        return;
      }
      targetStoreId = store.id;
    }

    // 3. ربط الملف الشخصي بالرتبة المناسبة
    const { error: profileError } = await supabase.from('users_profile').insert({
      id: authData.user.id,
      full_name: fullName.trim(),
      email: email.trim(),
      role: isEmployeeInvite ? 'employee' : 'owner',
      store_id: targetStoreId,
    });

    if (profileError) {
      setError('تم إنشاء الحساب لكن تعذّر ربطه بالمحل — يرجى مراجعة إعدادات قاعدة البيانات');
      setLoading(false);
      return;
    }

    // التوجيه المباشر
    if (isEmployeeInvite) {
      router.push('/pos');
    } else {
      router.push('/products');
    }
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <form onSubmit={handleSignup} className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-200 text-2xl text-white font-bold">
            {isEmployeeInvite ? '👤' : '🏪'}
          </div>
          <h1 className="text-xl font-bold text-gray-800">
            {isEmployeeInvite ? 'انضمام موظف جديد' : 'إنشاء متجر جديد'}
          </h1>
        </div>

        {isEmployeeInvite && (
          <p className="text-xs text-center text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 leading-relaxed font-medium">
            ستنضم تلقائياً إلى نظام الكاشير الخاص بالمحل
          </p>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">الاسم الكامل</label>
          <input 
            required 
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
          />
        </div>

        {!isEmployeeInvite && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">اسم المحل</label>
            <input 
              required 
              value={storeName} 
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">البريد الإلكتروني</label>
          <input 
            required 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">كلمة المرور</label>
          <input 
            required 
            type="password" 
            minLength={6} 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
          />
        </div>

        {alreadyRegistered && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-amber-800 text-xs font-semibold mb-2">لديك حساب بهذا البريد مسبقاً</p>
            <a href="/login" className="inline-block px-4 h-8 leading-8 bg-indigo-600 text-white rounded-lg text-xs font-bold">
              سجّل دخولك من هنا
            </a>
          </div>
        )}

        {error && <p className="text-red-600 text-xs bg-red-50 rounded-lg p-2.5 font-medium">{error}</p>}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full h-11 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-100 text-sm mt-2"
        >
          {loading ? 'جاري الحفظ...' : isEmployeeInvite ? 'انضمام للمحل' : 'إنشاء المتجر'}
        </button>

        <p className="text-center text-xs text-gray-500 pt-1">
          لديك حساب؟ <a href="/login" className="text-indigo-600 font-semibold">تسجيل الدخول</a>
        </p>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-gray-400">جاري التحميل...</div>}>
      <SignupForm />
    </Suspense>
  );
}

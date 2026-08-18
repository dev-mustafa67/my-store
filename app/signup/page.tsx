// app/signup/page.tsx
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteStoreId = searchParams.get('store'); // موجود فقط في رابط دعوة موظف
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

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError?.message?.toLowerCase().includes('already registered') || authError?.message?.toLowerCase().includes('already exists')) {
      setAlreadyRegistered(true);
      setLoading(false);
      return;
    }
    if (authError || !authData.user) {
      setError('حدث خطأ أثناء إنشاء الحساب');
      setLoading(false);
      return;
    }

    let storeId = inviteStoreId;

    if (!isEmployeeInvite) {
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert({ name: storeName })
        .select()
        .single();

      if (storeError || !store) {
        setError('تعذّر إنشاء المحل — حاول مجدداً');
        setLoading(false);
        return;
      }
      storeId = store.id;
    }

    const { error: profileError } = await supabase.from('users_profile').insert({
      id: authData.user.id,
      full_name: fullName,
      email,
      role: isEmployeeInvite ? 'employee' : 'owner',
      store_id: storeId,
    });

    if (profileError) {
      setError('تم إنشاء الحساب لكن تعذّر ربطه بالمحل — تواصل مع المالك');
      setLoading(false);
      return;
    }

    router.push('/login');
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSignup} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-gray-800 text-center">
          {isEmployeeInvite ? 'إنشاء حساب موظف' : 'إنشاء حساب مالك محل جديد'}
        </h1>
        {isEmployeeInvite && (
          <p className="text-xs text-center text-indigo-600 bg-indigo-50 rounded-lg py-2">
            سينضم حسابك تلقائياً إلى المحل الذي أرسل لك هذا الرابط
          </p>
        )}

        <div>
          <label className="block text-sm text-gray-600 mb-1">الاسم الكامل</label>
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500" />
        </div>

        {!isEmployeeInvite && (
          <div>
            <label className="block text-sm text-gray-600 mb-1">اسم المحل</label>
            <input required value={storeName} onChange={(e) => setStoreName(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500" />
          </div>
        )}

        <div>
          <label className="block text-sm text-gray-600 mb-1">البريد الإلكتروني</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500" />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">كلمة المرور</label>
          <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500" />
        </div>

        {alreadyRegistered && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-amber-800 text-sm font-semibold mb-2">لديك حساب بهذا البريد مسبقاً</p>
            <a href="/login" className="inline-block px-5 h-9 leading-9 bg-indigo-600 text-white rounded-lg text-sm font-bold">
              سجّل دخولك من هنا
            </a>
          </div>
        )}
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full h-12 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
        </button>

        <p className="text-center text-sm text-gray-500">
          لديك حساب؟ <a href="/login" className="text-indigo-600 font-semibold">تسجيل الدخول</a>
        </p>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>}>
      <SignupForm />
    </Suspense>
  );
}

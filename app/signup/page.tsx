// app/signup/page.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteStoreId = searchParams.get('store'); // موجود فقط في رابط دعوة موظف
  const isEmployeeInvite = Boolean(inviteStoreId);

  const [fullName, setFullName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError || !authData.user) {
      setError(authError?.message === 'User already registered' ? 'هذا البريد مسجّل مسبقاً' : 'حدث خطأ أثناء إنشاء الحساب');
      setLoading(false);
      return;
    }

    let storeId = inviteStoreId;

    if (!isEmployeeInvite) {
      // مالك جديد: أنشئ محلاً جديداً له
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

'use client';

import { useState, Suspense } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. إنشاء المستخدم في Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw لم يتم إنشاء المستخدم بنجاح;

      let targetStoreId = inviteStoreId;

      // 2. إذا لم يكن رابط دعوة موظف، أنشئ متجراً جديداً للمالك
      if (!isEmployeeInvite) {
        if (!storeName.trim()) {
          throw new Error('يرجى إدخال اسم المتجر');
        }
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .insert([{ name: storeName }])
          .select()
          .single();

        if (storeError) throw storeError;
        targetStoreId = storeData.id;
      }

      // 3. إنشاء ملف تعريف المستخدم (Profile) بربطه بالمتجر والدور
      const { error: profileError } = await supabase.from('users_profile').insert([
        {
          id: userId,
          full_name: fullName,
          role: isEmployeeInvite ? 'employee' : 'owner',
          store_id: targetStoreId,
        },
      ]);

      if (profileError) throw profileError;

      // التوجيه للوحة التحكم بعد النجاح
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء التسجيل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          {isEmployeeInvite ? 'إنشاء حساب موظف جديد' : 'تسجيل مالك متجر جديد'}
        </h2>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="أدخل اسمك الكامل"
            />
          </div>

          {!isEmployeeInvite && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم المتجر</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="أدخل اسم محلك أو متجرك"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200 disabled:opacity-50"
          >
            {loading ? 'جاري إنشاء الحساب...' : 'تسجيل الحساب'}
          </button>
        </form>
      </div>
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

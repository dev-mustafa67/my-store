'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { Shirt, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  async function redirectByRole(userId: string) {
    const { data: profile } = await supabase
      .from('users_profile')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role === 'employee') {
      router.replace('/pos');
    } else {
      router.replace('/products');
    }
  }

  useEffect(() => {
    async function checkExistingSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await redirectByRole(session.user.id);
      } else {
        setCheckingSession(false);
      }
    }
    checkExistingSession();
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: loginError } = await supabase.auth.signInWithPassword({ 
      email: email.trim(), 
      password 
    });

    if (loginError || !data.user) {
      setError('البريد أو كلمة المرور غير صحيحة');
      setLoading(false);
      return;
    }

    await redirectByRole(data.user.id);
  }

  if (checkingSession) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white text-sm font-medium">
        جاري التحقق من الحساب...
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <form onSubmit={handleLogin} className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-200">
            <Shirt size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">تسجيل الدخول</h1>
          <p className="text-xs text-gray-400 mt-1">نظام إدارة المخزون والأرباح الذكي</p>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">البريد الإلكتروني</label>
          <div className="relative">
            <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 pr-10 pl-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm" 
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">كلمة المرور</label>
          <div className="relative">
            <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 pr-10 pl-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm" 
            />
          </div>
        </div>

        {error && <p className="text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full h-12 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-200 transition-colors text-sm"
        >
          {loading ? 'جاري الدخول...' : 'دخول'}
        </button>

        <p className="text-center text-xs text-gray-500">
          مالك محل جديد؟ <a href="/signup" className="text-indigo-600 font-semibold">أنشئ حساباً</a>
        </p>
      </form>
    </div>
  );
}

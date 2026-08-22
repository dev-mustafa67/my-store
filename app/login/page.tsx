'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { Shirt, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      setLoading(false);
      return;
    }

    await redirectByRole(data.user.id);
  }

  if (checkingSession) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#0f172a] relative overflow-hidden">
      {/* خلفية جمالية */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <form onSubmit={handleLogin} className="bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/20 p-8 sm:p-10 space-y-6">
          
          <div className="text-center space-y-2 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center mx-auto shadow-lg shadow-indigo-200">
              <Shirt size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">مرحباً بعودتك</h1>
            <p className="text-sm text-gray-500 font-medium">نظام الإدارة الذكي للمتاجر</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">البريد الإلكتروني</label>
              <div className="relative">
                <Mail size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="email" 
                  required 
                  placeholder="admin@store.com"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pr-12 pl-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm transition-all" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">كلمة المرور</label>
              <div className="relative">
                <Lock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  placeholder="••••••••"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pr-12 pl-12 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm transition-all" 
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

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-semibold rounded-xl p-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" /> {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-blue-700 focus:ring-4 focus:ring-indigo-100 disabled:opacity-70 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                تسجيل الدخول <ArrowRight size={18} />
              </>
            )}
          </button>

          <p className="text-center text-sm text-gray-600 pt-2 font-medium">
            ليس لديك حساب؟{' '}
            <Link href="/signup" className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors">
              أنشئ متجرك الآن
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

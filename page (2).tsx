// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('البريد أو كلمة المرور غير صحيحة');
      setLoading(false);
      return;
    }
    router.push('/products');
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-gray-800 text-center">تسجيل الدخول</h1>

        <div>
          <label className="block text-sm text-gray-600 mb-1">البريد الإلكتروني</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">كلمة المرور</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'جاري الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  );
}

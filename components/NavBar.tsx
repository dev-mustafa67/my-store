// components/NavBar.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useUserRole } from '@/lib/permissions';

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOwner } = useUserRole();

  const links = [
    { href: '/products', label: '📦 المنتجات' },
    { href: '/pos', label: '🧾 الكاشير' },
    { href: '/debts', label: '📒 الديون' },
    { href: '/customers', label: '👤 الزبائن' },
    { href: '/analytics', label: '📊 التحليلات' },
  ];

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <nav dir="rtl" className="bg-gray-900 text-white px-4 py-2 flex justify-between items-center flex-wrap gap-2">
      <div className="flex gap-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              pathname === l.href ? 'bg-indigo-600' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3 text-sm">
        {isOwner && <span className="bg-indigo-800 px-3 py-1 rounded-full text-xs font-bold">مالك</span>}
        <button onClick={logout} className="text-gray-300 hover:text-white">تسجيل الخروج</button>
      </div>
    </nav>
  );
}

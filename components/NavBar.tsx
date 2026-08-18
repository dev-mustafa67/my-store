// components/NavBar.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useUserRole } from '@/lib/permissions';
import { useSubscription } from '@/lib/subscription';

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOwner } = useUserRole();
  const sub = useSubscription();

  const links = [
    { href: '/products', label: '📦 المنتجات' },
    { href: '/pos', label: '🧾 الكاشير' },
    { href: '/debts', label: '📒 الديون' },
    { href: '/customers', label: '👤 الزبائن' },
    { href: '/analytics', label: '📊 التحليلات' },
    ...(isOwner ? [{ href: '/billing', label: '💳 الاشتراك' }] : []),
    ...(sub.isSuperAdmin ? [{ href: '/admin', label: '🛠️ إدارة المنصة' }] : []),
  ];

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const showWarning = !sub.loading && sub.status !== 'active' && sub.status !== 'pending_payment';
  const warningText = sub.status === 'expired'
    ? 'انتهت مهلة اشتراكك — جدّده من صفحة "الاشتراك" لمواصلة الاستخدام'
    : sub.daysLeft !== null && sub.daysLeft <= 3
      ? `فترتك التجريبية تنتهي خلال ${sub.daysLeft} يوم`
      : null;

  return (
    <>
      <nav dir="rtl" className="bg-gray-900 text-white px-4 py-2 flex justify-between items-center flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
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
      {showWarning && warningText && (
        <div dir="rtl" className={`px-4 py-2 text-sm font-semibold text-center ${sub.status === 'expired' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
          {warningText} — <Link href="/billing" className="underline">الذهاب لصفحة الاشتراك</Link>
        </div>
      )}
    </>
  );
}

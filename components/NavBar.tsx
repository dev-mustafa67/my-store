// components/NavBar.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useUserRole } from '@/lib/permissions';
import { useSubscription } from '@/lib/subscription';
import { Package, Receipt, BookText, Users, BarChart3, CreditCard, Shield, LogOut, Shirt } from 'lucide-react';

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOwner } = useUserRole();
  const sub = useSubscription();

  const links = [
    { href: '/products', label: 'المنتجات', icon: Package },
    { href: '/pos', label: 'الكاشير', icon: Receipt },
    { href: '/debts', label: 'الديون', icon: BookText },
    { href: '/customers', label: 'الزبائن', icon: Users },
    { href: '/analytics', label: 'التحليلات', icon: BarChart3 },
    ...(isOwner ? [{ href: '/billing', label: 'الاشتراك', icon: CreditCard }] : []),
    ...(sub.isSuperAdmin ? [{ href: '/admin', label: 'إدارة المنصة', icon: Shield }] : []),
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
      <nav dir="rtl" className="bg-gradient-to-l from-slate-900 to-indigo-950 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Shirt size={18} />
            </div>
            <span className="font-bold text-sm hidden sm:inline">إدارة المحل</span>
          </div>

          <div className="flex gap-1 flex-wrap">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  pathname === l.href ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                <l.icon size={15} />
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isOwner && <span className="bg-indigo-500/30 border border-indigo-400/40 px-2.5 py-1 rounded-full text-[11px] font-bold">مالك</span>}
            <button onClick={logout} className="flex items-center gap-1 text-slate-300 hover:text-white text-xs">
              <LogOut size={14} />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
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

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useUserRole } from '@/lib/permissions';
import { useSubscription } from '@/lib/subscription';
import { 
  Package, 
  Receipt, 
  BookText, 
  Users, 
  BarChart3, 
  CreditCard, 
  Shield, 
  LogOut, 
  Shirt, 
  Lock, 
  AlertTriangle,
  Clock
} from 'lucide-react';

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

  // توجيه إجباري إلى صفحة الاشتراك إذا كان الحساب مقفلاً
  useEffect(() => {
    if (!sub.loading && sub.isExpired && !sub.isSuperAdmin) {
      if (pathname !== '/billing' && pathname !== '/login' && pathname !== '/signup') {
        router.replace('/billing');
      }
    }
  }, [sub.loading, sub.isExpired, sub.isSuperAdmin, pathname, router]);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const showWarningBanner =
    !sub.loading &&
    !sub.isExpired &&
    sub.daysLeft !== null &&
    sub.daysLeft <= 3 &&
    sub.daysLeft > 0;

  const isRestricted = !sub.loading && sub.isExpired && !sub.isSuperAdmin;

  return (
    <>
      <nav dir="rtl" className="bg-gradient-to-l from-slate-900 to-indigo-950 text-white shadow-lg print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Shirt size={18} />
            </div>
            <span className="font-bold text-sm hidden sm:inline">إدارة المحل</span>
          </div>

          <div className="flex gap-1 flex-wrap">
            {links.map((l) => {
              const isLockedLink = isRestricted && l.href !== '/billing';

              return (
                <Link
                  key={l.href}
                  href={isLockedLink ? '/billing' : l.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    pathname === l.href 
                      ? 'bg-indigo-600 text-white' 
                      : isLockedLink
                      ? 'text-slate-500 opacity-50 cursor-not-allowed'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <l.icon size={15} />
                  <span className="hidden sm:inline">{l.label}</span>
                  {isLockedLink && <Lock size={10} className="text-red-400" />}
                </Link>
              );
            })}
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

      {/* شريط التحذير قبل 3 أيام */}
      {showWarningBanner && (
        <div dir="rtl" className="bg-amber-500 text-slate-950 px-4 py-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm print:hidden">
          <AlertTriangle size={16} />
          <span>
            تنبيه: متبقٍ {sub.daysLeft} {sub.daysLeft === 1 ? 'يوم واحد' : 'أيام'} على انتهاء فترة اشتراكك!
          </span>
          <Link href="/billing" className="underline mr-2 bg-black/10 px-2 py-0.5 rounded hover:bg-black/20">
            تجديد الاشتراك الآن
          </Link>
        </div>
      )}

      {/* شاشة الحظر الكامل */}
      {isRestricted && pathname !== '/billing' && (
        <div dir="rtl" className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${sub.status === 'pending_payment' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
              {sub.status === 'pending_payment' ? <Clock size={32} /> : <Lock size={32} />}
            </div>
            
            <h2 className="text-xl font-bold text-gray-900">
              {sub.status === 'pending_payment' ? 'طلب التجديد قيد المراجعة' : 'انتهى اشتراك المحل'}
            </h2>
            
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              {sub.status === 'pending_payment'
                ? 'تم استلام طلب التحويل، سيتم فتح كافة أقسام النظام تلقائياً فور مطابقة الدفعة وتفعيلها من قبل الإدارة.'
                : 'لقد انتهت فترة صلاحية المتجر. يرجى تجديد الاشتراك لفتح النظام ومتابعة البيع وإدارة المخزون.'}
            </p>

            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/billing"
                className="w-full h-11 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center justify-center hover:bg-indigo-700 transition"
              >
                صفحة تفاصيل الاشتراك والدفع
              </Link>
              <button
                onClick={logout}
                className="w-full h-10 text-gray-500 text-xs font-semibold hover:text-gray-700"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

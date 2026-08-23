'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
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
  Truck,
  Menu,
  X,
  Store
} from 'lucide-react';

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const sub = useSubscription();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users_profile')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (data?.role === 'owner') {
          setIsOwner(true);
        }
      }
    }
    checkRole();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  // قائمة الروابط الديناميكية
  const links = [
    { href: '/products', label: 'المنتجات', icon: Package },
    { href: '/pos', label: 'الكاشير', icon: Receipt },
    { href: '/delivery', label: 'التوصيل', icon: Truck }, // إضافة قسم التوصيل هنا 🚚
    { href: '/debts', label: 'الديون', icon: BookText },
    { href: '/customers', label: 'الزبائن', icon: Users },
    { href: '/analytics', label: 'التحليلات', icon: BarChart3 },
    ...(isOwner ? [{ href: '/billing', label: 'الاشتراك', icon: CreditCard }] : []),
    ...(sub.isSuperAdmin ? [{ href: '/admin', label: 'إدارة المنصة', icon: Shield }] : []),
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* الشعار وروابط الشاشات الكبيرة */}
          <div className="flex items-center gap-6 lg:gap-8">
            <Link href="/" className="flex items-center gap-2 text-indigo-600">
              <Store size={28} />
              <span className="font-black text-xl tracking-tight text-gray-900">الكاشير</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-1.5">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                      isActive 
                        ? 'bg-indigo-50 text-indigo-700' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* زر تسجيل الخروج وقائمة الهاتف */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut size={18} />
              <span>خروج</span>
            </button>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* القائمة المنسدلة للهاتف (Mobile Menu) */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="px-4 pt-2 pb-4 space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
                  }`}
                >
                  <Icon size={20} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 mt-2 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut size={20} />
              <span>تسجيل خروج</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

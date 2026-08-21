'use client';

import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase-client';
import { Users, Crown, UserMinus, Plus, MessageSquare, ShoppingBag, Search, Sparkles, ArrowUpDown } from 'lucide-react';

interface CustomerAnalytics {
  id: string;
  name: string;
  phone: string | null;
  totalSpent: number;
  ordersCount: number;
  lastPurchaseDate: string | null;
  daysSinceLastPurchase: number | null;
  status: 'vip' | 'regular' | 'inactive' | 'new';
}

export default function CustomersHubPage() {
  const [customers, setCustomers] = useState<CustomerAnalytics[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'vip' | 'inactive'>('all');
  const [search, setSearch] = useState('');

  // نموذج إضافة زبون جديد
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('users_profile').select('store_id').eq('id', user!.id).single();
      if (!profile?.store_id) return;
      setStoreId(profile.store_id);

      // جلب الزبائن والمبيعات
      const { data: rawCustomers } = await supabase.from('customers').select('*').eq('store_id', profile.store_id);
      const { data: rawSales } = await supabase.from('sales').select('customer_id, sale_price_at_time, quantity_sold, sold_at').eq('store_id', profile.store_id);

      const now = new Date().getTime();

      // تجميع مشتريات كل زبون وتحليله ذكياً
      const analyticsMap: CustomerAnalytics[] = (rawCustomers || []).map((cust) => {
        const custSales = (rawSales || []).filter((s) => s.customer_id === cust.id);
        const totalSpent = custSales.reduce((sum, s) => sum + Number(s.sale_price_at_time) * Number(s.quantity_sold), 0);
        const ordersCount = custSales.length;

        // آخر عملية شراء
        let lastDate: string | null = null;
        let daysAgo: number | null = null;

        if (custSales.length > 0) {
          const sorted = [...custSales].sort((a, b) => new Date(b.sold_at).getTime() - new Date(a.sold_at).getTime());
          lastDate = sorted[0].sold_at;
          daysAgo = Math.floor((now - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
        }

        // تحديد الفئة
        let status: 'vip' | 'regular' | 'inactive' | 'new' = 'regular';
        if (totalSpent >= 250000 || ordersCount >= 5) status = 'vip';
        else if (daysAgo !== null && daysAgo > 30) status = 'inactive';
        else if (ordersCount === 0) status = 'new';

        return {
          id: cust.id,
          name: cust.name,
          phone: cust.phone,
          totalSpent,
          ordersCount,
          lastPurchaseDate: lastDate,
          daysSinceLastPurchase: daysAgo,
          status,
        };
      });

      // ترتيب حسب الأكثر إنفاقاً
      analyticsMap.sort((a, b) => b.totalSpent - a.totalSpent);
      setCustomers(analyticsMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!storeId || !newName.trim()) return;

    await supabase.from('customers').insert({
      store_id: storeId,
      name: newName.trim(),
      phone: newPhone.trim() || null,
    });

    setNewName('');
    setNewPhone('');
    setShowAddModal(false);
    loadData();
  }

  // حملة واتساب ذكية مخصصة حسب حالة الزبون
  function sendSmartCampaign(cust: CustomerAnalytics) {
    if (!cust.phone) {
      alert('يرجى إضافة رقم هاتف للزبون أولاً');
      return;
    }
    const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
    let msg = '';

    if (cust.status === 'vip') {
      msg = `أهلاً بك أستاذ ${cust.name} 👑\nتقديراً لكونك من زبائننا المميزين، يسعدنا إعلامك بوصول تشكيلة حصرية جديدة في المتجر مع خصم خاص لك في زيارتك القادمة! تشرفنا دائماً 🙏`;
    } else if (cust.status === 'inactive') {
      msg = `مرحباً أستاذ ${cust.name} 👋\nاشتقنا لزيارتك في متجرنا! وصلت لدينا تشكيلات وموديلات جديدة مميزة جداً ستنال إعجابك. نتمنى أن نراك قريباً ✨`;
    } else {
      msg = `مرحباً أستاذ ${cust.name} 🌸\nيسعدنا تواصلك معنا دائماً، وصلتنا كولكشن جديدة هذا الأسبوع ويسرنا اطلاعك عليها في المحل!`;
    }

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  const filteredList = customers.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search));
    if (filter === 'vip') return matchSearch && c.status === 'vip';
    if (filter === 'inactive') return matchSearch && c.status === 'inactive';
    return matchSearch;
  });

  const vipCount = customers.filter((c) => c.status === 'vip').length;
  const inactiveCount = customers.filter((c) => c.status === 'inactive').length;

  return (
    <div dir="rtl">
      <NavBar />
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* ترويسة الصفحة والأزرار السريعة */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-indigo-600" size={24} /> مركز علاقات وذاكرة الزبائن
            </h2>
            <p className="text-xs text-gray-500 mt-1">تتبع ولاء المشترين واستعد الزبائن الغائبين بنقرة زر واحدة</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 h-10 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100"
          >
            <Plus size={16} /> إضافة زبون جديد
          </button>
        </div>

        {/* بطاقات المؤشرات السريعة */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">إجمالي قاعدة الزبائن</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{customers.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-600 font-medium">زبائن مميزين (VIP)</p>
              <p className="text-xl font-bold text-amber-600 mt-1">{vipCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Crown size={20} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-rose-600 font-medium">زبائن منقطعون (30+ يوم)</p>
              <p className="text-xl font-bold text-rose-600 mt-1">{inactiveCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <UserMinus size={20} />
            </div>
          </div>
        </div>

        {/* أدوات التصفية والبحث */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex gap-1 w-full sm:w-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filter === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              الجميع ({customers.length})
            </button>
            <button
              onClick={() => setFilter('vip')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${filter === 'vip' ? 'bg-amber-500 text-white' : 'text-amber-700 bg-amber-50'}`}
            >
              <Crown size={13} /> VIP ({vipCount})
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${filter === 'inactive' ? 'bg-rose-500 text-white' : 'text-rose-700 bg-rose-50'}`}
            >
              <UserMinus size={13} /> يحتاجون تنشيط ({inactiveCount})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute right-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pr-8 pl-3 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* قائمة بطاقات الزبائن */}
        {loading ? (
          <p className="text-center py-10 text-gray-400 text-sm">جاري تحليل بيانات الزبائن...</p>
        ) : (
          <div className="space-y-3">
            {filteredList.map((c) => (
              <div key={c.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:border-indigo-100 transition">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-800 text-sm">{c.name}</p>
                    {c.status === 'vip' && <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5"><Crown size={10} /> VIP</span>}
                    {c.status === 'inactive' && <span className="bg-rose-50 text-rose-600 text-[10px] px-2 py-0.5 rounded-full font-bold">غائب منذ {c.daysSinceLastPurchase} يوم</span>}
                    {c.status === 'new' && <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-bold">زبون جديد</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-1 flex-wrap">
                    <span>الهاتف: <span className="font-mono text-gray-700">{c.phone || 'غير مسجل'}</span></span>
                    <span>العمليات: <strong className="text-gray-800">{c.ordersCount}</strong></span>
                    <span>إجمالي المشتريات: <strong className="text-indigo-600">{c.totalSpent.toLocaleString()} د.ع</strong></span>
                  </div>
                </div>

                {/* زر الحملة التسويقية عبر واتساب */}
                {c.phone && (
                  <button
                    onClick={() => sendSmartCampaign(c)}
                    className="flex items-center justify-center gap-1.5 px-3.5 h-9 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition border border-emerald-200 shrink-0"
                  >
                    <MessageSquare size={14} />
                    <span>{c.status === 'inactive' ? 'رسالة استعادة' : 'عرض واتساب'}</span>
                  </button>
                )}
              </div>
            ))}
            {filteredList.length === 0 && <p className="text-gray-400 text-sm text-center py-10">لا يوجد زبائن يطابقون الفرز.</p>}
          </div>
        )}

        {/* نافذة إضافة زبون */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
              <h3 className="font-bold text-gray-800 text-base">إضافة زبون جديد لقاعدة البيانات</h3>
              <form onSubmit={handleAddCustomer} className="space-y-3">
                <input
                  required
                  placeholder="اسم الزبون *"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  placeholder="رقم الهاتف (للواتساب من دون اضافة الصفر في البداية)"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 h-10 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700">
                    حفظ الزبون
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 h-10 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

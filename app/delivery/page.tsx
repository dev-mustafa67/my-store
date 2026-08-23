'use client';

import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase-client';
import { db } from '@/lib/offline-db';
import { Truck, CheckCircle2, XCircle, Clock, MapPin, Instagram, Phone, Package } from 'lucide-react';

export default function DeliveryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('users_profile').select('store_id').eq('id', user.id).single();
    if (!profile?.store_id) return;

    const { data } = await supabase
      .from('delivery_orders')
      .select('*')
      .eq('store_id', profile.store_id)
      .order('created_at', { ascending: false });

    if (data) setOrders(data);
    setLoading(false);
  }

  // الدالة الذكية والمضمونة لتحديث الحالة ومعالجة المرتجعات
  async function updateStatus(id: string, newStatus: string) {
    setUpdating(true);
    try {
      // 1. تحديث الحالة في قاعدة البيانات
      const { error } = await supabase.from('delivery_orders').update({ status: newStatus }).eq('id', id);
      if (error) throw error;

      setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));

      // 2. هندسة الاسترجاع الجذري
      if (newStatus === 'returned') {
        const order = orders.find(o => o.id === id);
        
        if (!order || !order.cart_data || !order.sales_ids) {
          alert('⚠️ هذا الطلب قديم (قبل التحديث)، يرجى إرجاع مبلغه والقطع للمخزون يدوياً.');
          setUpdating(false);
          return;
        }

        // أ) إرجاع الكميات للمخزون (محلياً وسيرفر)
        const cartData = typeof order.cart_data === 'string' ? JSON.parse(order.cart_data) : order.cart_data;
        
        for (const item of cartData) {
          // إرجاع للسيرفر
          const { data: variantData } = await supabase.from('product_variants').select('quantity').eq('id', item.id).single();
          if (variantData) {
            await supabase.from('product_variants').update({ quantity: variantData.quantity + item.qtyInCart }).eq('id', item.id);
          }
          // إرجاع للمخزن المحلي
          const localVariant = await db.product_variants.get(item.id);
          if (localVariant) {
            await db.product_variants.update(item.id, { quantity: localVariant.quantity + item.qtyInCart });
          }
        }

        // ب) مسح المبيعات من الدرج (السيرفر والمحلي) لكي ينقص الربح الفعلي
        const salesIds = typeof order.sales_ids === 'string' ? JSON.parse(order.sales_ids) : order.sales_ids;
        if (salesIds && salesIds.length > 0) {
          // مسح من السيرفر
          await supabase.from('sales').delete().in('id', salesIds);
          
          // مسح من الطابور المحلي (في حال انقطع النت ولم تُرفع بعد)
          for (const sId of salesIds) {
            await db.sales_queue.delete(sId);
          }
        }

        alert('تم تسجيل الطلب كراجع ✅\nتم إرجاع القطع للمخزون وخصم المبلغ من أرباح اليوم بنجاح.');
      }
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء التحديث: ' + err.message);
    } finally {
      setUpdating(false);
    }
  }

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const completedOrders = orders.filter(o => o.status === 'completed');
  const returnedOrders = orders.filter(o => o.status === 'returned');

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 pb-10">
      <NavBar />
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Truck className="text-indigo-600" /> إدارة طلبات التوصيل
            </h1>
            <p className="text-sm text-gray-500 mt-1">تابع طلبات بيج الانستا وحالة التوصيل مع المندوبين</p>
          </div>
          <div className="text-center bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
            <span className="block text-xs font-bold text-indigo-600">الطلبات النشطة</span>
            <span className="text-xl font-black text-indigo-900">{pendingOrders.length}</span>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-10">جاري تحميل الطلبات...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* قيد التوصيل */}
            <div className="space-y-4">
              <h2 className="font-bold text-gray-700 flex items-center gap-1.5 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg w-fit text-sm">
                <Clock size={16} /> قيد التوصيل ({pendingOrders.length})
              </h2>
              {pendingOrders.map(order => (
                <OrderCard key={order.id} order={order} onUpdate={updateStatus} updating={updating} />
              ))}
              {pendingOrders.length === 0 && <p className="text-xs text-gray-400">لا توجد طلبات قيد التوصيل</p>}
            </div>

            {/* تم الاستلام */}
            <div className="space-y-4">
              <h2 className="font-bold text-gray-700 flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg w-fit text-sm">
                <CheckCircle2 size={16} /> تم الاستلام ({completedOrders.length})
              </h2>
              {completedOrders.map(order => (
                <OrderCard key={order.id} order={order} onUpdate={updateStatus} updating={updating} />
              ))}
            </div>

            {/* راجع */}
            <div className="space-y-4">
              <h2 className="font-bold text-gray-700 flex items-center gap-1.5 bg-red-100 text-red-800 px-3 py-1.5 rounded-lg w-fit text-sm">
                <XCircle size={16} /> راجع / ملغى ({returnedOrders.length})
              </h2>
              {returnedOrders.map(order => (
                <OrderCard key={order.id} order={order} onUpdate={updateStatus} updating={updating} />
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onUpdate, updating }: { order: any, onUpdate: any, updating: boolean }) {
  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
      order.status === 'pending' ? 'border-amber-200 shadow-amber-100/50' : 
      order.status === 'completed' ? 'border-emerald-200 opacity-70' : 'border-red-200 opacity-70'
    }`}>
      <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-3">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">{order.customer_name}</h3>
          {order.instagram && <p className="text-xs text-pink-600 flex items-center gap-1 mt-1"><Instagram size={12}/> {order.instagram}</p>}
        </div>
        <span className="text-sm font-black text-indigo-600">{order.total_amount.toLocaleString()} د.ع</span>
      </div>

      <div className="space-y-1.5 mb-4 text-xs text-gray-600">
        {order.phone && <p className="flex items-center gap-1.5"><Phone size={14} className="text-gray-400"/> {order.phone}</p>}
        {order.location && <p className="flex items-center gap-1.5"><MapPin size={14} className="text-gray-400"/> {order.location}</p>}
        <p className="flex items-start gap-1.5"><Package size={14} className="text-gray-400 shrink-0 mt-0.5"/> <span className="line-clamp-2">{order.items_summary}</span></p>
      </div>

      {order.status === 'pending' && (
        <div className="flex gap-2 pt-2">
          <button disabled={updating} onClick={() => onUpdate(order.id, 'completed')} className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white disabled:opacity-50 border border-emerald-200 rounded-xl py-2 text-xs font-bold transition flex justify-center items-center gap-1">
            <CheckCircle2 size={14} /> استلام
          </button>
          <button disabled={updating} onClick={() => onUpdate(order.id, 'returned')} className="flex-1 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white disabled:opacity-50 border border-red-200 rounded-xl py-2 text-xs font-bold transition flex justify-center items-center gap-1">
            <XCircle size={14} /> راجع
          </button>
        </div>
      )}
    </div>
  );
}

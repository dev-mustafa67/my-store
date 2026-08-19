// app/pos/page.tsx
'use client';

import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase-client';
import { db } from '@/lib/offline-db';
import { syncQueue, initAutoSync } from '@/lib/sync-queue';
import { CheckCircle, Trash2 } from 'lucide-react';

export default function POSPage() {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [online, setOnline] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [onCredit, setOnCredit] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('users_profile').select('store_id').eq('id', user!.id).single();
      setStoreId(profile!.store_id);
      initAutoSync(profile!.store_id);
      await syncQueue(profile!.store_id);
      const local = await db.product_variants.toArray();
      setProducts(local);
      const { data: custs } = await supabase.from('customers').select('*').eq('store_id', profile!.store_id);
      setCustomers(custs ?? []);
    })();

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  function addToCart(p: any) {
    if (p.quantity <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === p.id);
      if (existing) {
        if (existing.qtyInCart >= p.quantity) return prev;
        return prev.map((i) => (i.id === p.id ? { ...i, qtyInCart: i.qtyInCart + 1 } : i));
      }
      return [...prev, { ...p, qtyInCart: 1 }];
    });
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  async function completeSale() {
    if (!storeId) return;
    if (onCredit && !selectedCustomer) { alert('اختر الزبون أولاً لتسجيل بيع بالدين'); return; }

    const saleId = crypto.randomUUID();
    const now = new Date().toISOString();
    const customer = customers.find((c) => c.id === selectedCustomer);

    for (const item of cart) {
      await db.sales_queue.add({
        id: crypto.randomUUID(),
        saleId,
        storeId,
        variantId: item.id,
        quantitySold: item.qtyInCart,
        salePriceAtTime: item.salePrice,
        costPriceAtTime: item.costPrice,
        soldAt: now,
        synced: false,
        syncAttempts: 0,
        customerId: selectedCustomer || null,
        onCredit,
      } as any);
      await db.product_variants.update(item.id, {
        quantity: item.quantity - item.qtyInCart,
        lastSoldAt: now,
      });

      if (onCredit && customer) {
        await supabase.from('debts').insert({
          store_id: storeId,
          customer_id: customer.id,
          customer_name: customer.name,
          amount: item.salePrice * item.qtyInCart,
          note: `بيع بالدين: ${item.productName}`,
        });
      }
    }

    setCart([]);
    setOnCredit(false);
    setSelectedCustomer('');
    const local = await db.product_variants.toArray();
    setProducts(local);
    if (navigator.onLine) syncQueue(storeId);
  }

  const total = cart.reduce((s, i) => s + i.salePrice * i.qtyInCart, 0);

  return (
    <div dir="rtl">
      <NavBar />
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className={`rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 ${online ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
          <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-amber-500'}`} />
          {online ? 'متصل — المبيعات تُزامَن فوراً' : 'غير متصل — المبيعات تُحفظ محلياً وستُزامَن عند عودة الإنترنت'}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex gap-3 flex-wrap items-center">
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="h-11 px-3 rounded-lg border border-gray-200 flex-1 min-w-[140px]"
          >
            <option value="">بدون زبون محدد</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm bg-gray-50 px-3 h-11 rounded-lg">
            <input type="checkbox" checked={onCredit} onChange={(e) => setOnCredit(e.target.checked)} />
            بيع بالدين (آجل)
          </label>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">المنتجات</h2>
          <div className="space-y-2">
            {products.map((p) => (
              <div key={p.id} className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors p-3.5 rounded-xl">
                <span className="text-sm text-gray-700">{p.productName} <span className="text-gray-400">({p.color}/{p.size})</span> — متوفر: {p.quantity}</span>
                <button onClick={() => addToCart(p)} disabled={p.quantity <= 0} className="px-4 h-9 bg-indigo-600 text-white rounded-lg text-sm font-bold disabled:opacity-40 hover:bg-indigo-700 shrink-0">
                  بيع
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">السلة</h2>
          {cart.map((i) => (
            <div key={i.id} className="flex justify-between items-center py-2.5 border-b border-gray-100 text-sm">
              <span>{i.productName} × {i.qtyInCart}</span>
              <div className="flex items-center gap-3">
                <span className="font-bold text-indigo-600">{(i.salePrice * i.qtyInCart).toLocaleString()} د.ع</span>
                <button onClick={() => removeFromCart(i.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          {cart.length === 0 && <p className="text-gray-400 text-sm text-center py-4">السلة فارغة.</p>}
          <div className="flex justify-between items-center pt-4 flex-wrap gap-3">
            <span className="text-lg sm:text-xl font-bold text-gray-800">الإجمالي: {total.toLocaleString()} د.ع</span>
            <button onClick={completeSale} disabled={cart.length === 0} className="flex items-center gap-2 px-6 h-12 bg-green-600 text-white rounded-xl font-bold disabled:opacity-40 hover:bg-green-700 shadow-md shadow-green-100">
              <CheckCircle size={20} /> إتمام البيع
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

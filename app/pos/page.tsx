'use client';

import { useEffect, useState, useRef } from 'react';
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase-client';
import { db } from '@/lib/offline-db';
import { syncQueue, initAutoSync } from '@/lib/sync-queue';
import { CheckCircle, Trash2, PauseCircle, PlayCircle, Barcode, MessageSquare, Search } from 'lucide-react';

export default function POSPage() {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [online, setOnline] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [onCredit, setOnCredit] = useState(false);
  
  // ميزات جديدة: تعليق الفواتير والباركود
  const [heldOrders, setHeldOrders] = useState<{ id: string; cart: any[]; time: string; customer: string }[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);

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

  function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const found = products.find((p) => p.barcode === barcodeInput.trim() || p.productName.toLowerCase().includes(barcodeInput.toLowerCase()));
    if (found) {
      addToCart(found);
      setBarcodeInput('');
    } else {
      alert('المنتج غير موجود');
    }
  }

  function holdCurrentCart() {
    if (cart.length === 0) return;
    const cust = customers.find(c => c.id === selectedCustomer);
    setHeldOrders(prev => [...prev, {
      id: crypto.randomUUID(),
      cart: [...cart],
      time: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
      customer: cust ? cust.name : 'زبون عام'
    }]);
    setCart([]);
    setSelectedCustomer('');
  }

  function restoreCart(orderId: string) {
    const order = heldOrders.find(o => o.id === orderId);
    if (!order) return;
    setCart(order.cart);
    setHeldOrders(prev => prev.filter(o => o.id !== orderId));
  }

  function sendWhatsAppReceipt(customerPhone?: string) {
    const cust = customers.find((c) => c.id === selectedCustomer);
    const phone = customerPhone || cust?.phone;
    if (!phone) {
      const manualPhone = prompt('أدخل رقم هاتف الزبون لإرسال الفاتورة عبر الواتساب (مثال: 9647700000000):');
      if (!manualPhone) return;
      generateWhatsAppURL(manualPhone);
      return;
    }
    generateWhatsAppURL(phone);
  }

  function generateWhatsAppURL(phone: string) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    let text = `*🧾 فاتورة مشتريات*\n----------------------\n`;
    cart.forEach((i) => {
      text += `▪️ ${i.productName} (${i.color || ''}/${i.size || ''}) × ${i.qtyInCart} = ${(i.salePrice * i.qtyInCart).toLocaleString()} د.ع\n`;
    });
    text += `----------------------\n*الإجمالي:* ${total.toLocaleString()} د.ع\nشكراً لزيارتكم! 🙏`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
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
          customer_phone: customer.phone || null,
          amount: item.salePrice * item.qtyInCart,
          note: `بيع بالدين: ${item.productName}`,
        });
      }
    }

    // خيار إرسال فاتورة واتساب
    if (customer?.phone && confirm('هل تريد إرسال الفاتورة للزبون عبر الواتساب؟')) {
      sendWhatsAppReceipt(customer.phone);
    }

    setCart([]);
    setOnCredit(false);
    setSelectedCustomer('');
    const local = await db.product_variants.toArray();
    setProducts(local);
    if (navigator.onLine) syncQueue(storeId);
  }

  const total = cart.reduce((s, i) => s + i.salePrice * i.qtyInCart, 0);
  const filteredProducts = products.filter(p => p.productName?.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode?.includes(searchQuery));

  return (
    <div dir="rtl">
      <NavBar />
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className={`rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 ${online ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
          <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-amber-500'}`} />
          {online ? 'متصل — المبيعات تُزامَن فوراً' : 'غير متصل — المبيعات تُحفظ محلياً'}
        </div>

        {/* مسح الباركود السريع */}
        <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Barcode className="absolute right-3 top-3 text-gray-400" size={20} />
            <input
              ref={barcodeRef}
              type="text"
              placeholder="امسح الباركود أو اكتب اسم القطعة واضغط Enter..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="w-full h-11 pr-10 pl-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
          <button type="submit" className="px-5 h-11 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700">إضافة</button>
        </form>

        {/* الفواتير المعلقة */}
        {heldOrders.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-3 overflow-x-auto">
            <span className="text-xs font-bold text-amber-800 shrink-0">فواتير معلقة:</span>
            {heldOrders.map((o) => (
              <button
                key={o.id}
                onClick={() => restoreCart(o.id)}
                className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-semibold text-gray-700 shadow-sm shrink-0 hover:bg-amber-100"
              >
                <PlayCircle size={14} className="text-amber-600" />
                <span>{o.customer} ({o.time})</span>
              </button>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex gap-3 flex-wrap items-center">
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="h-11 px-3 rounded-lg border border-gray-200 flex-1 min-w-[140px] text-sm"
          >
            <option value="">زبون عام (بدون تحديد)</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm bg-gray-50 px-3 h-11 rounded-lg cursor-pointer">
            <input type="checkbox" checked={onCredit} onChange={(e) => setOnCredit(e.target.checked)} />
            <span>بيع بالدين (آجل)</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* قسم المنتجات */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-bold text-gray-800">المنتجات</h2>
              <div className="relative w-40">
                <Search size={14} className="absolute right-2.5 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pr-7 pl-2 text-xs border rounded-lg outline-none"
                />
              </div>
            </div>
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => (
                <div key={p.id} className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 p-3 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{p.productName}</p>
                    <p className="text-xs text-gray-400">{p.color} / {p.size} — متوفر: <span className={p.quantity <= 3 ? 'text-red-500 font-bold' : ''}>{p.quantity}</span></p>
                  </div>
                  <button onClick={() => addToCart(p)} disabled={p.quantity <= 0} className="px-3.5 h-8 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-30 hover:bg-indigo-700">
                    + إضافة
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* قسم السلة */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-base font-bold text-gray-800">سلة البيع</h2>
                {cart.length > 0 && (
                  <button onClick={holdCurrentCart} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-bold">
                    <PauseCircle size={14} /> تعليق الفاتورة
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {cart.map((i) => (
                  <div key={i.id} className="flex justify-between items-center py-2 border-b border-gray-100 text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{i.productName}</p>
                      <p className="text-xs text-gray-400">{i.salePrice.toLocaleString()} × {i.qtyInCart}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-indigo-600">{(i.salePrice * i.qtyInCart).toLocaleString()} د.ع</span>
                      <button onClick={() => removeFromCart(i.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && <p className="text-gray-400 text-sm text-center py-10">السلة فارغة.</p>}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-gray-800">الإجمالي:</span>
                <span className="text-xl font-bold text-indigo-600">{total.toLocaleString()} د.ع</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => sendWhatsAppReceipt()} disabled={cart.length === 0} className="flex-1 flex items-center justify-center gap-1.5 h-11 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-40">
                  <MessageSquare size={16} /> فاتورة واتساب
                </button>
                <button onClick={completeSale} disabled={cart.length === 0} className="flex-1 flex items-center justify-center gap-1.5 h-11 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-40 shadow-md">
                  <CheckCircle size={16} /> إتمام البيع
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

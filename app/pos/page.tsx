'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase-client';
import { db } from '@/lib/offline-db';
import { syncQueue, initAutoSync } from '@/lib/sync-queue';
import { useSubscription } from '@/lib/subscription';
import { CheckCircle, Trash2, PauseCircle, PlayCircle, Barcode, MessageSquare, Search, Lock, Plus, X, MapPin, Instagram, User, Phone } from 'lucide-react';

export default function POSPage() {
  const sub = useSubscription();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [online, setOnline] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [onCredit, setOnCredit] = useState(false);
  
  const [heldOrders, setHeldOrders] = useState<{ id: string; cart: any[]; time: string; customer: string }[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);

  // حالة نافذة إضافة زبون انستا/توصيل
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', instagram: '', location: '' });
  const [addingCust, setAddingCust] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('users_profile').select('store_id').eq('id', user.id).single();
      if (!profile?.store_id) return;
      
      setStoreId(profile.store_id);
      initAutoSync(profile.store_id);
      await syncQueue(profile.store_id);
      const local = await db.product_variants.toArray();
      setProducts(local);
      const { data: custs } = await supabase.from('customers').select('*').eq('store_id', profile.store_id);
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
    if (sub.isExpired && !sub.isSuperAdmin) {
      alert('عذراً، انتهت فترة اشتراك المحل. يرجى التجديد للمتابعة.');
      return;
    }
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
    if (sub.isExpired && !sub.isSuperAdmin) return;
    if (!barcodeInput.trim()) return;
    const found = products.find((p) => p.barcode === barcodeInput.trim() || p.productName?.toLowerCase().includes(barcodeInput.toLowerCase()));
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

  // إضافة زبون جديد سريع (انستا / توصيل)
  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!newCust.name.trim() || !storeId) return;
    setAddingCust(true);
    try {
      const { data, error } = await supabase.from('customers').insert({
        store_id: storeId,
        name: newCust.name.trim(),
        phone: newCust.phone.trim() || null,
        instagram: newCust.instagram.trim() || null,
        location: newCust.location.trim() || null
      }).select().single();

      if (error) throw error;
      if (data) {
        setCustomers(prev => [...prev, data]);
        setSelectedCustomer(data.id);
        setShowAddCustomer(false);
        setNewCust({ name: '', phone: '', instagram: '', location: '' });
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إضافة الزبون');
    } finally {
      setAddingCust(false);
    }
  }

  function sendWhatsAppReceipt() {
    const cust = customers.find((c) => c.id === selectedCustomer);
    
    // إذا لم يتم تحديد زبون، نطلب رقم فقط
    if (!cust) {
      const manualPhone = prompt('أدخل رقم هاتف الزبون لإرسال الفاتورة عبر الواتساب:');
      if (!manualPhone) return;
      generateWhatsAppURL(manualPhone, null);
      return;
    }
    
    // إذا تم تحديد زبون، نرسل التفاصيل كاملة
    const phoneToUse = cust.phone || prompt('الزبون ليس لديه رقم مسجل، يرجى إدخال رقمه:');
    if (!phoneToUse) return;
    
    generateWhatsAppURL(phoneToUse, cust);
  }

  function generateWhatsAppURL(phone: string, custDetails: any) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    let text = `*📦 تفاصيل الطلب / الفاتورة*\n`;
    text += `----------------------\n`;
    
    if (custDetails) {
      text += `👤 *الاسم:* ${custDetails.name}\n`;
      if (custDetails.phone) text += `📞 *الهاتف:* ${custDetails.phone}\n`;
      if (custDetails.location) text += `📍 *العنوان:* ${custDetails.location}\n`;
      if (custDetails.instagram) text += `📱 *حساب الانستا:* ${custDetails.instagram}\n`;
      text += `----------------------\n`;
    }

    text += `*🛒 المنتجات:*\n`;
    cart.forEach((i) => {
      text += `▪️ ${i.productName} (${i.color || ''}/${i.size || ''}) × ${i.qtyInCart} = ${(i.salePrice * i.qtyInCart).toLocaleString()} د.ع\n`;
    });
    text += `----------------------\n*💰 الإجمالي الكلي:* ${total.toLocaleString()} د.ع\nشكراً لتعاملكم معنا! 🙏`;
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  async function completeSale() {
    if (sub.isExpired && !sub.isSuperAdmin) return;
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

    if (confirm('هل تريد إرسال تفاصيل الطلب للزبون (أو للمندوب) عبر الواتساب؟')) {
      sendWhatsAppReceipt();
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
    <div dir="rtl" className="relative min-h-screen pb-10">
      <NavBar />

      {sub.isExpired && !sub.isSuperAdmin && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <Lock size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">الكاشير مقفل</h3>
            <p className="text-xs text-gray-500">يرجى تجديد الاشتراك لتفعيل عمليات البيع.</p>
            <Link href="/billing" className="block w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold">الذهاب لصفحة الاشتراك</Link>
          </div>
        </div>
      )}

      {/* نافذة إضافة زبون جديد سريعة */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus size={20} className="text-indigo-600" /> إضافة زبون / طلب جديد
              </h3>
              <button onClick={() => setShowAddCustomer(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">اسم الزبون / البيج <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User size={16} className="absolute right-3 top-3 text-gray-400" />
                  <input required autoFocus type="text" value={newCust.name} onChange={e => setNewCust({...newCust, name: e.target.value})} className="w-full h-10 pr-9 pl-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-500" placeholder="مثال: أحمد توصيل بصرة" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">رقم الهاتف (اختياري)</label>
                <div className="relative">
                  <Phone size={16} className="absolute right-3 top-3 text-gray-400" />
                  <input type="text" value={newCust.phone} onChange={e => setNewCust({...newCust, phone: e.target.value})} className="w-full h-10 pr-9 pl-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-500" placeholder="07xxxxxxxxx" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">يوزر الانستا (اختياري)</label>
                <div className="relative">
                  <Instagram size={16} className="absolute right-3 top-3 text-gray-400" />
                  <input type="text" value={newCust.instagram} onChange={e => setNewCust({...newCust, instagram: e.target.value})} className="w-full h-10 pr-9 pl-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-500" placeholder="@username" dir="ltr" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">العنوان / المحافظة (اختياري)</label>
                <div className="relative">
                  <MapPin size={16} className="absolute right-3 top-3 text-gray-400" />
                  <input type="text" value={newCust.location} onChange={e => setNewCust({...newCust, location: e.target.value})} className="w-full h-10 pr-9 pl-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-500" placeholder="مثال: بغداد - المنصور" />
                </div>
              </div>

              <button type="submit" disabled={addingCust} className="w-full h-11 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 mt-2">
                {addingCust ? 'جاري الحفظ...' : 'حفظ الزبون وبدء الطلب'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className={`rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 ${online ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
          <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-amber-500'}`} />
          {online ? 'متصل — المبيعات تُزامَن فوراً' : 'غير متصل — المبيعات تُحفظ محلياً'}
        </div>

        <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Barcode className="absolute right-3 top-3 text-gray-400" size={20} />
            <input ref={barcodeRef} type="text" placeholder="امسح الباركود أو اكتب اسم القطعة واضغط Enter..." value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} className="w-full h-11 pr-10 pl-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>
          <button type="submit" className="px-5 h-11 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700">إضافة</button>
        </form>

        {heldOrders.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-3 overflow-x-auto">
            <span className="text-xs font-bold text-amber-800 shrink-0">فواتير معلقة:</span>
            {heldOrders.map((o) => (
              <button key={o.id} onClick={() => restoreCart(o.id)} className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-semibold text-gray-700 shadow-sm shrink-0 hover:bg-amber-100">
                <PlayCircle size={14} className="text-amber-600" />
                <span>{o.customer} ({o.time})</span>
              </button>
            ))}
          </div>
        )}

        {/* قسم اختيار الزبون مع زر الإضافة السريع */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex w-full gap-2">
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="h-11 px-3 rounded-xl border border-gray-200 flex-1 min-w-[140px] text-sm outline-none focus:border-indigo-500 bg-gray-50"
            >
              <option value="">زبون عام (كاشير مباشر)</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} {c.instagram ? `(${c.instagram})` : ''}</option>)}
            </select>
            <button 
              onClick={() => setShowAddCustomer(true)}
              className="h-11 px-4 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl flex items-center gap-1.5 text-xs font-bold hover:bg-indigo-100 transition whitespace-nowrap shrink-0"
            >
              <Plus size={16} /> <span className="hidden sm:inline">زبون جديد / توصيل</span>
            </button>
          </div>
          
          <label className="flex items-center gap-2 text-sm bg-gray-50 border border-gray-200 px-4 h-11 rounded-xl cursor-pointer w-full sm:w-auto shrink-0">
            <input type="checkbox" checked={onCredit} onChange={(e) => setOnCredit(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
            <span className="font-semibold text-gray-700">تسجيل بالديون (آجل)</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-gray-800">المنتجات</h2>
              <div className="relative w-40">
                <Search size={14} className="absolute right-2.5 top-2.5 text-gray-400" />
                <input type="text" placeholder="بحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-9 pr-8 pl-2 text-xs border border-gray-200 rounded-lg outline-none bg-gray-50 focus:bg-white" />
              </div>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredProducts.map((p) => (
                <div key={p.id} className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 p-3 rounded-xl border border-transparent hover:border-gray-200 transition">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{p.productName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.color} / {p.size} — متوفر: <span className={p.quantity <= 3 ? 'text-red-500 font-bold' : 'text-indigo-600 font-bold'}>{p.quantity}</span></p>
                  </div>
                  <button onClick={() => addToCart(p)} disabled={p.quantity <= 0 || (sub.isExpired && !sub.isSuperAdmin)} className="px-4 h-9 bg-indigo-600 text-white rounded-xl text-xs font-bold disabled:opacity-30 hover:bg-indigo-700 shadow-sm">
                    إضافة
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-bold text-gray-800">سلة الطلبات</h2>
                {cart.length > 0 && (
                  <button onClick={holdCurrentCart} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded-lg">
                    <PauseCircle size={14} /> تعليق
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {cart.map((i) => (
                  <div key={i.id} className="flex justify-between items-center py-2.5 border-b border-gray-50 text-sm">
                    <div>
                      <p className="font-bold text-gray-800">{i.productName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{i.salePrice.toLocaleString()} × {i.qtyInCart}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-indigo-600">{(i.salePrice * i.qtyInCart).toLocaleString()}</span>
                      <button onClick={() => removeFromCart(i.id)} className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && (
                  <div className="text-gray-400 text-sm text-center py-12 flex flex-col items-center gap-2">
                    <Receipt size={32} className="opacity-20" />
                    <p>السلة فارغة، ابدأ بإضافة المنتجات.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-5 mt-auto border-t border-gray-100 space-y-4">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                <span className="text-sm font-bold text-gray-700">الإجمالي الكلي:</span>
                <span className="text-xl font-black text-indigo-600">{total.toLocaleString()} د.ع</span>
              </div>
              
              <div className="flex gap-2">
                <button onClick={() => sendWhatsAppReceipt()} disabled={cart.length === 0} className="flex-1 flex items-center justify-center gap-1.5 h-12 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-40 transition shadow-sm">
                  <MessageSquare size={16} /> رسالة للمندوب / الزبون
                </button>
                <button onClick={completeSale} disabled={cart.length === 0 || (sub.isExpired && !sub.isSuperAdmin)} className="flex-1 flex items-center justify-center gap-1.5 h-12 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-40 shadow-md transition">
                  <CheckCircle size={16} /> إتمام الطلب والبيع
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

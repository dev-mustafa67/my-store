'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { ShoppingCart, Plus, Minus, Trash2, MapPin, Phone, User, Send, ShoppingBag, AlertCircle } from 'lucide-react';

export default function CustomerStorePage() {
  const params = useParams();
  const storeId = typeof params?.storeId === 'string' ? params.storeId : Array.isArray(params?.storeId) ? params.storeId[0] : '';

  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [isPro, setIsPro] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // بيانات الزبون للتوصيل
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });

  useEffect(() => {
    if (!storeId) return;

    async function fetchStoreData() {
      // 1. فحص بيانات المتجر وخطة الاشتراك
      const { data: profile } = await supabase
        .from('users_profile')
        .select('store_name, phone, plan_type')
        .eq('store_id', storeId)
        .single();
      
      if (profile) {
        setStoreName(profile.store_name || 'متجر كاشيري');
        setStorePhone(profile.phone || '');
        if (profile.plan_type === 'basic') {
          setIsPro(false);
          setLoading(false);
          return;
        }
      }

      // 2. جلب المنتجات المتوفرة فقط
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, color, size, sale_price, quantity, products!inner(name)')
        .eq('products.store_id', storeId)
        .gt('quantity', 0);

      if (variants) {
        const formatted = variants.map((v: any) => ({
          id: v.id,
          name: v.products?.name || 'منتج',
          color: v.color,
          size: v.size,
          price: Number(v.sale_price) || 0,
          maxQty: Number(v.quantity) || 1
        }));
        setProducts(formatted);
      }
      setLoading(false);
    }

    fetchStoreData();
  }, [storeId]);

  function addToCart(product: any) {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.maxQty) return prev;
        return prev.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setIsCartOpen(true);
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) => prev.map((item) => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        if (newQty > 0 && newQty <= item.maxQty) return { ...item, qty: newQty };
      }
      return item;
    }));
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }

  function sendOrderViaWhatsApp(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) return alert('السلة فارغة!');
    
    const targetPhone = storePhone ? storePhone.replace(/[^0-9]/g, '') : '9647700000000';

    let text = `*📦 طلب جديد من متجر ${storeName} الإلكتروني*\n----------------------\n`;
    text += `👤 *الاسم:* ${customer.name}\n`;
    text += `📞 *الهاتف:* ${customer.phone}\n`;
    text += `📍 *العنوان:* ${customer.address}\n----------------------\n`;
    text += `*🛒 تفاصيل الطلب:*\n`;
    
    cart.forEach((i) => {
      text += `▪️ ${i.name} (${i.color || ''}/${i.size || ''}) × ${i.qty} = ${(i.price * i.qty).toLocaleString()} د.ع\n`;
    });
    
    text += `----------------------\n*💰 الإجمالي الكلي:* ${total.toLocaleString()} د.ع\nيرجى تأكيد الطلب والمباشرة بالتوصيل.`;

    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`, '_blank');
  }

  const total = cart.reduce((s, i) => s + (i.price * i.qty), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-indigo-600 font-bold text-sm">
        جاري تحميل المتجر...
      </div>
    );
  }

  if (!isPro) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-xl border border-gray-100">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">المتجر الإلكتروني غير مفعّل</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            هذا المتجر مشترك في باقة الكاشير الأساسية. لتفعيل رابط المتجر الإلكتروني واستقبال الطلبات مباشرة عبر الإنترنت، يجب الترقية إلى باقة البرو.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-30 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-black text-lg sm:text-xl text-gray-900 flex items-center gap-2">
            <ShoppingBag className="text-indigo-600" /> {storeName}
          </h1>
          <button onClick={() => setIsCartOpen(true)} className="relative p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition">
            <ShoppingCart size={22} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                {cart.reduce((sum, item) => sum + item.qty, 0)}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((p) => (
            <div key={p.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
              <div>
                <h3 className="font-bold text-gray-900 text-sm md:text-base">{p.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{p.color} {p.size && `• ${p.size}`}</p>
                <p className="text-indigo-600 font-black text-sm md:text-base mt-2">{p.price.toLocaleString()} د.ع</p>
              </div>
              <button 
                onClick={() => addToCart(p)}
                className="mt-4 w-full py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition shadow-sm"
              >
                أضف للسلة
              </button>
            </div>
          ))}
          {products.length === 0 && (
            <div className="col-span-full text-center py-20 text-gray-400 font-bold text-sm">
              لا توجد منتجات متاحة حالياً في المتجر.
            </div>
          )}
        </div>
      </main>

      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full flex flex-col animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-base flex items-center gap-2 text-gray-900">
                <ShoppingCart size={20} className="text-indigo-600" /> سلة المشتريات
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="text-xs text-gray-500 hover:text-red-500 font-bold px-3 py-1.5 bg-white rounded-xl border border-gray-200">
                إغلاق
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <div>
                    <p className="font-bold text-sm text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.price.toLocaleString()} د.ع</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl">
                      <button onClick={() => updateQty(item.id, -1)} className="p-2 text-gray-500 hover:text-black"><Minus size={12} /></button>
                      <span className="text-xs font-bold w-5 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="p-2 text-gray-500 hover:text-black"><Plus size={12} /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
              
              {cart.length > 0 ? (
                <form onSubmit={sendOrderViaWhatsApp} className="mt-6 space-y-3.5 pt-6 border-t border-gray-100">
                  <h3 className="font-bold text-sm text-gray-900">معلومات التوصيل لتأكيد الطلب</h3>
                  <div className="relative">
                    <User size={16} className="absolute right-3.5 top-3.5 text-gray-400" />
                    <input required type="text" placeholder="الاسم الكامل" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full h-11 pr-10 pl-3 rounded-xl border border-gray-200 text-xs outline-none focus:border-indigo-500 bg-gray-50 focus:bg-white" />
                  </div>
                  <div className="relative">
                    <Phone size={16} className="absolute right-3.5 top-3.5 text-gray-400" />
                    <input required type="text" placeholder="رقم الهاتف (07...)" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} className="w-full h-11 pr-10 pl-3 rounded-xl border border-gray-200 text-xs outline-none focus:border-indigo-500 bg-gray-50 focus:bg-white" />
                  </div>
                  <div className="relative">
                    <MapPin size={16} className="absolute right-3.5 top-3.5 text-gray-400" />
                    <input required type="text" placeholder="المحافظة والعنوان بالتفصيل" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} className="w-full h-11 pr-10 pl-3 rounded-xl border border-gray-200 text-xs outline-none focus:border-indigo-500 bg-gray-50 focus:bg-white" />
                  </div>
                  
                  <div className="bg-indigo-50/70 p-3.5 rounded-2xl flex justify-between items-center border border-indigo-100 mt-4">
                    <span className="font-bold text-xs text-indigo-950">المجموع الكلي:</span>
                    <span className="font-black text-lg text-indigo-600">{total.toLocaleString()} د.ع</span>
                  </div>

                  <button type="submit" className="w-full h-12 bg-[#25D366] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1ebd5a] shadow-md transition">
                    <Send size={18} /> إرسال الطلب عبر واتساب
                  </button>
                </form>
              ) : (
                <div className="text-center py-20 text-gray-400">
                  <ShoppingBag size={44} className="mx-auto mb-3 opacity-25" />
                  <p className="text-xs font-semibold">السلة فارغة</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

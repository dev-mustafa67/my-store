'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { ShoppingCart, Plus, Minus, Trash2, MapPin, Phone, User, Send, ShoppingBag } from 'lucide-react';

export default function CustomerStorePage({ params }: { params: { storeId: string } }) {
  const storeId = params.storeId;
  const [storeName, setStoreName] = useState('جاري التحميل...');
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // بيانات الزبون
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });

  useEffect(() => {
    async function fetchStoreData() {
      // 1. جلب اسم المتجر
      const { data: profile } = await supabase
        .from('users_profile')
        .select('store_name')
        .eq('store_id', storeId)
        .single();
      
      if (profile?.store_name) setStoreName(profile.store_name);

      // 2. جلب المنتجات المتاحة للبيع
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, color, size, sale_price, quantity, products!inner(name)')
        .eq('products.store_id', storeId)
        .gt('quantity', 0); // جلب المتوفر فقط

      if (variants) {
        const formatted = variants.map((v: any) => ({
          id: v.id,
          name: v.products.name,
          color: v.color,
          size: v.size,
          price: v.sale_price,
          maxQty: v.quantity
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
    
    // يمكنك لاحقاً استبدال هذا الرقم برقم التاجر الفعلي من قاعدة البيانات
    const storePhone = "9647700000000"; // رقم افتراضي للتجربة

    let text = `*📦 طلب جديد من المتجر الإلكتروني*\n----------------------\n`;
    text += `👤 *الاسم:* ${customer.name}\n`;
    text += `📞 *الرقم:* ${customer.phone}\n`;
    text += `📍 *العنوان:* ${customer.address}\n----------------------\n`;
    text += `*🛒 تفاصيل الطلب:*\n`;
    
    cart.forEach((i) => {
      text += `▪️ ${i.name} (${i.color || ''}/${i.size || ''}) × ${i.qty}\n`;
    });
    
    text += `----------------------\n*💰 الإجمالي:* ${total.toLocaleString()} د.ع\n`;

    const waUrl = `https://wa.me/${storePhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  }

  const total = cart.reduce((s, i) => s + (i.price * i.qty), 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-indigo-600 font-bold">جاري تحميل المتجر...</div>;

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-black text-xl text-gray-900 flex items-center gap-2">
            <ShoppingBag className="text-indigo-600" /> {storeName || 'متجر إلكتروني'}
          </h1>
          <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition">
            <ShoppingCart size={24} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                {cart.reduce((sum, item) => sum + item.qty, 0)}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Products Grid */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((p) => (
            <div key={p.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm md:text-base">{p.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{p.color} {p.size && `- ${p.size}`}</p>
                <p className="text-indigo-600 font-black mt-2">{p.price.toLocaleString()} د.ع</p>
              </div>
              <button 
                onClick={() => addToCart(p)}
                className="mt-4 w-full py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition"
              >
                أضف للسلة
              </button>
            </div>
          ))}
          {products.length === 0 && (
            <div className="col-span-full text-center py-20 text-gray-400 font-bold">لا توجد منتجات متاحة حالياً.</div>
          )}
        </div>
      </main>

      {/* Cart Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-lg flex items-center gap-2"><ShoppingCart /> سلة المشتريات</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-red-500 font-bold px-3 py-1 bg-white rounded-lg border">إغلاق</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <div>
                    <p className="font-bold text-sm text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.price.toLocaleString()} د.ع</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white border rounded-lg">
                      <button onClick={() => updateQty(item.id, -1)} className="p-1.5 text-gray-500 hover:text-black"><Minus size={14} /></button>
                      <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="p-1.5 text-gray-500 hover:text-black"><Plus size={14} /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
              
              {cart.length > 0 ? (
                <form onSubmit={sendOrderViaWhatsApp} className="mt-8 space-y-4 pt-6 border-t border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-2">تفاصيل التوصيل</h3>
                  <div className="relative">
                    <User size={16} className="absolute right-3 top-3.5 text-gray-400" />
                    <input required type="text" placeholder="الاسم الكامل" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full h-12 pr-10 pl-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-500" />
                  </div>
                  <div className="relative">
                    <Phone size={16} className="absolute right-3 top-3.5 text-gray-400" />
                    <input required type="text" placeholder="رقم الهاتف (07...)" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} className="w-full h-12 pr-10 pl-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-500" />
                  </div>
                  <div className="relative">
                    <MapPin size={16} className="absolute right-3 top-3.5 text-gray-400" />
                    <input required type="text" placeholder="المحافظة والعنوان بالتفصيل" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} className="w-full h-12 pr-10 pl-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-500" />
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-xl flex justify-between items-center border border-indigo-100 mt-6">
                    <span className="font-bold text-indigo-900">المجموع:</span>
                    <span className="font-black text-xl text-indigo-600">{total.toLocaleString()} د.ع</span>
                  </div>

                  <button type="submit" className="w-full h-14 bg-[#25D366] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#1ebd5a] shadow-lg transition mt-4">
                    <Send size={20} /> إرسال الطلب عبر واتساب
                  </button>
                </form>
              ) : (
                <div className="text-center py-20 text-gray-400">
                  <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                  <p>سلتك فارغة</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

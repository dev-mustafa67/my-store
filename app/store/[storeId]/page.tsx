'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { 
  ShoppingCart, Plus, Minus, Trash2, MapPin, Phone, User, Send, 
  Search, ShieldCheck, Package, Store, ChevronRight, Truck, Star,
  ShoppingBag
} from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('الكل');

  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });

  // شحن مجاني إذا تجاوز الطلب 50,000 دينار
  const FREE_SHIPPING_THRESHOLD = 50000;

  useEffect(() => {
    if (!storeId) return;

    async function fetchStoreData() {
      const { data: profile } = await supabase
        .from('users_profile')
        .select('store_name, phone, plan_type')
        .eq('store_id', storeId)
        .single();
      
      if (profile) {
        setStoreName(profile.store_name || 'متجر مميز');
        setStorePhone(profile.phone || '');
        if (profile.plan_type === 'basic') {
          setIsPro(false);
          setLoading(false);
          return;
        }
      }

      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, color, size, sale_price, quantity, products!inner(name, image_url)')
        .eq('products.store_id', storeId)
        .gt('quantity', 0);

      if (variants) {
        const formatted = variants.map((v: any) => ({
          id: v.id,
          name: v.products?.name || 'منتج',
          image: v.products?.image_url || null,
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

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [products, searchQuery]);

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
    let text = `*🛍️ طلب جديد من متجر ( ${storeName} )*\n━━━━━━━━━━━━━━━━━\n\n`;
    text += `*👤 معلومات الزبون:*\n`;
    text += `▪️ الاسم: ${customer.name}\n`;
    text += `▪️ الهاتف: ${customer.phone}\n`;
    text += `▪️ العنوان: ${customer.address}\n\n`;
    text += `*🛒 المنتجات المطلوبة:*\n`;
    
    cart.forEach((i) => {
      text += `🔸 ${i.name} ${i.color ? `(${i.color})` : ''} ${i.size ? `[${i.size}]` : ''}\n`;
      text += `   الكمية: ${i.qty} × ${i.price.toLocaleString()} = ${(i.price * i.qty).toLocaleString()} د.ع\n`;
    });
    
    text += `\n━━━━━━━━━━━━━━━━━\n`;
    text += `*💵 الإجمالي الكلي:* *${total.toLocaleString()} د.ع*\n`;
    if(total >= FREE_SHIPPING_THRESHOLD) text += `🎉 *التوصيل مجاني!*\n`;
    text += `━━━━━━━━━━━━━━━━━\nيرجى تأكيد الطلب والمباشرة بالتوصيل. 🚚`;

    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`, '_blank');
  }

  const total = cart.reduce((s, i) => s + (i.price * i.qty), 0);
  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const progressToFreeShipping = Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  );

  if (!isPro) return (
    <div dir="rtl" className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-xl border border-gray-100">
        <h2 className="text-xl font-black text-gray-900">المتجر مغلق مؤقتاً</h2>
      </div>
    </div>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-[#F9FAFB] font-sans pb-10 selection:bg-indigo-100 selection:text-indigo-900 flex flex-col">
      {/* Top Announcement Bar */}
      <div className="bg-gray-900 text-white text-[10px] sm:text-xs text-center py-2 font-bold tracking-wide flex items-center justify-center gap-2">
        <Truck size={14} /> توصيل مجاني للطلبات التي تتجاوز {FREE_SHIPPING_THRESHOLD.toLocaleString()} د.ع
      </div>

      {/* Elegant Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <h1 className="font-black text-xl sm:text-2xl text-gray-900 tracking-tight flex items-center gap-2">
            {storeName}
          </h1>
          <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-gray-900 hover:bg-gray-100 rounded-full transition-all">
            <ShoppingCart size={24} />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md border border-white">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full flex-1">
        {/* Search Bar */}
        <section className="px-4 sm:px-6 py-6 sticky top-16 z-30 bg-[#F9FAFB]/90 backdrop-blur-md">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="ابحث في المتجر..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pr-12 pl-4 bg-white rounded-full border border-gray-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all text-sm shadow-sm"
            />
          </div>
        </section>

        {/* Minimalist Products Grid */}
        <section className="px-4 sm:px-6 mb-16">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-x-6 sm:gap-y-10">
            {filteredProducts.map((p) => (
              <div key={p.id} className="group cursor-pointer">
                {/* Product Image Area */}
                <div className="relative w-full aspect-[3/4] bg-gray-100 rounded-2xl mb-4 overflow-hidden shadow-sm border border-gray-100">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 group-hover:bg-gray-100 transition-colors">
                      <Package className="text-gray-300 mb-2" size={40} strokeWidth={1} />
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">No Image</span>
                    </div>
                  )}

                  {/* Hot Badge */}
                  {p.maxQty <= 5 && (
                    <div className="absolute top-3 right-3 bg-gray-900/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full">
                      قريباً ينفد
                    </div>
                  )}

                  {/* Quick Add Button */}
                  <div className="absolute bottom-4 left-0 right-0 px-4 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hidden md:block">
                    <button onClick={(e) => { e.stopPropagation(); addToCart(p); }} className="w-full bg-white/90 backdrop-blur-md text-gray-900 py-2.5 rounded-xl font-bold text-xs shadow-lg hover:bg-white">
                      + إضافة سريع
                    </button>
                  </div>
                </div>

                {/* Product Info */}
                <div className="px-1">
                  <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1">{p.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                    {p.color && <span>{p.color}</span>}
                    {p.size && <span>• {p.size}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-gray-900 text-base">{p.price.toLocaleString()} <span className="text-[10px] text-gray-500">د.ع</span></span>
                    
                    <button onClick={(e) => { e.stopPropagation(); addToCart(p); }} className="md:hidden w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-full flex items-center justify-center transition-colors">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Elegant Footer */}
      <footer className="bg-white border-t border-gray-100 pt-10 pb-6 px-4">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <h2 className="text-xl font-black text-gray-900">{storeName}</h2>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">نقدم لكم أفضل المنتجات بأعلى جودة. تسوق الآن وادفع عند الاستلام بكل أمان.</p>
          <div className="pt-6 border-t border-gray-50 text-[10px] text-gray-400 font-bold flex flex-col items-center gap-2">
            <span>جميع الحقوق محفوظة © {new Date().getFullYear()}</span>
            <span className="flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-full">⚡ تم التشغيل بواسطة <strong className="text-indigo-600">كاشيري المنصة الذكية</strong></span>
          </div>
        </div>
      </footer>

      {/* Premium Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)} />
          
          <div className="relative w-full max-w-[420px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
              <h2 className="font-black text-lg text-gray-900">سلتك ({totalItems})</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={20} /></button>
            </div>

            {/* Free Shipping Bar */}
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-gray-700">
                  {total >= FREE_SHIPPING_THRESHOLD ? '🎉 مبروك! حصلت على شحن مجاني' : `أضف بـ ${(FREE_SHIPPING_THRESHOLD - total).toLocaleString()} د.ع لشحن مجاني`}
                </span>
                <Truck size={16} className={total >= FREE_SHIPPING_THRESHOLD ? 'text-emerald-500' : 'text-gray-400'} />
              </div>
              <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-500 ${total >= FREE_SHIPPING_THRESHOLD ? 'bg-emerald-500' : 'bg-gray-900'}`} style={{ width: `${progressToFreeShipping}%` }}></div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-4 group">
                  <div className="w-20 h-24 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden relative border border-gray-100">
                    {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <Package size={24} className="text-gray-300" />}
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm text-gray-900">{item.name}</p>
                        <p className="text-[10px] text-gray-500 mt-1">{item.color} {item.size && `- ${item.size}`}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center bg-gray-100 rounded-lg h-8 px-1">
                        <button onClick={() => updateQty(item.id, -1)} className="w-7 h-full flex items-center justify-center text-gray-600 hover:text-black font-bold">-</button>
                        <span className="text-xs font-black w-6 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-7 h-full flex items-center justify-center text-gray-600 hover:text-black font-bold">+</button>
                      </div>
                      <p className="text-sm font-black text-gray-900">{(item.price * item.qty).toLocaleString()} د.ع</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {cart.length > 0 ? (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h3 className="font-black text-sm text-gray-900 mb-4">أين نرسل طلبك؟</h3>
                  <form id="checkout-form" onSubmit={sendOrderViaWhatsApp} className="space-y-3">
                    <input required type="text" placeholder="الاسم الكامل" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 bg-gray-50 focus:bg-white transition-all" />
                    <input required type="tel" placeholder="رقم الهاتف" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 bg-gray-50 focus:bg-white transition-all" dir="rtl" />
                    <textarea required placeholder="المحافظة والمنطقة وأقرب نقطة دالة" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} className="w-full h-20 py-3 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 bg-gray-50 focus:bg-white transition-all resize-none" />
                  </form>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center pb-10">
                  <ShoppingBag size={64} className="text-gray-200 mb-4" strokeWidth={1} />
                  <p className="text-sm text-gray-500">السلة فارغة حالياً</p>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5 bg-white border-t border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-gray-500 text-sm">المجموع الكلي</span>
                  <span className="font-black text-2xl text-gray-900">{total.toLocaleString()} <span className="text-sm text-gray-400">د.ع</span></span>
                </div>
                <button type="submit" form="checkout-form" className="w-full h-14 bg-gray-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-900/20 active:scale-95">
                  <Send size={18} /> تأكيد الطلب عبر واتساب
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

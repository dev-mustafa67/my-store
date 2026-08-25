'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { 
  ShoppingCart, Plus, Minus, Trash2, MapPin, Phone, User, Send, 
  ShoppingBag, Search, AlertCircle, ChevronRight, Star, ShieldCheck, 
  Package, Store
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

  // بيانات التوصيل
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });

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

  // فلترة المنتجات حسب البحث
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
    text += `━━━━━━━━━━━━━━━━━\nيرجى تأكيد الطلب والمباشرة بالتوصيل. 🚚`;

    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`, '_blank');
  }

  const total = cart.reduce((s, i) => s + (i.price * i.qty), 0);
  const totalItems = cart.reduce((s, i) => s + i.qty, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center"><Store className="text-gray-400" size={30} /></div>
          <div className="h-4 w-32 bg-gray-200 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-xl border border-gray-100">
          <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-black text-gray-900">المتجر مغلق مؤقتاً</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            عذراً، هذا المتجر الإلكتروني غير متاح حالياً. يرجى مراجعة إدارة المتجر.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans pb-24 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Header - Glassmorphism */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100 shadow-sm transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-gray-200/50">
              <ShoppingBag size={24} />
            </div>
            <div>
              <h1 className="font-black text-xl text-gray-900 tracking-tight">{storeName}</h1>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-0.5">
                <ShieldCheck size={12} /> متجر موثوق
              </div>
            </div>
          </div>
          
          <button onClick={() => setIsCartOpen(true)} className="relative p-3 bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-2xl transition-all active:scale-95 border border-gray-200">
            <ShoppingCart size={22} />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full shadow-md shadow-indigo-200 border-2 border-white animate-in zoom-in">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        
        {/* Hero Section */}
        <section className="px-4 sm:px-6 mt-6 mb-10">
          <div className="bg-gray-900 rounded-[2rem] overflow-hidden relative p-8 sm:p-12 shadow-2xl shadow-gray-200 text-white flex flex-col justify-center min-h-[200px]">
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none" />
            <div className="relative z-10 max-w-xl">
              <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-xs font-bold mb-4">
                ✨ تشكيلة جديدة
              </span>
              <h2 className="text-3xl sm:text-4xl font-black mb-3 leading-tight">أهلاً بك في {storeName}</h2>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-md">
                اكتشف أحدث المنتجات وتسوق بسهولة. نوفر لك أفضل الجودات مع خدمة دفع عند الاستلام لضمان راحتك.
              </p>
            </div>
          </div>
        </section>

        {/* Search & Filter Bar */}
        <section className="px-4 sm:px-6 mb-8 sticky top-24 z-30">
          <div className="bg-white p-2 rounded-2xl shadow-lg shadow-gray-100/50 border border-gray-100 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="ابحث عن منتج..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pr-12 pl-4 bg-gray-50 rounded-xl outline-none focus:bg-indigo-50/50 focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-medium"
              />
            </div>
            <div className="hidden sm:flex bg-gray-50 rounded-xl p-1 gap-1">
              {['الكل', 'عروض', 'الأكثر مبيعاً'].map(cat => (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-6 h-full rounded-lg text-xs font-bold transition-all ${activeCategory === cat ? 'bg-white shadow-sm text-indigo-600 border border-gray-200' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section className="px-4 sm:px-6 mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              جميع المنتجات <span className="text-sm font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{filteredProducts.length}</span>
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((p) => (
              <div key={p.id} className="group bg-white rounded-3xl p-3 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100/40 transition-all duration-300 flex flex-col justify-between overflow-hidden relative">
                
                {/* Product Image Placeholder (Ready for real images later) */}
                <div className="w-full aspect-[4/5] bg-slate-100 rounded-2xl mb-4 flex items-center justify-center relative overflow-hidden group-hover:bg-indigo-50 transition-colors">
                  <Package className="text-gray-300 group-hover:text-indigo-200 transition-colors" size={48} strokeWidth={1} />
                  
                  {/* Badges */}
                  {p.maxQty <= 3 && p.maxQty > 0 && (
                    <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md animate-pulse">
                      🔥 باقي {p.maxQty} فقط
                    </div>
                  )}
                  {/* Add to Cart Overlay on Desktop */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center backdrop-blur-[2px]">
                    <button onClick={() => addToCart(p)} className="bg-white text-gray-900 px-6 py-2.5 rounded-full font-bold text-sm shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all">
                      أضف للسلة
                    </button>
                  </div>
                </div>

                <div className="px-1 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-2 leading-snug">{p.name}</h3>
                  </div>
                  
                  <div className="flex items-center gap-1.5 mt-1.5 mb-3 flex-wrap">
                    {p.color && <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-md">{p.color}</span>}
                    {p.size && <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-md">{p.size}</span>}
                  </div>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <div className="font-black text-indigo-600 text-base">
                      {p.price.toLocaleString()} <span className="text-[10px] text-gray-400">د.ع</span>
                    </div>
                    {/* Mobile Add to Cart Button */}
                    <button 
                      onClick={() => addToCart(p)}
                      className="md:hidden w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-md"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm mt-4">
              <Search className="mx-auto text-gray-300 mb-4" size={48} strokeWidth={1} />
              <h3 className="text-lg font-bold text-gray-900">لم نجد ما تبحث عنه</h3>
              <p className="text-sm text-gray-500 mt-2">جرب البحث بكلمات مختلفة أو تصفح المنتجات الأخرى.</p>
            </div>
          )}
        </section>
      </main>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsCartOpen(false)}
          />
          
          {/* Drawer Panel */}
          <div className="relative w-full max-w-[400px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 sm:rounded-r-3xl">
            
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <h2 className="font-black text-lg flex items-center gap-2 text-gray-900">
                <ShoppingCart size={22} className="text-indigo-600" /> سلة المشتريات
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{totalItems}</span>
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-50/50">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-100">
                     <Package size={24} className="text-gray-300" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-sm text-gray-900 line-clamp-1">{item.name}</p>
                      <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs font-black text-indigo-600">{item.price.toLocaleString()} د.ع</p>
                      
                      {/* Quantity Stepper */}
                      <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg h-7">
                        <button onClick={() => updateQty(item.id, -1)} className="w-7 h-full flex items-center justify-center text-gray-500 hover:text-black transition-colors"><Minus size={12} strokeWidth={3} /></button>
                        <span className="text-xs font-bold w-6 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-7 h-full flex items-center justify-center text-gray-500 hover:text-black transition-colors"><Plus size={12} strokeWidth={3} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {cart.length > 0 ? (
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">1</span>
                    <h3 className="font-black text-sm text-gray-900">معلومات التوصيل</h3>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>

                  <form id="checkout-form" onSubmit={sendOrderViaWhatsApp} className="space-y-3">
                    <div className="relative">
                      <User size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input required type="text" placeholder="الاسم الكامل" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full h-12 pr-11 pl-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 bg-white transition-all shadow-sm" />
                    </div>
                    <div className="relative">
                      <Phone size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input required type="tel" placeholder="رقم الهاتف (07...)" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} className="w-full h-12 pr-11 pl-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 bg-white transition-all shadow-sm" dir="rtl" />
                    </div>
                    <div className="relative">
                      <MapPin size={18} className="absolute right-3.5 top-[14px] text-gray-400" />
                      <textarea required placeholder="المحافظة والعنوان بالتفصيل" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} className="w-full h-24 pt-3.5 pr-11 pl-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 bg-white transition-all shadow-sm resize-none" />
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center pb-20 opacity-50">
                  <ShoppingCart size={80} className="text-gray-300 mb-6" strokeWidth={1} />
                  <h3 className="text-xl font-black text-gray-900 mb-2">سلتك فارغة</h3>
                  <p className="text-sm text-gray-500 max-w-[200px]">قم بإضافة بعض المنتجات للسلة لإتمام طلبك.</p>
                  <button onClick={() => setIsCartOpen(false)} className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-full text-sm font-bold">تصفح المنتجات</button>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-gray-500 text-sm">المجموع الكلي:</span>
                  <span className="font-black text-2xl text-gray-900">{total.toLocaleString()} <span className="text-sm text-gray-400">د.ع</span></span>
                </div>
                <button 
                  type="submit" 
                  form="checkout-form"
                  className="w-full h-14 bg-[#25D366] text-white rounded-2xl font-black text-base flex items-center justify-center gap-2 hover:bg-[#1ebd5a] active:scale-[0.98] transition-all shadow-lg shadow-[#25D366]/30"
                >
                  <Send size={20} /> إرسال الطلب عبر واتساب
                </button>
                <p className="text-center text-[10px] text-gray-400 mt-3 flex items-center justify-center gap-1">
                  <ShieldCheck size={12} /> الدفع يتم بأمان عند الاستلام
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

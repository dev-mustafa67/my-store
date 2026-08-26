'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { 
  ShoppingCart, Plus, Minus, Trash2, MapPin, Phone, User, Send, 
  Search, ShieldCheck, Package, Store, ChevronRight, Truck, Map, 
  AlignLeft, ShoppingBag
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

  // 🌟 حقول إضافية احترافية للتوصيل
  const [customer, setCustomer] = useState({ 
    name: '', 
    phone: '', 
    city: 'بغداد', 
    address: '', 
    landmark: '',
    notes: '' 
  });

  const FREE_SHIPPING_THRESHOLD = 50000;

  // قائمة المحافظات العراقية
  const iraqiCities = [
    'بغداد', 'البصرة', 'أربيل', 'السليمانية', 'دهوك', 'نينوى', 'كركوك', 
    'صلاح الدين', 'الأنبار', 'ديالى', 'بابل', 'كربلاء', 'النجف', 
    'واسط', 'القادسية', 'ميسان', 'المثنى', 'ذي قار'
  ];

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

  // 🌟 دالة الإرسال المحدثة مع الحقول الجديدة
  function sendOrderViaWhatsApp(e: React.FormEvent) {
    e.preventDefault(); // تمنع تحديث الصفحة
    if (cart.length === 0) return alert('السلة فارغة!');
    
    const targetPhone = storePhone ? storePhone.replace(/[^0-9]/g, '') : '9647700000000';
    let text = `*🛍️ طلب جديد من متجر ( ${storeName} )*\n━━━━━━━━━━━━━━━━━\n\n`;
    
    text += `*👤 معلومات الزبون والتوصيل:*\n`;
    text += `▪️ الاسم: ${customer.name}\n`;
    text += `▪️ الهاتف: ${customer.phone}\n`;
    text += `▪️ المحافظة: ${customer.city}\n`;
    text += `▪️ المنطقة والشارع: ${customer.address}\n`;
    if (customer.landmark) text += `▪️ أقرب نقطة دالة: ${customer.landmark}\n`;
    if (customer.notes) text += `▪️ ملاحظات للطلب: ${customer.notes}\n\n`;
    
    text += `*🛒 المنتجات المطلوبة:*\n`;
    cart.forEach((i) => {
      text += `🔸 ${i.name} ${i.color ? `(${i.color})` : ''} ${i.size ? `[${i.size}]` : ''}\n`;
      text += `   الكمية: ${i.qty} × ${i.price.toLocaleString()} = ${(i.price * i.qty).toLocaleString()} د.ع\n`;
    });
    
    text += `\n━━━━━━━━━━━━━━━━━\n`;
    text += `*💵 الإجمالي الكلي:* *${total.toLocaleString()} د.ع*\n`;
    if(total >= FREE_SHIPPING_THRESHOLD) text += `🎉 *(شحن مجاني)*\n`;
    text += `━━━━━━━━━━━━━━━━━\nيرجى تأكيد الطلب والمباشرة بالتوصيل.`;

    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`, '_blank');
  }

  const total = cart.reduce((s, i) => s + (i.price * i.qty), 0);
  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const progressToFreeShipping = Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
      <div className="w-10 h-10 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    </div>
  );

  if (!isPro) return (
    <div dir="rtl" className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center space-y-3 shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800">المتجر مغلق مؤقتاً</h2>
      </div>
    </div>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-[#fafafa] font-sans pb-10 selection:bg-slate-200 selection:text-slate-900 flex flex-col text-slate-800">
      
      {/* Top Announcement Bar */}
      <div className="bg-[#1e293b] text-white text-[11px] text-center py-2 font-medium tracking-wide flex items-center justify-center gap-2">
        <Truck size={14} className="text-slate-300" /> شحن مجاني للطلبات فوق {FREE_SHIPPING_THRESHOLD.toLocaleString()} د.ع
      </div>

      {/* Elegant Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 transition-all">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <h1 className="font-extrabold text-xl tracking-tight text-[#0f172a]">
            {storeName}
          </h1>
          <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-slate-700 hover:bg-slate-50 rounded-full transition-all">
            <ShoppingCart size={22} strokeWidth={1.5} />
            {totalItems > 0 && (
              <span className="absolute top-0 right-0 bg-[#0f172a] text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full flex-1">
        {/* Search Bar */}
        <section className="px-5 py-6 sticky top-16 z-30 bg-[#fafafa]/90 backdrop-blur-md">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="ابحث في المتجر..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pr-11 pl-4 bg-white rounded-xl border border-slate-200 outline-none focus:border-slate-400 transition-all text-sm shadow-sm"
            />
          </div>
        </section>

        {/* Minimalist Products Grid */}
        <section className="px-5 mb-16">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-x-6 sm:gap-y-10">
            {filteredProducts.map((p) => (
              <div key={p.id} className="group cursor-pointer flex flex-col">
                {/* Product Image Area */}
                <div className="relative w-full aspect-[3/4] bg-[#f1f5f9] rounded-xl mb-3 overflow-hidden">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <Package size={32} strokeWidth={1} />
                    </div>
                  )}

                  {/* Quick Add Button */}
                  <div className="absolute bottom-3 left-3 right-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hidden md:block">
                    <button onClick={(e) => { e.stopPropagation(); addToCart(p); }} className="w-full bg-white/90 backdrop-blur-md text-slate-900 py-2.5 rounded-lg font-bold text-xs shadow-sm hover:bg-white">
                      إضافة للسلة
                    </button>
                  </div>
                </div>

                {/* Product Info */}
                <div className="px-1 flex-1 flex flex-col">
                  <h3 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-1">{p.name}</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2">
                    {p.color && <span>{p.color}</span>}
                    {p.size && <span>• {p.size}</span>}
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{p.price.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">د.ع</span></span>
                    
                    <button onClick={(e) => { e.stopPropagation(); addToCart(p); }} className="md:hidden w-7 h-7 bg-white border border-slate-200 text-slate-700 rounded-full flex items-center justify-center shadow-sm">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Elegant Footer */}
      <footer className="bg-white border-t border-slate-100 pt-10 pb-6 px-5 text-center">
        <h2 className="text-lg font-bold text-slate-800 mb-2">{storeName}</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">الجودة والأناقة في مكان واحد. تسوق بكل ثقة وادفع عند الاستلام.</p>
        <div className="text-[10px] text-slate-400">
          تم التطوير بواسطة <strong className="text-slate-600">كاشيري</strong>
        </div>
      </footer>

      {/* 🌟 Premium Cart Drawer (The major update) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* خلفية التعتيم */}
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)} />
          
          <div className="relative w-full max-w-[420px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            
            {/* هيدر السلة */}
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <h2 className="font-bold text-base text-slate-800 flex items-center gap-2">
                سلة التسوق <span className="text-xs text-slate-400 font-normal">({totalItems} منتج)</span>
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 transition-colors">
                <ChevronRight size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* شريط الشحن المجاني (ألوان هادئة) */}
            <div className="px-5 py-3 bg-[#f8fafc] border-b border-slate-100">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[11px] font-semibold text-slate-600">
                  {total >= FREE_SHIPPING_THRESHOLD ? '✨ تم تفعيل الشحن المجاني' : `أضف بـ ${(FREE_SHIPPING_THRESHOLD - total).toLocaleString()} د.ع لشحن مجاني`}
                </span>
                <Truck size={14} className={total >= FREE_SHIPPING_THRESHOLD ? 'text-emerald-600' : 'text-slate-400'} />
              </div>
              <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-700 ease-out ${total >= FREE_SHIPPING_THRESHOLD ? 'bg-emerald-500' : 'bg-slate-800'}`} style={{ width: `${progressToFreeShipping}%` }}></div>
              </div>
            </div>

            {/* 🌟 جعلنا السلة ونموذج الإدخال بداخل form واحد متصل لضمان عمل الزر */}
            <form id="checkout-form" onSubmit={sendOrderViaWhatsApp} className="flex-1 flex flex-col overflow-hidden">
              
              {/* قسم التمرير (المنتجات + الحقول) */}
              <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 custom-scrollbar bg-white">
                
                {/* قائمة المنتجات */}
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-4 group">
                      <div className="w-20 h-24 bg-[#f1f5f9] rounded-lg flex items-center justify-center shrink-0 overflow-hidden border border-slate-100">
                        {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <Package size={20} className="text-slate-300" strokeWidth={1.5} />}
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-0.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-sm text-slate-800 line-clamp-1">{item.name}</p>
                            <p className="text-[11px] text-slate-500 mt-1">{item.color} {item.size && `- ${item.size}`}</p>
                          </div>
                          <button type="button" onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16} strokeWidth={1.5} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          {/* أزرار الكمية الهادئة */}
                          <div className="flex items-center bg-[#f8fafc] border border-slate-100 rounded-md h-7 px-1">
                            <button type="button" onClick={() => updateQty(item.id, -1)} className="w-6 h-full flex items-center justify-center text-slate-500 hover:text-slate-900">-</button>
                            <span className="text-[11px] font-bold w-6 text-center text-slate-700">{item.qty}</span>
                            <button type="button" onClick={() => updateQty(item.id, 1)} className="w-6 h-full flex items-center justify-center text-slate-500 hover:text-slate-900">+</button>
                          </div>
                          <p className="text-sm font-bold text-slate-800">{(item.price * item.qty).toLocaleString()} <span className="text-[9px] font-normal text-slate-500">د.ع</span></p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {cart.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                      <ShoppingBag size={48} strokeWidth={1} className="mb-3 opacity-50" />
                      <p className="text-sm">سلة التسوق فارغة</p>
                    </div>
                  )}
                </div>
                
                {/* حقول الدفع (تظهر فقط إذا كانت السلة غير فارغة) */}
                {cart.length > 0 && (
                  <div className="pt-6 border-t border-slate-100">
                    <h3 className="font-bold text-sm text-slate-800 mb-4">تفاصيل التوصيل</h3>
                    
                    <div className="space-y-4">
                      {/* الاسم ورقم الهاتف */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">الاسم الكامل *</label>
                          <div className="relative">
                            <User size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input required type="text" placeholder="الاسم" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full h-10 pr-9 pl-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-400 bg-white" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">رقم الهاتف *</label>
                          <div className="relative">
                            <Phone size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input required type="tel" placeholder="07xxxxxx" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} className="w-full h-10 pr-9 pl-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-400 bg-white" dir="rtl" />
                          </div>
                        </div>
                      </div>

                      {/* المحافظة والمنطقة */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">المحافظة *</label>
                          <div className="relative">
                            <Map size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select value={customer.city} onChange={e => setCustomer({...customer, city: e.target.value})} className="w-full h-10 pr-9 pl-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-400 bg-white appearance-none cursor-pointer">
                              {iraqiCities.map(city => <option key={city} value={city}>{city}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">المنطقة / الشارع *</label>
                          <div className="relative">
                            <MapPin size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input required type="text" placeholder="مثال: المنصور، شارع 14 رمضان" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} className="w-full h-10 pr-9 pl-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-400 bg-white" />
                          </div>
                        </div>
                      </div>

                      {/* أقرب نقطة دالة وملاحظات */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">أقرب نقطة دالة (اختياري)</label>
                        <input type="text" placeholder="بجوار مول، مدرسة، الخ..." value={customer.landmark} onChange={e => setCustomer({...customer, landmark: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-400 bg-white" />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">ملاحظات للطلب (اختياري)</label>
                        <div className="relative">
                          <AlignLeft size={14} className="absolute right-3 top-3 text-slate-400" />
                          <textarea placeholder="أي تفاصيل إضافية للطلب أو التوصيل..." value={customer.notes} onChange={e => setCustomer({...customer, notes: e.target.value})} className="w-full h-20 pt-2.5 pr-9 pl-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-400 bg-white resize-none custom-scrollbar" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* الفوتر الثابت (زر إتمام الطلب) */}
              {cart.length > 0 && (
                <div className="px-5 py-4 bg-white border-t border-slate-100">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-slate-500 text-sm">الإجمالي</span>
                    <span className="font-extrabold text-xl text-slate-800">{total.toLocaleString()} <span className="text-xs text-slate-400 font-normal">د.ع</span></span>
                  </div>
                  {/* زر الإرسال موجود الآن بداخل الـ Form كنوع submit صريح */}
                  <button type="submit" className="w-full h-12 bg-[#0f172a] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1e293b] active:scale-[0.98] transition-all">
                    <Send size={16} /> تأكيد الطلب عبر واتساب
                  </button>
                  <p className="text-center text-[9px] text-slate-400 mt-2.5 flex items-center justify-center gap-1">
                    <ShieldCheck size={12} /> لن يتم دفع أي مبلغ إلا عند الاستلام
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

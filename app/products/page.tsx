// app/products/page.tsx
'use client';

import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase-client';
import { useUserRole } from '@/lib/permissions';
import { Save, Send, Package, ShirtIcon } from 'lucide-react';

export default function ProductsPage() {
  const { isOwner, loading: roleLoading } = useUserRole();
  const [variants, setVariants] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('users_profile').select('store_id').eq('id', user!.id).single();
    setStoreId(profile!.store_id);

    const { data } = await supabase
      .from('product_variants')
      .select('id, color, size, quantity, cost_price, sale_price, products(name)')
      .order('id', { ascending: false });
    setVariants(data ?? []);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('users_profile').select('store_id').eq('id', user!.id).single();

    const { data: product } = await supabase
      .from('products')
      .insert({ name, category, store_id: profile!.store_id })
      .select()
      .single();

    await supabase.from('product_variants').insert({
      product_id: product!.id,
      color, size,
      cost_price: Number(cost),
      sale_price: Number(price),
      quantity: Number(qty),
      barcode: crypto.randomUUID().slice(0, 12),
    });

    setName(''); setCategory(''); setColor(''); setSize(''); setCost(''); setPrice(''); setQty('');
    setSaving(false);
    loadProducts();
  }

  if (roleLoading) return <p className="text-center py-10">جاري التحميل...</p>;

  return (
    <div dir="rtl">
      <NavBar />
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        {isOwner && storeId && (
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
            <p className="font-bold flex items-center gap-2 mb-2"><Send size={16} /> دعوة موظف جديد</p>
            <p className="text-sm opacity-90 mb-3">أرسل هذا الرابط لموظفك — سيُنشئ حساباً مرتبطاً بمحلك تلقائياً بصلاحية "موظف":</p>
            <code className="block bg-white/15 text-xs p-2.5 rounded-lg break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/signup?store=${storeId}` : ''}
            </code>
          </div>
        )}

        {isOwner && (
          <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2"><Package size={18} className="text-indigo-600" /> إضافة منتج جديد</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <input required placeholder="اسم القطعة" value={name} onChange={e => setName(e.target.value)} className="h-11 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none" />
              <input placeholder="التصنيف" value={category} onChange={e => setCategory(e.target.value)} className="h-11 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none" />
              <input placeholder="اللون" value={color} onChange={e => setColor(e.target.value)} className="h-11 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none" />
              <input placeholder="المقاس" value={size} onChange={e => setSize(e.target.value)} className="h-11 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none" />
              <input required type="number" placeholder="سعر الشراء" value={cost} onChange={e => setCost(e.target.value)} className="h-11 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none" />
              <input required type="number" placeholder="سعر البيع" value={price} onChange={e => setPrice(e.target.value)} className="h-11 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none" />
              <input required type="number" placeholder="الكمية" value={qty} onChange={e => setQty(e.target.value)} className="h-11 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none" />
            </div>
            <button disabled={saving} className="flex items-center gap-2 px-6 h-11 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100">
              <Save size={18} /> {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </form>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><ShirtIcon size={18} className="text-indigo-600" /> المخزون الحالي</h2>
          <div className="space-y-2">
            {variants.map((v) => (
              <div key={v.id} className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors p-3.5 rounded-xl text-sm">
                <span className="text-gray-700">{v.products?.name} <span className="text-gray-400">({v.color}/{v.size})</span> — <span className={v.quantity <= 3 ? 'text-red-600 font-bold' : ''}>{v.quantity} قطعة</span></span>
                <span className="font-bold text-indigo-600">{v.sale_price?.toLocaleString()} د.ع</span>
              </div>
            ))}
            {variants.length === 0 && <p className="text-gray-400 text-sm text-center py-6">لا توجد منتجات بعد.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// app/products/page.tsx
'use client';

import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase-client';
import { useUserRole } from '@/lib/permissions';
import { Plus, Save } from 'lucide-react';

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
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {isOwner && storeId && (
          <div className="bg-indigo-50 rounded-2xl p-5">
            <p className="font-bold text-indigo-800 mb-2">📨 دعوة موظف جديد</p>
            <p className="text-sm text-indigo-700 mb-2">أرسل هذا الرابط لموظفك — سيُنشئ حساباً مرتبطاً بمحلك تلقائياً بصلاحية "موظف":</p>
            <code className="block bg-white text-xs p-2 rounded-lg break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/signup?store=${storeId}` : ''}
            </code>
          </div>
        )}

        {isOwner && (
          <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">إضافة منتج جديد</h2>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="اسم القطعة" value={name} onChange={e => setName(e.target.value)} className="h-11 px-3 rounded-lg border" />
              <input placeholder="التصنيف" value={category} onChange={e => setCategory(e.target.value)} className="h-11 px-3 rounded-lg border" />
              <input placeholder="اللون" value={color} onChange={e => setColor(e.target.value)} className="h-11 px-3 rounded-lg border" />
              <input placeholder="المقاس" value={size} onChange={e => setSize(e.target.value)} className="h-11 px-3 rounded-lg border" />
              <input required type="number" placeholder="سعر الشراء" value={cost} onChange={e => setCost(e.target.value)} className="h-11 px-3 rounded-lg border" />
              <input required type="number" placeholder="سعر البيع" value={price} onChange={e => setPrice(e.target.value)} className="h-11 px-3 rounded-lg border" />
              <input required type="number" placeholder="الكمية" value={qty} onChange={e => setQty(e.target.value)} className="h-11 px-3 rounded-lg border" />
            </div>
            <button disabled={saving} className="flex items-center gap-2 px-6 h-11 bg-indigo-600 text-white rounded-xl font-bold">
              <Save size={18} /> {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </form>
        )}

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">المخزون الحالي</h2>
          <div className="space-y-2">
            {variants.map((v) => (
              <div key={v.id} className="flex justify-between bg-gray-50 p-3 rounded-xl text-sm">
                <span>{v.products?.name} ({v.color}/{v.size}) — {v.quantity} قطعة</span>
                <span className="font-bold text-indigo-600">{v.sale_price?.toLocaleString()} د.ع</span>
              </div>
            ))}
            {variants.length === 0 && <p className="text-gray-400 text-sm">لا توجد منتجات بعد.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

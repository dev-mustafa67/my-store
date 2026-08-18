// components/AnalyticsDashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { supabase } from '@/lib/supabase-client';

const COLORS = ['#4f46e5', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'];

export default function AnalyticsDashboard({ storeId }: { storeId: string }) {
  const [topSellers, setTopSellers] = useState<{ name: string; profit: number }[]>([]);
  const [stagnantItems, setStagnantItems] = useState<{ name: string; color: string; size: string }[]>([]);
  const [profitTrend, setProfitTrend] = useState<{ day: string; profit: number }[]>([]);
  const [forecast, setForecast] = useState<{ name: string; color: string; size: string; weeklyRate: number; daysLeft: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAnalytics(); }, [storeId]);

  async function loadAnalytics() {
    setLoading(true);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: sales } = await supabase
      .from('sales')
      .select('sale_price_at_time, cost_price_at_time, quantity_sold, sold_at, product_variants(products(name))')
      .eq('store_id', storeId)
      .gte('sold_at', thirtyDaysAgo.toISOString());

    const byProduct: Record<string, number> = {};
    const byDay: Record<string, number> = {};

    for (const s of sales ?? []) {
      const name = (s as any).product_variants?.products?.name ?? 'غير معروف';
      const profit = (Number(s.sale_price_at_time) - Number(s.cost_price_at_time)) * Number(s.quantity_sold);
      byProduct[name] = (byProduct[name] ?? 0) + profit;
      const day = new Date(s.sold_at).toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short' });
      byDay[day] = (byDay[day] ?? 0) + profit;
    }

    setTopSellers(
      Object.entries(byProduct).map(([name, profit]) => ({ name, profit }))
        .sort((a, b) => b.profit - a.profit).slice(0, 5)
    );
    setProfitTrend(Object.entries(byDay).map(([day, profit]) => ({ day, profit })));

    // راكدة = لها كمية متبقية، ولم تُبع أبداً أو لم تُبع منذ 90 يوماً — بالاعتماد على last_sold_at الحقيقي لكل قطعة
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: stagnantRaw } = await supabase
      .from('product_variants')
      .select('color, size, quantity, last_sold_at, products(name, store_id)')
      .or(`last_sold_at.lt.${ninetyDaysAgo.toISOString()},last_sold_at.is.null`)
      .gt('quantity', 0)
      .eq('products.store_id', storeId);

    setStagnantItems(
      (stagnantRaw ?? []).map((v: any) => ({ name: v.products.name, color: v.color, size: v.size }))
    );

    // ---- توصيات إعادة الطلب: معدّل البيع خلال آخر 14 يوماً لكل قطعة ----
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: recentSalesForForecast } = await supabase
      .from('sales')
      .select('variant_id, quantity_sold, product_variants(quantity, color, size, products(name))')
      .eq('store_id', storeId)
      .gte('sold_at', fourteenDaysAgo.toISOString());

    const soldByVariant: Record<string, { qty: number; sold: number; name: string; color: string; size: string }> = {};
    for (const s of recentSalesForForecast ?? []) {
      const variant: any = (s as any).product_variants;
      if (!variant) continue;
      const key = (s as any).variant_id;
      if (!soldByVariant[key]) {
        soldByVariant[key] = { qty: variant.quantity, sold: 0, name: variant.products?.name ?? '—', color: variant.color, size: variant.size };
      }
      soldByVariant[key].sold += s.quantity_sold;
    }

    const forecastRows = Object.values(soldByVariant)
      .map((v) => {
        const dailyRate = v.sold / 14;
        const daysLeft = dailyRate > 0 ? Math.round(v.qty / dailyRate) : Infinity;
        return { name: v.name, color: v.color, size: v.size, weeklyRate: dailyRate * 7, daysLeft };
      })
      .filter((r) => Number.isFinite(r.daysLeft))
      .sort((a, b) => a.daysLeft - b.daysLeft);

    setForecast(forecastRows);
    setLoading(false);
  }

  if (loading) return <p className="text-center py-10 text-gray-500">جاري تحميل التحليلات...</p>;

  return (
    <div dir="rtl" className="max-w-5xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">لوحة التحليلات</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow">
          <h3 className="font-bold text-gray-700 mb-4">أعلى 5 قطع ربحاً (آخر 30 يوم)</h3>
          {topSellers.length === 0 ? (
            <p className="text-gray-400 text-sm py-10 text-center">لا توجد مبيعات مسجّلة خلال آخر 30 يوماً بعد.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topSellers} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `${v.toLocaleString()} د.ع`} />
                <Bar dataKey="profit" radius={[0, 8, 8, 0]}>
                  {topSellers.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow">
          <h3 className="font-bold text-gray-700 mb-4">اتجاه الربح اليومي</h3>
          {profitTrend.length === 0 ? (
            <p className="text-gray-400 text-sm py-10 text-center">لا توجد مبيعات مسجّلة خلال آخر 30 يوماً بعد.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={profitTrend}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v.toLocaleString()} د.ع`} />
                <Line type="monotone" dataKey="profit" stroke="#4f46e5" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <p className="font-bold text-amber-800 mb-1">لديك {stagnantItems.length} قطعة راكدة</p>
        <p className="text-sm text-amber-700">
          {stagnantItems.length
            ? stagnantItems.map((i) => `${i.name} (${i.color}/${i.size})`).join('، ')
            : 'لا توجد قطع راكدة حالياً'}
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow">
        <h3 className="font-bold text-gray-700 mb-4">🔮 توصيات إعادة الطلب (آخر 14 يوماً)</h3>
        <div className="space-y-2">
          {forecast.map((r, i) => (
            <div key={i} className={`flex justify-between items-center p-3 rounded-xl text-sm ${r.daysLeft <= 7 ? 'bg-red-50' : 'bg-gray-50'}`}>
              <span>{r.name} ({r.color}/{r.size}) — معدّل البيع: {r.weeklyRate.toFixed(1)} قطعة/أسبوع</span>
              <span>{r.daysLeft <= 7 ? '🚨 ' : ''}تنفد خلال ~{r.daysLeft} يوم</span>
            </div>
          ))}
          {forecast.length === 0 && <p className="text-gray-400 text-sm">لا توجد بيانات مبيعات كافية بعد خلال آخر 14 يوماً.</p>}
        </div>
      </div>
    </div>
  );
}

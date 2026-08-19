// components/AnalyticsDashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Cell, CartesianGrid } from 'recharts';
import { supabase } from '@/lib/supabase-client';
import { Wallet, TrendingUp, Receipt, Sparkles, PackageX, ArrowUp, ArrowDown, Printer, LineChart as LineChartIcon } from 'lucide-react';

const COLORS = ['#4f46e5', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'];

type Totals = { revenue: number; profit: number; count: number };

export default function AnalyticsDashboard({ storeId }: { storeId: string }) {
  const [topSellers, setTopSellers] = useState<{ name: string; profit: number }[]>([]);
  const [stagnantItems, setStagnantItems] = useState<{ name: string; color: string; size: string }[]>([]);
  const [profitTrend, setProfitTrend] = useState<{ day: string; profit: number }[]>([]);
  const [forecast, setForecast] = useState<{ name: string; color: string; size: string; weeklyRate: number; daysLeft: number }[]>([]);
  const [current, setCurrent] = useState<Totals>({ revenue: 0, profit: 0, count: 0 });
  const [previous, setPrevious] = useState<Totals>({ revenue: 0, profit: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [chartWidth, setChartWidth] = useState(320);

  useEffect(() => {
    loadAnalytics();
    const updateWidth = () => setChartWidth(Math.min(window.innerWidth - 80, 460));
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [storeId]);

  function sumPeriod(rows: any[]): Totals {
    let revenue = 0, profit = 0;
    for (const s of rows) {
      revenue += Number(s.sale_price_at_time) * Number(s.quantity_sold);
      profit += (Number(s.sale_price_at_time) - Number(s.cost_price_at_time)) * Number(s.quantity_sold);
    }
    return { revenue, profit, count: rows.length };
  }

  async function loadAnalytics() {
    setLoading(true);
    const now = new Date();
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo = new Date(now); sixtyDaysAgo.setDate(now.getDate() - 60);

    const { data: currentRows } = await supabase
      .from('sales')
      .select('sale_price_at_time, cost_price_at_time, quantity_sold, sold_at, product_variants(products(name))')
      .eq('store_id', storeId)
      .gte('sold_at', thirtyDaysAgo.toISOString());

    const { data: previousRows } = await supabase
      .from('sales')
      .select('sale_price_at_time, cost_price_at_time, quantity_sold')
      .eq('store_id', storeId)
      .gte('sold_at', sixtyDaysAgo.toISOString())
      .lt('sold_at', thirtyDaysAgo.toISOString());

    setCurrent(sumPeriod(currentRows ?? []));
    setPrevious(sumPeriod(previousRows ?? []));

    const byProduct: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    for (const s of currentRows ?? []) {
      const name = (s as any).product_variants?.products?.name ?? 'غير معروف';
      const profit = (Number(s.sale_price_at_time) - Number(s.cost_price_at_time)) * Number(s.quantity_sold);
      byProduct[name] = (byProduct[name] ?? 0) + profit;
      const day = new Date(s.sold_at).toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short' });
      byDay[day] = (byDay[day] ?? 0) + profit;
    }
    setTopSellers(Object.entries(byProduct).map(([name, profit]) => ({ name, profit })).sort((a, b) => b.profit - a.profit).slice(0, 5));
    setProfitTrend(Object.entries(byDay).map(([day, profit]) => ({ day, profit })));

    const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const { data: stagnantRaw } = await supabase
      .from('product_variants')
      .select('color, size, quantity, last_sold_at, products(name, store_id)')
      .or(`last_sold_at.lt.${ninetyDaysAgo.toISOString()},last_sold_at.is.null`)
      .gt('quantity', 0)
      .eq('products.store_id', storeId);
    setStagnantItems((stagnantRaw ?? []).map((v: any) => ({ name: v.products.name, color: v.color, size: v.size })));

    const fourteenDaysAgo = new Date(); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
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
      if (!soldByVariant[key]) soldByVariant[key] = { qty: variant.quantity, sold: 0, name: variant.products?.name ?? '—', color: variant.color, size: variant.size };
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

  const profitChangePct = previous.profit !== 0 ? ((current.profit - previous.profit) / Math.abs(previous.profit)) * 100 : null;
  const avgSale = current.count > 0 ? current.revenue / current.count : 0;

  const statCards = [
    { label: 'الإيرادات (30 يوم)', value: `${current.revenue.toLocaleString()} د.ع`, icon: Wallet, bg: 'from-indigo-500 to-indigo-600' },
    { label: 'صافي الربح (30 يوم)', value: `${current.profit.toLocaleString()} د.ع`, icon: TrendingUp, bg: 'from-emerald-500 to-emerald-600', badge: profitChangePct },
    { label: 'عدد العمليات', value: current.count.toLocaleString(), icon: Receipt, bg: 'from-amber-500 to-amber-600' },
    { label: 'متوسط قيمة البيعة', value: `${Math.round(avgSale).toLocaleString()} د.ع`, icon: Sparkles, bg: 'from-fuchsia-500 to-fuchsia-600' },
  ];

  return (
    <div dir="rtl" className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
            <LineChartIcon size={18} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">لوحة التحليلات</h2>
        </div>
        <button onClick={() => window.print()} className="print:hidden flex items-center gap-1.5 px-3 sm:px-4 h-9 bg-gray-900 text-white rounded-lg text-xs font-bold">
          <Printer size={14} /> <span className="hidden sm:inline">طباعة تقرير</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((c, i) => (
          <div key={i} className={`bg-gradient-to-br ${c.bg} rounded-2xl p-4 text-white shadow-lg`}>
            <c.icon size={20} className="opacity-90 mb-2" />
            <p className="text-xs opacity-90">{c.label}</p>
            <p className="text-base sm:text-lg font-bold mt-0.5 break-words">{c.value}</p>
            {c.badge !== undefined && c.badge !== null && (
              <span className={`inline-flex items-center gap-0.5 text-[11px] mt-1 px-1.5 py-0.5 rounded-full ${c.badge >= 0 ? 'bg-white/25' : 'bg-black/20'}`}>
                {c.badge >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                {Math.abs(Math.round(c.badge))}% عن الشهر الماضي
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4">أعلى 5 قطع ربحاً (آخر 30 يوم)</h3>
          {topSellers.length === 0 ? (
            <p className="text-gray-400 text-sm py-16 text-center">لا توجد مبيعات مسجّلة خلال آخر 30 يوماً بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <BarChart width={chartWidth} height={220} data={topSellers} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v.toLocaleString()} د.ع`} />
                <Bar dataKey="profit" radius={[0, 8, 8, 0]}>
                  {topSellers.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4">اتجاه الربح اليومي</h3>
          {profitTrend.length === 0 ? (
            <p className="text-gray-400 text-sm py-16 text-center">لا توجد مبيعات مسجّلة خلال آخر 30 يوماً بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <LineChart width={chartWidth} height={220} data={profitTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `${v.toLocaleString()} د.ع`} />
                <Line type="monotone" dataKey="profit" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <PackageX size={18} className="text-amber-600" />
          <h3 className="font-bold text-gray-800">{stagnantItems.length} قطعة راكدة</h3>
        </div>
        {stagnantItems.length === 0 ? (
          <p className="text-gray-400 text-sm">لا توجد قطع راكدة حالياً 🎉</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {stagnantItems.map((i, idx) => (
              <span key={idx} className="bg-amber-50 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                {i.name} ({i.color}/{i.size})
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
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

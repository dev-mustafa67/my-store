'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Wallet, TrendingUp, Receipt, Sparkles, PackageX, ArrowUp, ArrowDown, Printer, LineChart as LineChartIcon, Landmark } from 'lucide-react';

type Totals = { revenue: number; profit: number; count: number };

export default function AnalyticsDashboard({ storeId }: { storeId: string }) {
  const [stagnantItems, setStagnantItems] = useState<{ name: string; color: string; size: string }[]>([]);
  const [forecast, setForecast] = useState<{ name: string; color: string; size: string; weeklyRate: number; daysLeft: number }[]>([]);
  const [current, setCurrent] = useState<Totals>({ revenue: 0, profit: 0, count: 0 });
  const [previous, setPrevious] = useState<Totals>({ revenue: 0, profit: 0, count: 0 });
  const [todaySummary, setTodaySummary] = useState({ cashSales: 0, creditSales: 0, collectedDebtsToday: 0, totalCashInDrawer: 0, count: 0, profit: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (storeId) loadAnalytics();
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
    try {
      setLoading(true);
      const now = new Date();
      const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
      const sixtyDaysAgo = new Date(now); sixtyDaysAgo.setDate(now.getDate() - 60);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      // 1. مبيعات اليوم
      const { data: todaySales } = await supabase
        .from('sales')
        .select('*')
        .eq('store_id', storeId)
        .gte('sold_at', startOfToday);

      // 2. الديون المحصلة اليوم
      const { data: todayPaidDebts } = await supabase
        .from('debts')
        .select('amount, paid_at')
        .eq('store_id', storeId)
        .eq('paid', true)
        .gte('paid_at', startOfToday);

      let cashSales = 0, creditSales = 0, todayProfit = 0;
      todaySales?.forEach((r) => {
        const val = Number(r.sale_price_at_time) * Number(r.quantity_sold);
        const prf = (Number(r.sale_price_at_time) - Number(r.cost_price_at_time)) * Number(r.quantity_sold);
        if (r.on_credit) creditSales += val;
        else cashSales += val;
        todayProfit += prf;
      });

      const collectedDebts = todayPaidDebts?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

      setTodaySummary({
        cashSales,
        creditSales,
        collectedDebtsToday: collectedDebts,
        totalCashInDrawer: cashSales + collectedDebts,
        count: todaySales?.length || 0,
        profit: todayProfit,
      });

      // 3. إحصائيات 30 يوم
      const { data: currentRows } = await supabase
        .from('sales')
        .select('sale_price_at_time, cost_price_at_time, quantity_sold, sold_at')
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

      // 4. البضائع الراكدة
      const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const { data: stagnantRaw } = await supabase
        .from('product_variants')
        .select('color, size, quantity, last_sold_at, products(name, store_id)')
        .or(`last_sold_at.lt.${ninetyDaysAgo.toISOString()},last_sold_at.is.null`)
        .gt('quantity', 0)
        .eq('products.store_id', storeId);
      setStagnantItems((stagnantRaw ?? []).map((v: any) => ({ name: v.products?.name ?? 'قطعة', color: v.color, size: v.size })));

      // 5. توصيات النواقص (14 يوم)
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
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p className="text-center py-10 text-gray-500 font-medium">جاري تحميل التحليلات...</p>;

  const profitChangePct = previous.profit !== 0 ? ((current.profit - previous.profit) / Math.abs(previous.profit)) * 100 : null;
  const avgSale = current.count > 0 ? current.revenue / current.count : 0;

  const statCards = [
    { label: 'إجمالي المبيعات (30 يوم)', value: `${current.revenue.toLocaleString()} د.ع`, icon: Wallet, bg: 'from-indigo-500 to-indigo-600' },
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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">لوحة التحليلات المالية</h2>
        </div>
        <button onClick={() => window.print()} className="print:hidden flex items-center gap-1.5 px-3 sm:px-4 h-9 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-gray-800">
          <Printer size={14} /> <span className="hidden sm:inline">طباعة تقرير الصندوق</span>
        </button>
      </div>

      {/* صندوق إغلاق الصندوق اليومي */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Landmark size={20} className="text-emerald-400" />
            <h3 className="font-bold text-sm sm:text-base">إغلاق الصندوق اليومي (الكاش الحقيقي)</h3>
          </div>
          <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-300 font-mono">
            {new Date().toLocaleDateString('ar-IQ')}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-emerald-500/30">
            <p className="text-xs text-emerald-400 font-medium">الكاش الفعلي في الدرج</p>
            <p className="text-xl font-bold text-white mt-1">{todaySummary.totalCashInDrawer.toLocaleString()} د.ع</p>
            <p className="text-[10px] text-slate-400 mt-1">كاش مبيعات: {todaySummary.cashSales.toLocaleString()} + ديون مستلمة: {todaySummary.collectedDebtsToday.toLocaleString()}</p>
          </div>
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-amber-500/30">
            <p className="text-xs text-amber-400 font-medium">ديون مسجلة اليوم (آجل)</p>
            <p className="text-xl font-bold text-white mt-1">{todaySummary.creditSales.toLocaleString()} د.ع</p>
          </div>
          <div className="bg-slate-800/80 p-3.5 rounded-xl">
            <p className="text-xs text-slate-400">عمليات اليوم</p>
            <p className="text-xl font-bold text-white mt-1">{todaySummary.count}</p>
          </div>
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-indigo-500/30">
            <p className="text-xs text-indigo-400 font-medium">أرباح مبيعات اليوم</p>
            <p className="text-xl font-bold text-white mt-1">{todaySummary.profit.toLocaleString()} د.ع</p>
          </div>
        </div>
      </div>

      {/* بطاقات الإحصائيات العامة */}
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

      {/* القطع الراكدة */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <PackageX size={18} className="text-amber-600" />
          <h3 className="font-bold text-gray-800">{stagnantItems.length} قطعة راكدة (لم تُبع منذ 90 يوم)</h3>
        </div>
        {stagnantItems.length === 0 ? (
          <p className="text-gray-400 text-sm">لا توجد قطع راكدة حالياً 🎉</p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
            {stagnantItems.map((i, idx) => (
              <span key={idx} className="bg-amber-50 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-100">
                {i.name} ({i.color}/{i.size})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* توصيات إعادة الطلب */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-4">🔮 توصيات إعادة الطلب والنواقص المتوقعة</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {forecast.map((r, i) => (
            <div key={i} className={`flex justify-between items-center p-3 rounded-xl text-sm ${r.daysLeft <= 7 ? 'bg-red-50 text-red-900 border border-red-100' : 'bg-gray-50 text-gray-700'}`}>
              <span className="font-medium">{r.name} ({r.color}/{r.size}) — معدّل البيع: {r.weeklyRate.toFixed(1)} قطعة/أسبوع</span>
              <span className="font-bold whitespace-nowrap">{r.daysLeft <= 7 ? '🚨 ' : ''}تنفد خلال ~{r.daysLeft} يوم</span>
            </div>
          ))}
          {forecast.length === 0 && <p className="text-gray-400 text-sm text-center py-4">لا توجد بيانات مبيعات كافية بعد خلال آخر 14 يوماً.</p>}
        </div>
      </div>
    </div>
  );
}

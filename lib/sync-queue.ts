// lib/sync-queue.ts
import { supabase } from './supabase-client';
import { db, type LocalProductVariant } from './offline-db';

const MAX_SYNC_ATTEMPTS = 5;
let isSyncing = false;

async function pushPendingSales() {
  const unsynced = (await db.sales_queue.toArray()).filter((s) => !s.synced);
  let pushed = 0;
  let failed = 0;

  for (const sale of unsynced) {
    if (sale.syncAttempts >= MAX_SYNC_ATTEMPTS) continue;

    const { error } = await supabase.from('sales').insert({
      id: sale.id,
      store_id: sale.storeId,
      variant_id: sale.variantId,
      quantity_sold: sale.quantitySold,
      sale_price_at_time: sale.salePriceAtTime,
      cost_price_at_time: sale.costPriceAtTime,
      sold_at: sale.soldAt,
      customer_id: (sale as any).customerId ?? null,
      on_credit: (sale as any).onCredit ?? false,
    });

    if (error) {
      failed++;
      await db.sales_queue.update(sale.id, {
        syncAttempts: sale.syncAttempts + 1,
        lastSyncError: error.message,
      });
      continue;
    }
    pushed++;
    await db.sales_queue.update(sale.id, { synced: true });
  }
  return { pushed, failed };
}

async function pullLatestInventory(storeId: string) {
  const meta = await db.sync_meta.get('lastInventoryPull');
  const since = meta?.value ?? '1970-01-01T00:00:00.000Z';

  const { data, error } = await supabase
    .from('product_variants')
    .select('id, product_id, color, size, barcode, cost_price, sale_price, quantity, last_sold_at, updated_at, products(name, store_id)')
    .eq('products.store_id', storeId)
    .gt('updated_at', since);

  if (error || !data) return 0;

  const rows: LocalProductVariant[] = data.map((v: any) => ({
    id: v.id,
    productId: v.product_id,
    productName: v.products.name,
    color: v.color,
    size: v.size,
    barcode: v.barcode,
    costPrice: v.cost_price,
    salePrice: v.sale_price,
    quantity: v.quantity,
    lastSoldAt: v.last_sold_at,
    updatedAt: v.updated_at,
  }));

  if (rows.length > 0) {
    await db.product_variants.bulkPut(rows);
    await db.sync_meta.put({ key: 'lastInventoryPull', value: new Date().toISOString() });
  }
  return rows.length;
}

export async function syncQueue(storeId: string) {
  if (isSyncing) return { skipped: true };
  if (!navigator.onLine) return { skipped: true, reason: 'offline' };

  isSyncing = true;
  try {
    const salesResult = await pushPendingSales();
    const inventoryUpdated = await pullLatestInventory(storeId);
    return { ...salesResult, inventoryUpdated };
  } finally {
    isSyncing = false;
  }
}

export function initAutoSync(storeId: string) {
  window.addEventListener('online', () => syncQueue(storeId));
  const interval = setInterval(() => syncQueue(storeId), 60_000);
  if (navigator.onLine) syncQueue(storeId);
  return () => clearInterval(interval);
}

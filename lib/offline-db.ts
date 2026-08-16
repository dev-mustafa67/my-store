// lib/offline-db.ts
import Dexie, { type Table } from 'dexie';

export interface LocalProductVariant {
  id: string;
  productId: string;
  productName: string;
  color: string;
  size: string;
  barcode: string;
  costPrice: number;
  salePrice: number;
  quantity: number;
  lastSoldAt: string | null;
  updatedAt: string;
}

export interface QueuedSale {
  id: string;
  saleId: string;
  storeId: string;
  variantId: string;
  quantitySold: number;
  salePriceAtTime: number;
  costPriceAtTime: number;
  soldAt: string;
  synced: boolean;
  syncAttempts: number;
  lastSyncError?: string;
}

export interface SyncMeta {
  key: string;
  value: string;
}

class InventoryOfflineDB extends Dexie {
  product_variants!: Table<LocalProductVariant, string>;
  sales_queue!: Table<QueuedSale, string>;
  sync_meta!: Table<SyncMeta, string>;

  constructor() {
    super('inventory_offline_db');
    this.version(1).stores({
      product_variants: 'id, barcode, productId, quantity',
      sales_queue: 'id, saleId, synced, storeId',
      sync_meta: 'key',
    });
  }
}

export const db = new InventoryOfflineDB();

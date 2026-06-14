import { InventoryItem } from '../types';
import {
  cacheInventoryItem,
  cacheInventoryItems,
  enqueueMutation,
  getAllCachedInventory,
  getCachedInventoryItem,
  getPendingMutations,
  removeCachedInventoryItem,
  removePendingMutation,
} from './offlineDb';
import {
  deleteInventoryItem,
  fetchInventoryItemByBarcode,
  fetchInventoryItems,
  isSupabaseConfigured,
  upsertInventoryItem,
} from './supabaseInventory';

export type InventoryLoadSource = 'remote' | 'cache';

export interface InventoryLoadResult {
  items: InventoryItem[];
  source: InventoryLoadSource;
}

export function isBrowserOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function isRetryableSyncError(error: unknown): boolean {
  if (!isBrowserOnline()) return true;

  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    return message.includes('fetch') || message.includes('network') || message.includes('failed');
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('connexion') ||
      message.includes('connection')
    );
  }

  return false;
}

export async function loadInventoryItems(): Promise<InventoryLoadResult> {
  if (!isSupabaseConfigured) {
    return { items: [], source: 'cache' };
  }

  if (isBrowserOnline()) {
    try {
      const items = await fetchInventoryItems();
      await cacheInventoryItems(items);
      return { items, source: 'remote' };
    } catch (error) {
      if (isRetryableSyncError(error)) {
        const cached = await getAllCachedInventory();
        if (cached.length > 0) {
          return { items: cached, source: 'cache' };
        }
      }
      throw error;
    }
  }

  const cached = await getAllCachedInventory();
  return { items: cached, source: 'cache' };
}

export async function fetchInventoryItemWithFallback(
  barcode: string,
): Promise<InventoryItem | null> {
  if (!isSupabaseConfigured) {
    return getCachedInventoryItem(barcode);
  }

  if (isBrowserOnline()) {
    try {
      const item = await fetchInventoryItemByBarcode(barcode);
      if (item) {
        await cacheInventoryItem(item);
      }
      return item;
    } catch (error) {
      if (isRetryableSyncError(error)) {
        return getCachedInventoryItem(barcode);
      }
      throw error;
    }
  }

  return getCachedInventoryItem(barcode);
}

export async function syncInventoryItem(item: InventoryItem): Promise<{
  item: InventoryItem;
  queued: boolean;
}> {
  await cacheInventoryItem(item);

  if (!isSupabaseConfigured) {
    return { item, queued: false };
  }

  if (!isBrowserOnline()) {
    await enqueueMutation({ type: 'upsert', payload: item });
    return { item, queued: true };
  }

  try {
    const savedItem = await upsertInventoryItem(item);
    await cacheInventoryItem(savedItem);
    return { item: savedItem, queued: false };
  } catch (error) {
    if (isRetryableSyncError(error)) {
      await enqueueMutation({ type: 'upsert', payload: item });
      return { item, queued: true };
    }
    throw error;
  }
}

export async function syncDeleteInventoryItem(barcode: string): Promise<{ queued: boolean }> {
  await removeCachedInventoryItem(barcode);

  if (!isSupabaseConfigured) {
    return { queued: false };
  }

  if (!isBrowserOnline()) {
    await enqueueMutation({ type: 'delete', payload: { barcode } });
    return { queued: true };
  }

  try {
    await deleteInventoryItem(barcode);
    return { queued: false };
  } catch (error) {
    if (isRetryableSyncError(error)) {
      await enqueueMutation({ type: 'delete', payload: { barcode } });
      return { queued: true };
    }
    throw error;
  }
}

let flushInProgress = false;

export async function flushPendingMutations(): Promise<{
  synced: number;
  failed: number;
  remaining: number;
}> {
  if (!isSupabaseConfigured || !isBrowserOnline() || flushInProgress) {
    const remaining = (await getPendingMutations()).length;
    return { synced: 0, failed: 0, remaining };
  }

  flushInProgress = true;
  let synced = 0;
  let failed = 0;

  try {
    const mutations = await getPendingMutations();

    for (const mutation of mutations) {
      if (!mutation.id) continue;

      try {
        if (mutation.type === 'upsert') {
          const savedItem = await upsertInventoryItem(mutation.payload as InventoryItem);
          await cacheInventoryItem(savedItem);
        } else {
          const { barcode } = mutation.payload as { barcode: string };
          await deleteInventoryItem(barcode);
          await removeCachedInventoryItem(barcode);
        }

        await removePendingMutation(mutation.id);
        synced++;
      } catch (error) {
        if (isRetryableSyncError(error)) {
          break;
        }

        console.error('Mutation hors-ligne irrécupérable:', mutation, error);
        await removePendingMutation(mutation.id);
        failed++;
      }
    }
  } finally {
    flushInProgress = false;
  }

  const remaining = (await getPendingMutations()).length;
  return { synced, failed, remaining };
}

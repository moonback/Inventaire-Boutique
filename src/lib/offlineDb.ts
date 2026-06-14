import { InventoryItem } from '../types';

const DB_NAME = 'boutique-inventaire-offline';
const DB_VERSION = 1;

export type PendingMutationType = 'upsert' | 'delete';

export interface PendingMutation {
  id?: number;
  type: PendingMutationType;
  payload: InventoryItem | { barcode: string };
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error ?? new Error('Impossible d\'ouvrir IndexedDB.'));

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('inventory_cache')) {
        db.createObjectStore('inventory_cache', { keyPath: 'barcode' });
      }

      if (!db.objectStoreNames.contains('pending_mutations')) {
        const store = db.createObjectStore('pending_mutations', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('createdAt', 'createdAt');
      }
    };

    request.onsuccess = () => resolve(request.result);
  });
}

function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = fn(store);

        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error ?? new Error('Erreur de transaction IndexedDB.'));
        tx.onabort = () => reject(tx.error ?? new Error('Transaction IndexedDB annulée.'));
      }),
  );
}

function runWriteTransaction(
  storeName: string,
  fn: (store: IDBObjectStore) => void,
): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        fn(store);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Erreur de transaction IndexedDB.'));
        tx.onabort = () => reject(tx.error ?? new Error('Transaction IndexedDB annulée.'));
      }),
  );
}

export async function cacheInventoryItem(item: InventoryItem): Promise<void> {
  await runWriteTransaction('inventory_cache', (store) => {
    store.put(item);
  });
}

export async function cacheInventoryItems(items: InventoryItem[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('inventory_cache', 'readwrite');
    const store = tx.objectStore('inventory_cache');

    for (const item of items) {
      store.put(item);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Erreur de mise en cache.'));
  });
}

export async function removeCachedInventoryItem(barcode: string): Promise<void> {
  await runWriteTransaction('inventory_cache', (store) => {
    store.delete(barcode);
  });
}

export async function getCachedInventoryItem(barcode: string): Promise<InventoryItem | null> {
  const result = await runTransaction<InventoryItem | undefined>(
    'inventory_cache',
    'readonly',
    (store) => store.get(barcode),
  );
  return result ?? null;
}

export async function getAllCachedInventory(): Promise<InventoryItem[]> {
  const result = await runTransaction<InventoryItem[]>(
    'inventory_cache',
    'readonly',
    (store) => store.getAll(),
  );
  return [...(result ?? [])].sort((a, b) => b.lastUpdated - a.lastUpdated);
}

export async function enqueueMutation(
  mutation: Omit<PendingMutation, 'id' | 'createdAt'> & { createdAt?: number },
): Promise<void> {
  await runWriteTransaction('pending_mutations', (store) => {
    store.add({
      ...mutation,
      createdAt: mutation.createdAt ?? Date.now(),
    });
  });
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const result = await runTransaction<PendingMutation[]>(
    'pending_mutations',
    'readonly',
    (store) => store.getAll(),
  );
  return [...(result ?? [])].sort((a, b) => a.createdAt - b.createdAt);
}

export async function getPendingMutationCount(): Promise<number> {
  const mutations = await getPendingMutations();
  return mutations.length;
}

export async function removePendingMutation(id: number): Promise<void> {
  await runWriteTransaction('pending_mutations', (store) => {
    store.delete(id);
  });
}

export async function clearPendingMutations(): Promise<void> {
  await runWriteTransaction('pending_mutations', (store) => {
    store.clear();
  });
}

import { InventoryItem } from '../types';
import { getSession } from './supabaseAuth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const inventoryTable = import.meta.env.VITE_SUPABASE_INVENTORY_TABLE || 'inventory_items';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

interface SupabaseInventoryRow {
  barcode: string;
  name: string;
  quantity: number;
  image_url: string | null;
  brand: string | null;
  category: string | null;
  last_updated: number;
}

function getRestUrl(path = '') {
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL est manquant.');
  }

  return `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${inventoryTable}${path}`;
}

function getHeaders(extraHeaders?: HeadersInit): HeadersInit {
  if (!supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY est manquant.');
  }

  const session = getSession();
  const authHeader = session?.accessToken
    ? `Bearer ${session.accessToken}`
    : `Bearer ${supabaseAnonKey}`;

  return {
    apikey: supabaseAnonKey,
    Authorization: authHeader,
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
}

function toRow(item: InventoryItem): SupabaseInventoryRow {
  return {
    barcode: item.barcode,
    name: item.name,
    quantity: item.quantity,
    image_url: item.imageUrl ?? null,
    brand: item.brand ?? null,
    category: item.category ?? null,
    last_updated: item.lastUpdated,
  };
}

function toInventoryItem(row: SupabaseInventoryRow): InventoryItem {
  return {
    barcode: row.barcode,
    name: row.name,
    quantity: row.quantity,
    imageUrl: row.image_url ?? undefined,
    brand: row.brand ?? undefined,
    category: row.category ?? undefined,
    lastUpdated: row.last_updated,
  };
}

async function parseSupabaseError(response: Response) {
  const body = await response.text();
  try {
    const error = JSON.parse(body);
    return error.message || body;
  } catch {
    return body || response.statusText;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(await parseSupabaseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function fetchInventoryItems(): Promise<InventoryItem[]> {
  const rows = await request<SupabaseInventoryRow[]>(getRestUrl('?select=*&order=last_updated.desc'), {
    headers: getHeaders(),
  });

  return rows.map(toInventoryItem);
}


export async function fetchInventoryItemByBarcode(barcode: string): Promise<InventoryItem | null> {
  const rows = await request<SupabaseInventoryRow[]>(getRestUrl(`?select=*&barcode=eq.${encodeURIComponent(barcode)}&limit=1`), {
    headers: getHeaders(),
  });

  return rows[0] ? toInventoryItem(rows[0]) : null;
}

export async function upsertInventoryItem(item: InventoryItem): Promise<InventoryItem> {
  const rows = await request<SupabaseInventoryRow[]>(getRestUrl('?on_conflict=barcode'), {
    method: 'POST',
    headers: getHeaders({ Prefer: 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify(toRow(item)),
  });

  return toInventoryItem(rows[0]);
}

export async function deleteInventoryItem(barcode: string): Promise<void> {
  await request<void>(getRestUrl(`?barcode=eq.${encodeURIComponent(barcode)}`), {
    method: 'DELETE',
    headers: getHeaders(),
  });
}

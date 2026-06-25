import { InventoryItem } from '../types';
import { getHeaders, getRestUrl as getTableRestUrl, getSupabaseBaseUrl, isSupabaseConfigured as isSupabaseRestConfigured, handleSupabaseUnauthorized, parseSupabaseError, request } from './supabaseRest';

const inventoryTable = import.meta.env.VITE_SUPABASE_INVENTORY_TABLE || 'inventory_items';

export const isSupabaseConfigured = isSupabaseRestConfigured;

export interface SupabaseInventoryRow {
  barcode: string;
  name: string;
  quantity: number;
  image_url: string | null;
  brand: string | null;
  category: string | null;
  last_updated: number;
  purchase_price: number | null;
  sales_price: number | null;
  last_movement: number | null;
}

function getRestUrl(path = '') {
  return getTableRestUrl(inventoryTable, path);
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
    purchase_price: item.purchasePrice ?? null,
    sales_price: item.salesPrice ?? null,
    last_movement: item.lastMovement ?? null,
  };
}

export function toInventoryItem(row: SupabaseInventoryRow): InventoryItem {
  return {
    barcode: row.barcode,
    name: row.name,
    quantity: row.quantity,
    imageUrl: row.image_url ?? undefined,
    brand: row.brand ?? undefined,
    category: row.category ?? undefined,
    lastUpdated: row.last_updated,
    purchasePrice: row.purchase_price ?? undefined,
    salesPrice: row.sales_price ?? undefined,
    lastMovement: row.last_movement ?? undefined,
  };
}

export async function fetchInventoryItems(pageSize = 500): Promise<InventoryItem[]> {
  const allRows: SupabaseInventoryRow[] = [];
  let offset = 0;

  while (true) {
    const rows = await request<SupabaseInventoryRow[]>(
      getRestUrl(`?select=*&order=last_updated.desc&limit=${pageSize}&offset=${offset}`),
      { headers: getHeaders() },
    );

    allRows.push(...rows);

    if (rows.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return allRows.map(toInventoryItem);
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

export async function uploadProductImage(barcode: string, file: File): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase n'est pas configuré.");
  }

  const extension = file.name.split('.').pop() || 'jpg';
  const fileName = `${barcode}_${Date.now()}.${extension}`;
  const baseUrl = getSupabaseBaseUrl();
  const uploadUrl = `${baseUrl}/storage/v1/object/product-photos/${fileName}`;

  const headers = {
    ...getHeaders(),
  } as any;
  headers['Content-Type'] = file.type;
  headers['x-upsert'] = 'true';

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers,
    body: file,
  });

  if (response.status === 401) {
    // Même gestion que les appels REST : la session locale n'est plus valide.
    handleSupabaseUnauthorized();
  }

  if (!response.ok) {
    throw new Error(await parseSupabaseError(response));
  }

  return `${baseUrl}/storage/v1/object/public/product-photos/${fileName}`;
}

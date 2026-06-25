import { CategoryItem } from '../types';
import { getHeaders, getRestUrl as getTableRestUrl, isSupabaseConfigured as isSupabaseRestConfigured, request } from './supabaseRest';

const categoriesTable = 'categories';

export const isSupabaseConfigured = isSupabaseRestConfigured;

export interface SupabaseCategoryRow {
  id?: string;
  name: string;
  icon: string | null;
  created_at?: string;
}

function getRestUrl(path = '') {
  return getTableRestUrl(categoriesTable, path);
}

function toRow(item: CategoryItem): SupabaseCategoryRow {
  const row: SupabaseCategoryRow = {
    name: item.name,
    icon: item.icon ?? null,
  };
  if (item.id) {
    row.id = item.id;
  }
  return row;
}

export function toCategoryItem(row: SupabaseCategoryRow): CategoryItem {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon ?? undefined,
  };
}

export async function fetchCategories(): Promise<CategoryItem[]> {
  if (!isSupabaseConfigured) return [];
  const rows = await request<SupabaseCategoryRow[]>(getRestUrl('?select=*&order=name.asc'), {
    headers: getHeaders(),
  });

  return rows.map(toCategoryItem);
}

export async function upsertCategory(item: CategoryItem): Promise<CategoryItem> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase n'est pas configuré.");
  }
  const row = toRow(item);
  const targetUrl = item.id
    ? getRestUrl(`?id=eq.${encodeURIComponent(item.id)}`)
    : getRestUrl('?on_conflict=name');

  const rows = await request<SupabaseCategoryRow[]>(targetUrl, {
    method: item.id ? 'PATCH' : 'POST',
    headers: getHeaders({
      Prefer: item.id
        ? 'return=representation'
        : 'resolution=merge-duplicates,return=representation',
    }),
    body: JSON.stringify(row),
  });

  return toCategoryItem(rows[0]);
}

export async function deleteCategory(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase n'est pas configuré.");
  }
  await request<void>(getRestUrl(`?id=eq.${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: getHeaders(),
  });
}

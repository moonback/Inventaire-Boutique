import { CategoryItem } from '../types';
import { getSession } from './supabaseAuth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const categoriesTable = 'categories';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export interface SupabaseCategoryRow {
  id?: string;
  name: string;
  icon: string | null;
  created_at?: string;
}

function getRestUrl(path = '') {
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL est manquant.');
  }

  return `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${categoriesTable}${path}`;
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

function toCategoryItem(row: SupabaseCategoryRow): CategoryItem {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon ?? undefined,
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
  const rows = await request<SupabaseCategoryRow[]>(getRestUrl('?on_conflict=name'), {
    method: 'POST',
    headers: getHeaders({ Prefer: 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify(toRow(item)),
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

import { clearSession, getSession } from './supabaseAuth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function getSupabaseBaseUrl(): string {
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL est manquant.');
  }

  return supabaseUrl.replace(/\/$/, '');
}

export function getRestUrl(table: string, path = ''): string {
  return `${getSupabaseBaseUrl()}/rest/v1/${table}${path}`;
}

export function getHeaders(extraHeaders?: HeadersInit): HeadersInit {
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

export async function parseSupabaseError(response: Response): Promise<string> {
  const body = await response.text();
  try {
    const error = JSON.parse(body);
    return error.message || body;
  } catch {
    return body || response.statusText;
  }
}

export function handleSupabaseUnauthorized(): void {
  try {
    clearSession();
  } catch {
    // ignore
  }
}

export async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (response.status === 401) {
    handleSupabaseUnauthorized();
  }

  if (!response.ok) {
    throw new Error(await parseSupabaseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

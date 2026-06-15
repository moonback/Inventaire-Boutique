const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export interface UserSession {
  accessToken: string;
  email: string;
  id: string;
}

const SESSION_KEY = "boutique_auth_session";

function getRestHeaders(extraHeaders?: HeadersInit): HeadersInit {
  if (!supabaseAnonKey) {
    throw new Error("VITE_SUPABASE_ANON_KEY est manquant.");
  }
  return {
    apikey: supabaseAnonKey,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}

function decodeJwtExp(token: string): number | null {
  // JWT = header.payload.signature
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const payloadB64Url = parts[1];
    const payloadB64 = payloadB64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(payloadB64);
    const payload = JSON.parse(json);

    const exp = payload?.exp;
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
}

function isAccessTokenExpired(token: string): boolean {
  const exp = decodeJwtExp(token);
  if (!exp) return false; // Si exp introuvable, on évite de casser des sessions existantes.

  // exp est en secondes depuis epoch
  const nowSeconds = Date.now() / 1000;

  // marge : 30s pour éviter les races au moment de l’expiration
  return nowSeconds >= exp - 30;
}

export function getSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as UserSession;
    if (!parsed?.accessToken) return null;

    if (isAccessTokenExpired(parsed.accessToken)) {
      clearSession();
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("Erreur de lecture de session:", error);
    return null;
  }
}

export function saveSession(session: UserSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export async function signUp(email: string, password: string): Promise<UserSession> {
  if (!supabaseUrl) throw new Error("VITE_SUPABASE_URL est manquant.");

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/signup`, {
    method: "POST",
    headers: getRestHeaders(),
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.msg || data.error_description || data.message || "Erreur lors de l'inscription.");
  }

  // If auto-confirm is enabled in Supabase, signup returns access_token directly
  if (data.access_token) {
    const session: UserSession = {
      accessToken: data.access_token,
      email: data.user.email,
      id: data.user.id,
    };
    saveSession(session);
    return session;
  }

  // If email confirmation is required, let the user know
  throw new Error("Compte créé ! Veuillez confirmer votre e-mail avant de vous connecter.");
}

export async function signIn(email: string, password: string): Promise<UserSession> {
  if (!supabaseUrl) throw new Error("VITE_SUPABASE_URL est manquant.");

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: getRestHeaders(),
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.message || "Identifiants invalides ou erreur de connexion.");
  }

  const session: UserSession = {
    accessToken: data.access_token,
    email: data.user.email,
    id: data.user.id,
  };
  saveSession(session);
  return session;
}

export async function signOut(token: string): Promise<void> {
  if (!supabaseUrl) return;

  try {
    await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/logout`, {
      method: "POST",
      headers: getRestHeaders({
        Authorization: `Bearer ${token}`,
      }),
    });
  } catch (error) {
    console.error("Erreur de déconnexion réseau (session locale nettoyée) :", error);
  } finally {
    clearSession();
  }
}

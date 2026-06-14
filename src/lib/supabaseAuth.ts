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

export function getSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
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

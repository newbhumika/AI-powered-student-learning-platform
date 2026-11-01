/**
 * Typed frontend API helper for communicating with the Express backend.
 */

let inMemoryToken: string | null = null;

const SESSION_KEY = 'sla_session_token';

export function getStoredToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    inMemoryToken = window.sessionStorage.getItem(SESSION_KEY);
    return inMemoryToken;
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  inMemoryToken = token;
  try {
    if (token) {
      window.sessionStorage.setItem(SESSION_KEY, token);
    } else {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Ignore storage restriction errors in strict iframe modes
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : { error: await response.text() };

  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }

  return data as T;
}

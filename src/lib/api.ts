/**
 * Typed frontend API helper for communicating with the Express backend.
 */

let inMemoryToken: string | null = null;

const SESSION_KEY = 'sla_session_token';

export function getStoredToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    const fromSession = window.sessionStorage.getItem(SESSION_KEY);
    if (fromSession) {
      inMemoryToken = fromSession;
      return inMemoryToken;
    }
  } catch {
    // Ignore storage restriction errors in strict iframe modes
  }
  try {
    const fromLocal = window.localStorage.getItem(SESSION_KEY);
    if (fromLocal) {
      inMemoryToken = fromLocal;
      return inMemoryToken;
    }
  } catch {
    // Ignore storage restriction errors in strict iframe modes
  }
  return null;
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
  try {
    if (token) {
      window.localStorage.setItem(SESSION_KEY, token);
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Ignore storage restriction errors in strict iframe modes
  }
}

async function performFetch<T>(
  path: string,
  options: RequestInit,
  token: string | null
): Promise<{ response: Response; data: T & { error?: string } }> {
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

  return { response, data };
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  let { response, data } = await performFetch<T>(path, options, token);

  // Automatic passwordless token recovery if session rotated (except initial /api/auth/me probe)
  if (
    response.status === 401 &&
    path !== '/api/auth/me' &&
    path !== '/api/auth/sandbox-session'
  ) {
    try {
      const role = path.startsWith('/api/admin') ? 'admin' : 'student';
      const refreshRes = await fetch('/api/auth/sandbox-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (refreshRes.ok) {
        const refreshed = (await refreshRes.json()) as { token?: string };
        if (refreshed.token) {
          setStoredToken(refreshed.token);
          ({ response, data } = await performFetch<T>(
            path,
            options,
            refreshed.token
          ));
        }
      }
    } catch {
      // Fall through to original error if recovery fails
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }

  return data as T;
}

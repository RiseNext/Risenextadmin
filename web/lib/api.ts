export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type ApiError = { status: number; message: string; payload?: unknown };

const TOKEN_KEY = 'rn_access_token';
const REFRESH_KEY = 'rn_refresh_token';

export const tokens = {
  get access() {
    return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
  },
  get refresh() {
    return typeof window === 'undefined' ? null : localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

async function refreshAccess(): Promise<boolean> {
  const refresh = tokens.refresh;
  if (!refresh) return false;
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ refreshToken: refresh }),
  });
  if (!res.ok) return false;
  const json = (await res.json()) as { accessToken: string };
  tokens.set(json.accessToken);
  return true;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit & { raw?: boolean; retry?: boolean } = {}
): Promise<T> {
  const { raw, retry, ...init } = options;
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && init.body) headers.set('Content-Type', 'application/json');
  const access = tokens.access;
  if (access) headers.set('Authorization', `Bearer ${access}`);

  const res = await fetch(`${API_URL}/api${path}`, { ...init, headers, credentials: 'include' });

  if (res.status === 401 && !retry) {
    if (await refreshAccess()) return api<T>(path, { ...options, retry: true });
    if (typeof window !== 'undefined' && !path.startsWith('/auth')) {
      tokens.clear();
      window.location.href = '/login';
    }
  }

  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      /* non-json error */
    }
    const err: ApiError = {
      status: res.status,
      message: (payload as { error?: string })?.error ?? res.statusText,
      payload,
    };
    throw err;
  }

  if (raw) return res as unknown as T;
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const get = <T,>(p: string) => api<T>(p);
export const post = <T,>(p: string, body?: unknown) =>
  api<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
export const patch = <T,>(p: string, body: unknown) =>
  api<T>(p, { method: 'PATCH', body: JSON.stringify(body) });
export const del = <T,>(p: string) => api<T>(p, { method: 'DELETE' });

/** Upload with progress via XHR (fetch has no upload progress). */
export function uploadFiles(
  path: string,
  files: File[],
  fields: Record<string, string> = {},
  onProgress?: (pct: number) => void
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/api${path}`);
    const access = tokens.access;
    if (access) xhr.setRequestHeader('Authorization', `Bearer ${access}`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve(null);
        }
      } else {
        reject({ status: xhr.status, message: xhr.responseText } as ApiError);
      }
    };
    xhr.onerror = () => reject({ status: 0, message: 'Network error' } as ApiError);
    xhr.send(form);
  });
}

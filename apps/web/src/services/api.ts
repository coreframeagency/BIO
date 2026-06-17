export const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://markly-live.onrender.com'
    : 'http://localhost:3000');

const API_BASE = `${API_URL.replace(/\/$/, '')}/api`;

let accessToken: string | null = localStorage.getItem('accessToken');

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) localStorage.setItem('accessToken', token);
  else localStorage.removeItem('accessToken');
}

export function getAccessToken() {
  if (!accessToken) {
    accessToken = localStorage.getItem('accessToken');
  }
  return accessToken;
}

async function refreshToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data.accessToken) {
      setAccessToken(json.data.accessToken);
      return json.data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

export interface SubscriptionRequiredFields {
  subjectId?: string;
  subjectName?: string;
  boardSlug?: string;
  categorySlug?: string;
  gradeSlug?: string;
  subjectSlug?: string;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<
  {
    data?: T;
    error?: string;
    ok: boolean;
    status: number;
  } & SubscriptionRequiredFields
> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && !path.includes('/auth/')) {
    const newToken = await refreshToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: 'include',
      });
    } else {
      setAccessToken(null);
      window.location.href = '/login';
      return { ok: false, error: 'Session expired. Please log in again.', status: 401 };
    }
  }

  const json = await res.json().catch(() => ({ success: false, error: 'Invalid response' }));

  if (json.success) {
    return { ok: true, status: res.status, data: json.data as T };
  }

  return {
    ok: false,
    status: res.status,
    error: json.error || 'Request failed',
    subjectId: json.subjectId,
    subjectName: json.subjectName,
    boardSlug: json.boardSlug,
    categorySlug: json.categorySlug,
    gradeSlug: json.gradeSlug,
    subjectSlug: json.subjectSlug,
  };
}

export async function apiUpload<T>(path: string, formData: FormData) {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  });

  const json = await res.json();
  if (json.success) return { ok: true, data: json.data as T };
  return { ok: false, error: json.error };
}

export function streamVisualGeneration(
  lessonId: string,
  onEvent: (event: { status: string; message: string; html?: string }) => void,
  visualScript?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const token = getAccessToken();
    fetch(`${API_BASE}/lessons/${lessonId}/generate-visual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ visualScript }),
    }).then(async (res) => {
      if (!res.ok || !res.body) {
        reject(new Error('Failed to start generation'));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              onEvent(event);
              if (event.status === 'complete' || event.status === 'error') {
                resolve();
                return;
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
      resolve();
    }).catch(reject);
  });
}

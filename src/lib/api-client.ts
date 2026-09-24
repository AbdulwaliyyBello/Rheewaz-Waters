export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

/**
 * Central fetch wrapper. On a 401 (session expired/missing), redirects to
 * login once rather than leaving every page to handle it individually —
 * this is the "session expiration handling" the MVP quality pass calls for.
 * The auth check endpoints themselves (login, /api/auth/me) are excluded so
 * a failed login attempt doesn't trigger a redirect loop.
 */
export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== "undefined" && !path.includes("/api/auth/login") && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
  if (!res.ok) throw new ApiError(data?.error || "Something went wrong.", res.status);
  return data as T;
}

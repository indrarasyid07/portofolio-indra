import { API_INTERNAL_URL } from 'astro:env/server';

export type AdminPageAuth = { username: string; serviceError: boolean };
type RedirectStatus = 300 | 301 | 302 | 303 | 304 | 307 | 308;

export async function requireAdminPage(
  request: Request,
  redirect: (path: string, status?: RedirectStatus) => Response,
): Promise<AdminPageAuth | Response> {
  try {
    const base = API_INTERNAL_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');
    if (!base) return { username: '', serviceError: true };
    const response = await fetch(`${base.replace(/\/$/, '')}/api/v1/auth/session`, {
      headers: { cookie: request.headers.get('cookie') ?? '', accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(4500),
    });
    if (response.status === 401) {
      return redirect(`/admin/login?returnTo=${encodeURIComponent(new URL(request.url).pathname)}&expired=1`, 303);
    }
    if (!response.ok) return { username: '', serviceError: true };
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('admin' in body)) {
      return { username: '', serviceError: true };
    }
    const admin = (body as { admin?: { username?: unknown } }).admin;
    return typeof admin?.username === 'string'
      ? { username: admin.username, serviceError: false }
      : { username: '', serviceError: true };
  } catch {
    return { username: '', serviceError: true };
  }
}

import type { APIRoute } from 'astro';
import { API_INTERNAL_URL, getSecret } from 'astro:env/server';

export const prerender = false;

const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
type Method = (typeof allowedMethods)[number];

async function signClientIp(key: string, timestamp: string, address: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(`client-ip:v1:${timestamp}:${address}`),
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const responseHeaders = (upstream: Headers): Headers => {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  for (const name of ['content-type', 'x-request-id', 'retry-after']) {
    const value = upstream.get(name);
    if (value) headers.set(name, value);
  }
  const cookie = upstream.get('set-cookie');
  if (cookie) headers.append('set-cookie', cookie);
  return headers;
};

async function proxy(request: Request, context: Parameters<APIRoute>[0]): Promise<Response> {
  const path = context.params.path ?? '';
  const isAuthPath = ['auth/login', 'auth/session', 'auth/logout'].includes(path);
  const isAdminPath = /^admin(?:\/[A-Za-z0-9._-]+)*$/.test(path);
  const isMediaCompletionPath = /^admin\/media\/[0-9a-f-]{36}\/complete$/i.test(path);
  const isPublicMediaPath = /^public\/media\/[0-9a-f-]{36}$/i.test(path);
  const method = request.method as Method;
  if ((!isAuthPath && !isAdminPath && !isPublicMediaPath) || !allowedMethods.includes(method)) {
    return Response.json({ error: { code: 'not_found', message: 'Resource tidak ditemukan.' } }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  if (path === 'auth/session' && method !== 'GET') {
    return Response.json({ error: { code: 'method_not_allowed', message: 'Metode tidak didukung.' } }, { status: 405, headers: { 'Cache-Control': 'no-store' } });
  }
  if (isPublicMediaPath && method !== 'GET') {
    return Response.json({ error: { code: 'method_not_allowed', message: 'Metode tidak didukung.' } }, { status: 405, headers: { 'Cache-Control': 'no-store' } });
  }
  if (path !== 'auth/session' && isAuthPath && method !== 'POST') {
    return Response.json({ error: { code: 'method_not_allowed', message: 'Metode tidak didukung.' } }, { status: 405, headers: { 'Cache-Control': 'no-store' } });
  }

  const limit = isAuthPath ? 8192 : 65_536;
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > limit) {
    return Response.json({ error: { code: 'request_too_large', message: 'Permintaan terlalu besar.' } }, { status: 413, headers: { 'Cache-Control': 'no-store' } });
  }

  const configuredBase = API_INTERNAL_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');
  if (!configuredBase) {
    return Response.json({ error: { code: 'service_unavailable', message: 'Layanan autentikasi sementara tidak tersedia.' } }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  const apiBase = configuredBase.replace(/\/$/, '');
  const headers = new Headers({ accept: 'application/json' });
  for (const name of ['cookie', 'origin', 'content-type', 'x-csrf-token', 'user-agent', 'range']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const proxyKey = getSecret('AUTH_PROXY_KEY');
  if (!proxyKey || proxyKey.length < 32) {
    return Response.json({ error: { code: 'service_unavailable', message: 'Layanan autentikasi sementara tidak tersedia.' } }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  const clientIp = context.clientAddress;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await signClientIp(proxyKey, timestamp, clientIp);
  headers.set('x-portfolio-client-ip', clientIp);
  headers.set('x-portfolio-client-time', timestamp);
  headers.set('x-portfolio-client-signature', signature);

  const init: RequestInit = {
    method,
    headers,
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(isMediaCompletionPath ? 45_000 : isPublicMediaPath ? 15_000 : 5000),
  };
  if (!['GET'].includes(method)) {
    const body = await request.arrayBuffer();
    if (body.byteLength > limit) {
      return Response.json({ error: { code: 'request_too_large', message: 'Permintaan terlalu besar.' } }, { status: 413, headers: { 'Cache-Control': 'no-store' } });
    }
    init.body = body;
  }

  try {
    const upstream = await fetch(`${apiBase}/api/v1/${path}`, init);
    const headers = responseHeaders(upstream.headers);
    if (isPublicMediaPath) {
      for (const name of ['cache-control', 'content-length', 'content-type', 'etag', 'last-modified']) {
        const value = upstream.headers.get(name);
        if (value) headers.set(name, value);
      }
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return Response.json({ error: { code: 'service_unavailable', message: 'Layanan autentikasi sementara tidak tersedia.' } }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

export const GET: APIRoute = (context) => proxy(context.request, context);
export const POST: APIRoute = (context) => proxy(context.request, context);
export const PUT: APIRoute = (context) => proxy(context.request, context);
export const PATCH: APIRoute = (context) => proxy(context.request, context);
export const DELETE: APIRoute = (context) => proxy(context.request, context);

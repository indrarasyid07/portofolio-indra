import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL(import.meta.env.SITE_URL || 'http://localhost:4321');
  return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\nSitemap: ${new URL('/sitemap.xml', base).toString()}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store' },
  });
};

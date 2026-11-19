import type { APIRoute } from 'astro';
import { apiGet, apiGetAll, listData, type Contact, type Profile, type Project } from '../lib/api';

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL(import.meta.env.SITE_URL || 'http://localhost:4321');
  const routes = ['/', '/pengalaman', '/riwayat-pekerjaan', '/pendidikan', '/proyek', '/tech-stack'];
  const [profile, contact, projects] = await Promise.all([
    apiGet<Profile>('profile'),
    apiGet<Contact>('contact'),
    apiGetAll<Project>('projects'),
  ]);
  if (profile.data) routes.push('/profil');
  if (contact.data && (contact.data.email || contact.data.github || contact.data.linkedin)) routes.push('/kontak');
  for (const project of listData(projects)) routes.push(`/proyek/${encodeURIComponent(project.slug)}`);
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((route) => `<url><loc>${new URL(route, base).toString()}</loc></url>`).join('')}</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'private, no-store' } });
};

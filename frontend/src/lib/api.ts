export interface ImageData { url: string | null; alt_text: string; caption: string | null }
export interface Profile { name: string; role: string; headline: string; intro: string; about: string; location: string | null; availability: string | null; portrait: ImageData | null; cv_url: string | null; social_links: { github: string | null; linkedin: string | null } }
export interface Project { id: string; slug: string; title: string; subtitle: string | null; project_type: string; year: number; role: string; summary: string; featured: boolean; cover: ImageData | null; stack_labels: string[] }
export interface ProjectDetail extends Project { challenge: string | null; solution: string | null; outcome: string | null; demo_url: string | null; repository_url: string | null; images: ImageData[]; related_experiences: { id: string; role: string; organization: string }[]; published_at: string | null }
export interface Experience { id: string; role: string; organization: string; employment_type: string; location: string | null; start_year: number; start_month: number | null; end_year: number | null; end_month: number | null; summary: string; highlights: string[]; stack_labels: string[]; published_at: string | null }
export interface Education { id: string; kind: 'formal' | 'course' | 'certification'; title: string; institution: string; start_year: number | null; start_month: number | null; end_year: number | null; end_month: number | null; description: string | null; proof_url: string | null; credential_id: string | null; published_at: string | null }
export interface SkillCategory { id: string; slug: string; label: string; skills: { id: string; name: string; note: string | null; image: ImageData | null }[] }
export interface Contact { email: string | null; github: string | null; linkedin: string | null }
type Payload<T> = { data: T; meta?: { next_cursor: string | null; limit: number } };
type Result<T> = { data: T | null; status: 'ok' | 'empty' | 'missing' | 'unavailable'; nextCursor?: string | null };

export async function apiGet<T>(path: string): Promise<Result<T>> {
  try {
    const configuredBase = API_INTERNAL_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');
    if (!configuredBase) return { data: null, status: 'unavailable' };
    const apiBase = configuredBase.replace(/\/$/, '');
    const response = await fetch(`${apiBase}/api/v1/public/${path}`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(4500),
    });
    if (response.status === 404) return { data: null, status: 'missing' };
    if (!response.ok) return { data: null, status: 'unavailable' };
    const payload = (await response.json()) as Payload<T>;
    const data = payload.data;
    return {
      data,
      status: Array.isArray(data) && data.length === 0 ? 'empty' : 'ok',
      nextCursor: payload.meta?.next_cursor ?? null,
    };
  } catch {
    return { data: null, status: 'unavailable' };
  }
}

export async function apiGetAll<T>(endpoint: string): Promise<Result<T[]>> {
  const rows: T[] = [];
  let cursor: string | null = null;
  let status: Result<T[]>['status'] = 'ok';
  do {
    const query = new URLSearchParams({ limit: '100' });
    if (cursor) query.set('cursor', cursor);
    const page = await apiGet<T[]>(`${endpoint}?${query.toString()}`);
    if (page.data === null) return { data: null, status: page.status };
    rows.push(...page.data);
    status = rows.length === 0 && page.status === 'empty' ? 'empty' : 'ok';
    cursor = page.nextCursor ?? null;
  } while (cursor);
  return { data: rows, status };
}

export function listData<T>(result: Result<T[]>): T[] { return result.data ?? []; }
export function errorMessage(status: Result<unknown>['status'], item: string): string {
  if (status === 'unavailable') return `Data ${item} belum dapat dimuat. Silakan coba lagi nanti.`;
  return `Belum ada ${item} yang dipublikasikan.`;
}
export function yearRange(start: number | null, end: number | null): string {
  if (start === null && end === null) return 'Tahun tidak dicantumkan';
  return `${start ?? '—'} — ${end ?? 'sekarang'}`;
}
import { API_INTERNAL_URL } from 'astro:env/server';


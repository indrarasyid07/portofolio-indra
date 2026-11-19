# 11 — Pengujian dan Acceptance

Dokumen ini menjelaskan test plan untuk fase implementasi; tidak ada aplikasi yang dijalankan atau test yang diklaim lolos pada fase dokumentasi.

## Testing matrix

| Area | Level | Contoh coverage | Gate sebelum merge/release |
|---|---|---|---|
| Validation/domain | Unit pytest | slug uniqueness handling, required sections for publish, date order, one cover, featured published only, employment end-date null | deterministic; tidak bergantung cloud |
| API/publication | FastAPI integration | anonymous GET published-only, no draft leak, slug 404, pagination/order, response schema excludes internals | local test Postgres or isolated DB; response contract snapshots/schema |
| CRUD/transaction | API integration | create/update/delete/unpublish, relation reorder, slug conflict, transaction rollback on invalid relation | DB constraints and service semantics agree |
| Auth/session | Security integration | valid/invalid generic login, Argon2 verify, token hash-only, cookie flags, rotate, expiry/revoke/logout, bootstrap idempotence | cookie and DB assertions; secrets redacted |
| Rate limiting | concurrency/security | concurrent attempts cannot bypass limit; account/source buckets; TTL cleanup; DB failure closed | test real transaction implementation, not only mocks |
| CSRF/Origin | API security | absent/foreign/null Origin, missing/wrong token rejected on write, valid token succeeds; GET never mutates | test preview/prod trusted-proxy behavior |
| Upload | API + storage adapter | wrong MIME/signature, oversized bytes/pixels, SVG reject, expiry, duplicate complete, object failure, metadata stripping, orphan cleanup | fake S3 for unit, isolated Neon Object Storage proof before production |
| Database/migrations | migration integration | Alembic blank install, upgrade from prior revision, reverse/safe rollback where supported, constraints/indexes, no autogenerate diff | disposable Postgres in CI; manual revision review |
| Frontend route | component/e2e | each route, unique meta/canonical, 404, published content SSR, admin noindex, same-origin rewrite, menu/filter/gallery | Playwright/browser coverage desktop + mobile |
| Admin UX | E2E/manual | form errors, unsaved changes, session expired, confirm delete, publish feedback, multiple uploads/reorder/cover | keyboard path and server-denial test, not just UI click |
| Accessibility | Automated + manual | axe scan plus keyboard, focus, screen reader status, zoom/reflow, contrast, reduced motion, alt text | WCAG 2.2 AA audit; automated scan alone insufficient |
| Performance/SEO | CI + field | Lighthouse representative, CWV, bundle, API query, cold vs warm DB wake, image LCP, robots/sitemap/OG | budgets in [04](04-frontend-design-and-routing.md) are measured and reported |
| Deployment | preview smoke | Vercel Python runtime, rewrite headers/cookies, preview origin, env isolation, Neon pooled URL, media CORS | no production secrets in preview; rollback rehearsal |

## API acceptance examples

- Anonymous `GET /public/projects` returns only published rows and no draft metadata/count that reveals private entries.
- Anonymous `GET /public/projects/{draft_slug}` returns same 404 shape as random nonexistent slug.
- Unauthenticated `POST/PATCH/DELETE /admin/*` returns 401 even if frontend route manually opened.
- Foreign Origin or absent CSRF header on write returns 403 and does not change DB/object state.
- After publish/unpublish, every public SSR/API response and sitemap obeys the chosen cache-freshness SLA.
- Upload intent is unusable for another key, method, content type or oversized file; `complete` cannot attach foreign asset IDs.

## User-facing acceptance

1. Bahasa Indonesia is the document/UI default; proper names and tool labels may remain original.
2. On home at supported desktop and mobile widths, approved name and real portrait are visible in the initial view, with meaningful alt text and at most three project links/entries.
3. Every public route has an intentional content-specific hierarchy, unique title/description and no empty placeholder records.
4. Pengalaman and Riwayat Pekerjaan show the same source record updates; one admin edit affects both pages without duplicate entry.
5. Admin can create/edit/reorder/draft/publish/unpublish/delete content and preview a project before publication.
6. Course and certification can be distinguished; profile/general stack can differ from project-specific stack.
7. Multi-image upload supports preview, progress/error/retry, alt/caption, cover and order; draft assets do not show publicly.
8. Published project detail has server-rendered content, correct slug/canonical/Open Graph and publicly reachable approved screenshot.
9. Login sessions are server-revocable; cookies are HttpOnly/Secure/SameSite in production; no default credentials or browser storage token.
10. No app-level test or accessibility claim is accepted without executed evidence at implementation time.

## Test data policy

Fixtures reflect fictional/sample status in test-only DB and cannot connect to production. No confidential project screenshots or CV in public CI artifacts. Playwright screenshots use synthetic record data. Migrations and API integration tests must not connect to a production Neon URL; startup should require explicit environment guard and project/database identity check.

## CI quality gates (proposed)

Frontend: typecheck, Astro build, lint and route tests. Backend: Ruff format/check, type checking if chosen, pytest, coverage on auth/publication/media critical modules, Alembic check. End-to-end: production build preview smoke. Avoid making numeric coverage itself a substitute for security tests; set threshold after baseline. Ruff and pytest are required by project request. Security dependency scan and lockfile audit before release.

## Accessibility targets

- WCAG 2.2 AA criteria relevant to content site/admin; automated axe run plus manual keyboard/screen-reader review.
- Normal text 4.5:1, large text 3:1; non-text controls/focus 3:1. Validate exact computed foreground/background pairs, not just palette values.
- Keyboard can reach nav, menu, project filters, gallery selection, form actions and admin table. No keyboard trap; Escape closes menu/dialog; focus restored appropriately.
- Focus indicator visible and not obscured; minimum target size 24×24 under WCAG 2.2 AA (design baseline 44×44 for touch), exception rules applied carefully.
- Reduced motion supported and no content depends on animation. Status/error announcement, labels, descriptions and field associations tested.
- Responsive reflow at 320 CSS px and 200–400% zoom where applicable; image alt communicates function/content.

## Performance/SEO release gate

Measure warm/cold response separately due Neon scale-to-zero; check `/`, one long detail slug, `/admin/login`, and image LCP on mobile simulation. Record JS gzip, HTML size and image transfer; no hidden uncached third-party scripts. Confirm robots allows public pages and disallows admin, sitemap includes only published projects, draft canonical/OG absent, 404 response valid. Re-run performance check after choosing real portrait and screenshot sizes.

# 12 — Roadmap Implementasi

Roadmap ini mengubah rancangan menjadi fase kecil. Penomoran repository berbeda dari prompt implementasi yang masuk; prompt `FASE-07-UPLOAD-MEDIA` dikerjakan sebagai area media (roadmap repository Fase 6). Status implementasi dirinci pada laporan fase.

## Fase 0 — Persetujuan dan kesiapan sumber

**Dependensi:** review rancangan ini.  
**File target:** belum ada file aplikasi; keputusan/dokumen yang perlu ditandai dan diperbarui kelak adalah [13](13-operations-risks-and-open-questions.md), dan setelah approval, ADR di [03](03-system-architecture-and-decisions.md).  
**Output:** pastikan `Indra` adalah root yang benar; konfirmasi apakah repo harus diinisialisasi/dihubungkan ke Git (saat audit tidak ditemukan `.git`); daftar nama, bio, foto, CV, proyek faktual, work/education records; pilih domain dan plan.  
**Checks:** pastikan reference path dan lisensi screenshot/foto; tinjau current Vercel/Neon quota/terms.  
**Acceptance:** tidak ada klaim seed demo yang dianggap fakta; pemilik menyetujui satu project root, deployment plan, region dan data disclosure.  
**DoD:** keputusan pemblokir ditulis; akses akun cloud/Git tidak diminta sebelum diperlukan.

## Fase 1 — Fondasi monorepo dan UI tokens

**Depends on:** Fase 0.  
**File dibuat:** `frontend/package.json`, `frontend/astro.config.mjs`, `frontend/tsconfig.json`, `frontend/src/styles/tokens.css`, `frontend/src/styles/base.css`, `frontend/src/layouts/PublicLayout.astro`, `frontend/src/components/SiteHeader.astro`, `frontend/src/pages/index.astro`; `backend/pyproject.toml`, `backend/app/main.py`, `backend/app/core/config.py`, `backend/app/api/v1/router.py`; root `.gitignore`, `.env.example`, `README.md`.  
**Output:** project dapat di-run/build lokal; framework shells, global tokens, theme/reduced-motion; health route.  
**Tests:** Astro build/type checks; FastAPI health test; Ruff.  
**Acceptance:** no unexpected React/Tailwind/component dependency; public page works without JS except intended menu; tokens map current prototype palette and focusable links.  
**DoD:** lockfiles committed, CI or repeatable commands documented, secrets absent, no production data.

## Fase 2 — DB schema dan service baseline

**Depends on:** Fase 1, Fase 0 database approval.  
**File dibuat:** `backend/app/db/{base,engine,session}.py`, `backend/app/models/{profile,project,experience,education,skill,media,admin}.py`, `backend/migrations/env.py`, `backend/migrations/versions/0001_initial.py`, `backend/app/schemas/*`, `backend/app/services/*`.  
**Output:** relational model + first migration; development fixtures separate.  
**Tests:** migration from empty Postgres, constraints/relationships, schema lint, no production fixtures.  
**Acceptance:** ERD/data contract and DB constraints agree; one source experiences; ordered media/one cover; drafts invisible by queries.  
**DoD:** reviewed migration and downgrade/safe rollback notes; pooled/direct URL separation works.

## Fase 3 — Public read API and Astro routes

**Depends on:** Fase 2.  
**File dibuat:** `backend/app/api/v1/public.py`, public query/service modules; `frontend/src/lib/api/server.ts`, route pages `/profil`, `/pengalaman`, `/riwayat-pekerjaan`, `/pendidikan`, `/proyek`, `/proyek/[slug]`, `/tech-stack`, `/kontak`; page components and SEO helpers.  
**Output:** SSR public site with real shell and structure adapted from reference.  
**Tests:** published-only API, slug 404, rendering/metadata, all routes, mobile/keyboard/accessibility checks.  
**Acceptance:** name/photo once available, home concise; no placeholders/data leaks; detail route crawlable without client JS.  
**DoD:** SEO and noindex policies verified; tests run with synthetic records.

## Fase 4 — Authentication and admin shell

**Depends on:** Fase 2 schema, platform spike confirms Python runtime.  
**File dibuat:** `backend/app/security/{passwords,sessions,csrf,rate_limit}.py`, `backend/app/api/v1/auth.py`, admin dependency, bootstrap command; frontend `/admin/login`, `/admin`, admin layout and typed API client.  
**Output:** single bootstrap admin, secure session, public-to-admin shell, logout.  
**Tests:** all security tests in [11](11-testing-and-acceptance.md), cookie/rewrites/expiry, concurrency rate limiter.  
**Acceptance:** custom browser requests cannot bypass backend controls; `HttpOnly/Secure/SameSite`; no register/demo secret.  
**DoD:** threat model cases exercised; session and rate buckets persist across function instances.

## Fase 5 — CRUD/publish workflow

**Depends on:** Fase 3/4.  
**File dibuat:** `backend/app/api/v1/admin/{profile,projects,experiences,education,skills}.py`; admin tables and editors/routes; service validators and shared feedback components.  
**Output:** CRUD, order/status, draft preview, publish/unpublish, status indicators and unsaved-change handling.  
**Tests:** API and admin E2E, permission matrix, two views same experience data, delete confirmation, session expired.  
**Acceptance:** admin can manage all required types; public API returns only published; no duplicate experience dataset.  
**DoD:** every mutation uses audited domain rule and transaction; error response preserved in form.

## Fase 6 — Media upload (prompt implementasi FASE-07)

**Depends on:** Fase 5; spike Neon Object Storage region, signed PUT, draft/private policy and CORS.  
**File dibuat:** `backend/app/integrations/storage.py`, `backend/app/services/media.py`, media routes; frontend gallery uploader/reorder/preview; storage cleanup command.  
**Output:** multi-file upload, verified/sanitized media, cover/order/alt/caption, visible retry/error. Kode dan tes lokal selesai; bukti upload Neon nonproduction masih diblokir.  
**Tests:** intent tampering, type/signature/pixel/size, expiry, upload failure/retry, orphan reconciliation, published/draft URL permissions.  
**Acceptance:** no base64/temporary filesystem assumption; draft media not fetchable anonymously.  
**DoD:** controlled staging bucket proof documented; publish/unpublish semantics match contract.

## Fase 7 — Deployment and preview proof

**Depends on:** Fase 1–6; Git remote/domain/account.  
**File dibuat:** `vercel.json` rewrite/config or dashboard config notes; `backend/vercel.json` or runtime configuration as supported; deployment runbook; possibly GitHub workflows when provider approved.  
**Output:** frontend/backend previews, Neon staging DB, env mapping, roll-forward/back plan.  
**Tests:** build/deploy smoke, cookie + same-origin rewrite, preview auth, pooled DB, function duration/bundle, cold start, storage signing and image load.  
**Acceptance:** no production secret leaks to client or preview; origin checks match exact host; rollback code and DB reviewed.  
**DoD:** service topology and actual plan limits confirmed, usage baseline documented.

## Fase 8 — Content entry, release and operations

**Depends on:** Fase 7; approved factual content.  
**File dibuat/diubah:** content records and approved media via admin; `scripts/backup_db.py`/storage inventory if required; operational documents.  
**Output:** approved published pages and production release.  
**Tests:** full checklist in [11](11-testing-and-acceptance.md), manual proofing, backups/restore, SEO metadata and links.  
**Acceptance:** all user-facing statements and screenshots approved; contact flows work; no demo placeholder or admin indexing.  
**DoD:** owner signs content checklist, rollback path known, alerts/usage review cadence set.

## Exit conditions

Each phase is completed only when dependencies, generated code/docs, and evidence of listed checks are reviewed. A provider limitation or product decision creates an explicit revision to architecture and affected docs before code adapts. No feature scope expansion silently enters a phase; proposed additions update scope and estimates first.

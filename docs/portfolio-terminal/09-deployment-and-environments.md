# 09 — Deployment dan Environment

**Target:** Vercel + Neon; keputusan final bersyarat pada account availability, current terms and implementation spike.

## Verified platform facts (19 Nov 2026)

1. Vercel **Services** docs say Private Beta for all plans with access granted by request. It supports polyglot frontend/backend under route prefixes and one domain when enabled via `experimentalServices`. Reference: [Vercel Services](https://vercel.com/docs/services).
2. Vercel's current **Python runtime** documentation labels the runtime **Beta** and supports ASGI/WSGI applications including FastAPI. Available Python versions are 3.12 default, 3.13 and 3.14; standard Python function bundle cap is 500 MB uncompressed. Python dependencies are not automatically tree-shaken, so curate packages and exclude tests/static files. This repository sets the ASGI entrypoint through `[tool.vercel] entrypoint = "app.main:app"` in `backend/pyproject.toml`; verify this exact project layout in preview. Reference: [Python Runtime](https://vercel.com/docs/functions/runtimes/python).
3. Astro deploys static output on Vercel without adapter; server-side rendering requires `@astrojs/vercel` adapter. The adapter supports request-time output, cache headers and optional ISR. Reference: [Astro on Vercel](https://vercel.com/docs/frameworks/frontend/astro), [Astro on-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/).
4. Vercel Hobby is intended for personal/non-commercial use. The current docs list 1M function invocations, 100 GB-hours function duration, 4 active CPU hours and 360 GB-hours provisioned memory; Hobby function max duration is 300s on Fluid compute, max memory 2 GB, Python bundle cap 500 MB uncompressed, and request/response body limit is 4.5 MB. Hobby usage pauses when included caps are exceeded rather than offering overage purchase. It has 1 concurrent build in general limit docs and 100 deployments/day. Reference: [Hobby plan](https://vercel.com/docs/plans/hobby), [account plans](https://vercel.com/docs/plans), [limits](https://vercel.com/docs/limits), [function limitations](https://vercel.com/docs/functions/limitations).
5. Vercel monorepo supports multiple projects from one repo using separate root directories; external rewrite can route `/api/*` without changing URL in browser. Reference: [Monorepos](https://vercel.com/docs/monorepos), [Monorepos FAQ](https://vercel.com/docs/monorepos/monorepo-faq), [Rewrites](https://vercel.com/docs/routing/rewrites).
6. The Neon endpoint supplied for database `indra` is in `us-east-2` (Ohio), and the supplied object-storage endpoint is in the same region. This observed account configuration supersedes the earlier Singapore candidate in ADR-004; it does not confirm which Neon branch is connected, whether a safe preview branch exists, or whether the bucket is private. Neon regions are fixed per project. Do not repoint preview to production data or create cross-region resources without owner review. Reference: [Neon regions](https://neon.com/docs/introduction/regions), [Object Storage overview](https://neon.com/docs/storage/overview).
7. Neon Free current docs list $0, 100 CU-hours/project/month, 1 GB Postgres storage/project (20 GB total account), 5 GB public transfer/project, 5-minute scale-to-zero, and 5 GB Object Storage/project. Reference: [Neon plans](https://neon.com/docs/introduction/plans). Quotas and prices can change; re-check at setup and track usage.
8. Neon pooling uses PgBouncer transaction mode; pooled client connections are not the same as simultaneously active DB transactions. Use a pooled URL for serverless application traffic, direct connection for admin/migrations requiring session features. Reference: [Neon connection pooling](https://neon.com/docs/connect/connection-pooling).

“Free” is not a zero-risk guarantee: image egress, function invocations, DB compute wakeups, monitoring, domain, non-personal use terms and account settings affect cost/availability. The website is a personal portfolio, but commercial classification and acceptable Vercel plan should be confirmed by the owner against current terms; no legal determination is made here.

## Deployment recommendation

**Baseline: two Vercel projects from a single Git repository**, assuming actual repository is connected to a Git provider after project setup. Frontend root `frontend/`; backend root `backend/`. Assign public domain to frontend. The browser uses the Astro same-origin BFF at `/api/v1/*`; do not add a second rewrite until routing/cookie behavior has been checked against the existing BFF. Astro SSR also calls the backend server-to-server using `API_INTERNAL_URL`. Verify headers, cookies, request body, status and `Set-Cookie` in each environment.

Astro SSR must run on server adapter and fetch public API server-to-server from a trusted environment variable (`API_INTERNAL_BASE_URL`). Browser admin client uses same-origin `/api/v1`. Do not expose private backend origin, credentials, database URL or object-storage secrets in `PUBLIC_*` variables. Use HTTPS and custom-domain origin allowlist.

**Vercel Services fallback/optimization:** if Vercel grants access, deploy Astro and Python as services in one project under `/` and `/api` or documented route prefixes. Build a spike before switching. Private beta flag, routing prefix, preview behavior and Python deployment constraints must all be checked. If unavailable, do not block the two-project plan.

## Environment matrix

| Environment | Frontend origin | API | DB | Storage | Data policy |
|---|---|---|---|---|---|
| Local dev | `http://localhost:4321` | `http://127.0.0.1:8000` or Astro proxy | local Postgres preferred, or dedicated Neon dev branch | dedicated dev bucket/prefix | Seed demo only; never production data. Dev cookie may omit Secure only for loopback. |
| Preview | Vercel preview URL; each pull request may have unique origin | dedicated preview backend deployment or mapped preview project | Neon branch for preview if billing/account supports and safe; otherwise shared isolated staging DB | preview branch/prefix; no production media credentials | Sanitized synthetic data only; no real admin password shared with prod. |
| Production | custom HTTPS domain | production backend deployment through same-origin rewrite | production Neon project/branch in Singapore | production bucket; access keys restricted | Approved factual content only; no sample fixtures. |

Do not use one database URL across dev and production. Preview DB branch data can be cloned from parent; ensure there is no sensitive personal dataset before branching. Vercel preview security/protection feature availability differs by plan—do not rely on dashboard gates as API authorization.

## Environment variables (proposal)

| Variable | Secret? | Needed by | Notes |
|---|---:|---|---|
| `DATABASE_URL` | Yes | Backend | Pooled Neon URL (`-pooler`), SSL required. |
| `DATABASE_DIRECT_URL` | Yes | Migration job only | Direct Neon URL for Alembic release action; keep off web frontend. |
| `APP_ENV` | No | Backend | `development|preview|production`; explicit. |
| `PUBLIC_SITE_ORIGIN` | No | Backend | Exact allowed site origin per environment for Origin/CSRF checks. |
| `SESSION_HASH_KEY` | Yes | Backend | High entropy, rotates only with global session invalidation; key version plan. |
| `LOGIN_RATE_KEY` | Yes | Backend | HMAC pseudonymization key for attempt buckets; do not log raw identifier. |
| `AWS_ENDPOINT_URL_S3` | No/low sensitivity | Backend | Neon branch S3 endpoint; never sent to browser except the expiring upload URL. |
| `AWS_REGION` | No | Backend | Neon region value, e.g. `us-east-2`. |
| `AWS_S3_BUCKET` | No | Backend | Private media bucket selected for this app. |
| `AWS_S3_PRIVATE_BUCKET_CONFIRMED` | No | Backend | Must remain `false` until an operator verifies `private` access in Neon Console/API. Upload intents fail closed while false. |
| `AWS_ACCESS_KEY_ID` | Sensitive | Backend | Neon scoped storage credential; rotate after exposure. |
| `AWS_SECRET_ACCESS_KEY` | Yes | Backend | Never `PUBLIC_`, never forwarded to browser. |
| `API_INTERNAL_URL` | No/low sensitivity | Frontend server | Backend base URL for Astro SSR and same-origin BFF. |
| `CSRF_TOKEN_KEY` | Yes | Backend | Optional separate HMAC key if CSRF token bound statelessly. |

`.env.example` contains placeholder names and descriptions only. Never check in `.env`, production URLs with credentials, bearer tokens, or demo credentials. Vercel project secrets are independently configured per environment and scoped to backend unless needed elsewhere.

## Python runtime and cold start implications

Current docs list supported Python runtime versions and FastAPI/ASGI; this environment still must be proven in the actual project because deployment entrypoint, package build, DB driver and lifespan behavior have not been exercised. Lock Python at 3.12 as conservative current Vercel default (not “latest”) and pin dependency ranges/lock with reproducible install. Keep dependencies small, avoid local persistent files, use pooled Postgres and bounded connection pool size (1–2 per instance as initial serverless guidance). No long-running queue or daemon. Function request/response body limit 4.5 MB is one reason uploads use presigned direct-to-object-storage URLs instead of forwarding image bytes through FastAPI. Hobby Functions currently cap at 2 GB memory, 300 seconds duration, and 500 MB Python bundle; interactive CRUD should finish far below those hard ceilings. Confirm Argon2 memory/time under actual instance memory and concurrent requests.

Vercel/Astro Functions may scale to zero when idle. A user's first request after inactivity and the first Neon query after Neon scale-to-zero can both add latency. There is no useful universal cold-start number to promise in docs: measure p50/p75 and cold/warm separately after deployment, including a waking Neon compute. Keep API initialization light and choose whether the cost of always-on/non-Free compute is justified by observed latency. Image bytes go directly from browser to a five-minute presigned Neon URL and do not pass through the Vercel 4.5 MB request body limit; the exact frontend origin must be configured in bucket CORS.

## DB pooling and migration

- Runtime uses Neon pooled hostname. SQLAlchemy async engine max pool small; serverless instances multiply per-process pool, so use `pool_size=1`, `max_overflow=0` or another measured small cap, `pool_pre_ping` only if useful, finite timeout. Exact supported async driver URL (`postgresql+asyncpg`) and PgBouncer transaction compatibility must be checked.
- Avoid session-level `SET`, temp tables, LISTEN/NOTIFY or long transactions through transaction pooler. Keep requests in short transaction scope and one `AsyncSession` per request/task.
- Alembic migrations use direct connection URL via one controlled deploy/release step, not per serverless request. A failed migration blocks promotion and deployment gets rolled back without code expecting the new schema.
- SQLAlchemy docs require separate `AsyncSession` per concurrent task; Neon docs distinguish pooled connections from active transactions. See [SQLAlchemy AsyncIO](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html).

## Deploy/rollback sequence

1. Run Ruff, type/static checks, pytest, build and security checks in CI.
2. Review pending Alembic migration; take pre-release DB snapshot/export; apply backward-compatible migration with release credentials.
3. Deploy backend preview; run health and API smoke checks against non-prod DB/storage.
4. Deploy frontend preview; verify API rewrite, cookies, CORS (ideally no cross-origin), SSR project detail, noindex admin and image rendering.
5. Promote backend then frontend only when schema compatibility is safe; if using expand/contract, leave compatibility layer until front/back deploy completes.
6. Post-deploy read-only smoke checks and usage/exception review. Revert code immediately on failed smoke. Roll back DB only with tested restore/migration path; don't assume Vercel rollback also reverts data.

## Deployment and cost risks

- Vercel Python runtime is documented as supported, but Vercel may change runtime constraints; validate FastAPI entrypoint, Python version, package bundle and observed reliability in the actual project. Keep an alternative Python host as a fallback if required.
- Hobby excess quotas can pause deployment; Hobby is for personal/non-commercial use. Function SSR for every request plus image transfer may exceed quotas as traffic grows.
- Neon scale-to-zero saves idle compute but first DB request can wait for wake. Free retention/restore window and plan support are limited; maintain a separate logical backup process once data is valuable.
- Services is Private Beta; baseline does not require it.
- Neon S3 API subset and region/product rollout may make a presign approach unavailable. Do not put a provider-specific implementation in public frontend.
- Two projects give separate preview domains; rewrite origin mapping can break cookie/CORS security if wildcard configured. Use explicit environments and test preview suppression.

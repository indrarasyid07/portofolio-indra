# 07 — Autentikasi, Keamanan, dan Threat Model

## Prinsip

MVP hanya memiliki satu administrator. Tidak ada public registration, JWT di `localStorage`, password default, atau keamanan yang hanya berupa JavaScript route guard. FastAPI menjadi sumber keputusan untuk setiap konten privat, CRUD dan media operation.

## Login flow

```mermaid
sequenceDiagram
  actor A as Admin browser
  participant F as Astro/frontend origin
  participant API as FastAPI
  participant DB as Neon PostgreSQL
  A->>F: POST /api/v1/auth/login + Origin
  F->>API: Same-origin BFF; preserve Origin/cookie and sign client IP
  API->>API: Validate Origin, rate limit, validate payload
  API->>DB: Read admin hash; atomically record/check attempt
  API->>API: Verify Argon2id; generate CSPRNG token + CSRF token
  API->>DB: Store keyed token hash, CSRF hash, expiry
  API-->>A: Set-Cookie __Host-portfolio_session; JSON csrf_token
  A->>F: POST /api/v1/admin/projects + cookie + CSRF + Origin
  F->>API: Same-origin BFF
  API->>DB: Resolve token hash, check expiry/revocation/user active
  API->>API: Verify CSRF token and exact Origin
  API->>DB: Apply authorized transaction
  API-->>A: 200/201 result
  A->>F: POST /api/v1/auth/logout + CSRF
  F->>API: Same-origin BFF
  API->>DB: Set revoked_at
  API-->>A: 204 + expired cookie
```

## Session design

1. Generate at least 256 random bits using OS CSPRNG. Encode base64url tanpa padding; no identity/role in token.
2. Persist only `HMAC-SHA-256(SESSION_HASH_KEY, raw_token)` in `admin_sessions`, together with admin FK, timestamps, expiry, revoked flag, and optional minimal metadata. The raw token exists only in browser cookie and request memory. Password hashes use Argon2id, not this fast hash. Version the HMAC key/hash format for planned rotation; rotating it revokes all sessions unless a staged multi-key verifier is implemented.
3. Cookie uses production name `__Host-portfolio_session`; `Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age` and no `Domain`. Local development/test use `portfolio_session` with `Secure=false` for localhost.
4. Rotate token after successful login; reject unknown, expired, revoked, or disabled-user sessions. Implemented idle TTL is 30 minutes and absolute TTL is 12 hours. Logout revokes the row then clears the cookie. Bootstrap password rotation revokes active sessions.
5. CSRF token is derived with HMAC bound to the session token, and only its hash is stored. Login/session response returns it; state-changing requests submit `X-CSRF-Token`. It is not stored in browser storage or placed in URLs.
6. No session ID in URL or browser storage. Do not share raw token in analytics/error logs.

Token lookup compares the keyed digest in constant-time after a database lookup where applicable. Do not persist raw cookie token. If key rotation must avoid global logout later, add a version column and verify old/new key IDs during a bounded migration.

## Password and bootstrap

- Password hashing uses `argon2-cffi` Argon2id at `m=19 MiB,t=2,p=1`; hashes are rechecked and upgraded on successful login when parameters change. Vercel memory/concurrency benchmarking remains part of deployment verification.
- Password input accepts 8–128 characters; longer unique passwords are recommended for the administrator account. No silent trimming changes a credential. Verify credentials with a generic response regardless of invalid username/password. Avoid username enumeration.
- First account is created with `uv run python -m app.scripts.bootstrap_admin`; password is read with a hidden interactive prompt, never from an argument or hardcoded value. The script fails closed if an account exists unless `--rotate-password` is explicitly used. No demo secret is committed.
- Password-change path is not a public admin page in MVP. Operators rotate via documented secure process, revoke sessions, and confirm new login.

## Rate limiting and serverless consistency

Vercel instances may be short-lived and concurrent; a Python in-memory dict is not a valid rate limiter. No Redis in MVP. The implementation stores HMAC pseudonyms for normalized username and trusted client IP in `login_attempts`; the Astro BFF signs the client IP and the backend falls back to its direct peer if the signature is invalid. PostgreSQL advisory transaction locks serialize per-account and per-source checks. The limits are 5 failed attempts per account and 20 per source in 15 minutes; failures return generic `429` with bounded `Retry-After`. Successful login clears the account failure bucket. Rows older than 7 days are pruned and an index supports retention cleanup. SQLite tests cover policy branches but do not verify PostgreSQL concurrency behavior. Request body size is capped.

These limits are a pragmatic baseline, not a high-volume anti-DDoS service. Vercel edge/WAF capability/plan availability should be checked for account before deciding to depend on it. A failed DB does not silently bypass throttling; fail closed for login writes with generic temporary failure.

## CSRF, Origin, and browser protections

- For every state-changing browser request, require non-safe method (`POST/PATCH/PUT/DELETE`), CSRF token, JSON content type, and exact `Origin` match against configured `PUBLIC_SITE_ORIGIN`. Missing/`null` origin is rejected. Astro's same-origin BFF forwards only auth and admin paths, caps request bodies, and uses a shared `AUTH_PROXY_KEY` to sign the source IP.
- `SameSite=Strict` is defense in depth, not the only control. Do not allow wildcard CORS; ideal browser API is same-origin. Cross-origin API preview must use separate exact allowed origin plus correct credentials policy and be tested.
- Protect Astro admin reads server-side too; private no-store and noindex. Avoid caching responses with auth cookies.
- Add Content-Security-Policy with nonce or hashes compatible with Astro; initially deny inline script where feasible, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`; test integrations first. Add HSTS only after custom domain HTTPS is confirmed, and standard `X-Content-Type-Options`, `Referrer-Policy`, and restrictive permissions policy.

## Threat model

| Threat | Surface | Mitigation | Residual/verification |
|---|---|---|---|
| Credential stuffing/brute force | Login | Argon2id, generic errors, DB-backed rate limit, optional provider WAF, strong unique password, operator MFA at Vercel/Neon accounts | No MFA for app in MVP; consider passkey/MFA only if operational risk requires |
| Session theft/replay | Cookie, logs, XSS | Secure/HttpOnly/SameSite, host prefix, TLS, rotate, hash at rest, expiry/revoke, CSP/XSS prevention | XSS can still act as user while page compromised; sanitize and avoid unsafe HTML |
| CSRF | Browser automatically sends cookie | CSRF token + exact Origin + SameSite + JSON-only writes | Local route tests pass; Vercel preview BFF/cookie verification awaits configured preview domains |
| Unauthorized draft exposure | Public routes, sitemap, caches | Backend query filters published; same 404 for missing/draft; admin private cache; cache key avoids cookies/status | Test direct API, cached, preview and search indexing |
| SQL injection | Search and CRUD | SQLAlchemy bound queries, Pydantic field whitelist, no raw SQL string interpolation | Static analysis/manual review in API phase |
| XSS via rich fields/URLs/filenames | Project copy, alt/caption, social URLs | Plain text fields, escape HTML; allowlisted `https` links; no arbitrary SVG/HTML/Markdown rendering; CSP | Do not use unsafe HTML injection in Astro |
| Malicious or oversized file | Upload endpoint/object store | Auth + intent quota + presigned scope + magic bytes/decode/re-encode + pixel caps + file count/size limits | Signed URL and Neon S3 policy must be tested; object may arrive but metadata remains pending |
| Storage key guessing or draft leak | Public URLs and bucket policy | UUID random keys, private/staging objects, publish gate, public-read only after release or guarded media endpoint | Exact Neon bucket semantics and publish mechanism need spike |
| Account/secret compromise | env/config/deploy | Vercel/Neon MFA, least privilege credentials, no secrets in repo/preview logs, rotate DB + storage keys, restrict project access | Review actual team permissions at setup |
| Data loss/accidental delete | DB/media | confirmation, unpublish before hard delete, database snapshots/backup plan, object orphan reconciliation | Free plan restore window is not a complete long-term backup |
| Availability/cold start/quota | Functions/DB | bounded queries, pagination, short API, warm/wake measurements, limit upload, usage monitoring | Hobby quota exhaustion can pause service; plan must be rechecked |

## Privacy and audit events

Avoid storing visitor IPs, form contents or analytics by default. Login attempts contain HMAC-derived account/source identifiers, not raw IP or username; retention cleanup removes attempts older than seven days. Never store raw request bodies, passwords, session or CSRF tokens.

## Logout/session expiry UX

Backend replies `401` when expired/revoked. Admin page captures the current safe path, shows “Sesi berakhir; perubahan di formulir belum terkirim”, keeps unsaved text in current runtime memory (optionally sessionStorage only for non-secret form draft after security review), and returns to login. Do not replay mutation automatically: user must review and submit again. On logout, clear memory and revoke server row.

Security references: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

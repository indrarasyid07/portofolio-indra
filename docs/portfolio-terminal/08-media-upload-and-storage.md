# 08 — Media Upload dan Penyimpanan

## Proposal layanan

Neon Object Storage menyediakan S3-compatible API dan mendukung boto3 serta presigned GET/PUT/POST, operasi CORS, serta private/public-read access level. Verifikasi dokumentasi 19 Nov 2026 menunjukkan region `us-east-2` tersedia, namun ini tidak membuktikan bucket/account proyek Indra tersedia atau aman untuk diuji. Neon menyatakan bucket diwariskan branch dan perubahan di child branch tidak mengubah parent. Lihat [overview](https://neon.com/docs/storage/overview), [S3 compatibility](https://neon.com/docs/storage/s3-compatibility), [buckets](https://neon.com/docs/storage/buckets), dan [objects/presigned URLs](https://neon.com/docs/storage/objects).

Bucket access level immutable after creation. Implementasi menargetkan bucket privat yang dikonfigurasi via env, sehingga draft tidak bergantung pada kerahasiaan URL. Upload intent gagal tertutup selama `AWS_S3_PRIVATE_BUCKET_CONFIRMED=false`; operator baru boleh mengubahnya setelah memeriksa access level di Neon Console/API. Public reads melalui route aplikasi yang mengecek status publish. Browser upload memakai presigned POST policy 5 menit dengan batas ukuran; origin frontend harus diizinkan pada bucket CORS. Integrasi terhadap akun dan branch milik Indra tetap `BLOCKED` sampai branch/access level/CORS nonproduksi diverifikasi. Tetap gunakan adapter storage terpisah dari skema domain.

## Media model

`media_assets` holds storage provider, bucket, opaque object key, detected MIME, byte size, decoded width/height, SHA-256, state, alt text/caption, owner, and timestamps. Project image order/cover sits in `project_images`. The DB stores keys and metadata, never base64 bytes or a durable CDN URL. Public URL is derived by a media service from asset state and project publication state; don't accept public URL as authorization.

## Upload sequence

```mermaid
sequenceDiagram
  actor A as Admin browser
  participant API as FastAPI
  participant DB as Neon PostgreSQL
  participant S3 as Neon Object Storage
  A->>API: POST /admin/media/intents (metadata, size, type)
  API->>API: Check session, CSRF, quota, project permission
  API->>DB: Insert pending media asset with random immutable key
  API->>S3: Sign short-lived POST policy for key/type/size
  API-->>A: upload_url + expiry + policy fields
  A->>S3: POST file bytes with signed policy fields
  S3-->>A: 200/204
  A->>API: POST /admin/media/{id}/complete (project id, alt, caption)
  API->>DB: Lock/check pending state and owner
  API->>S3: HEAD + bounded GET; verify signature, size and bytes
  API->>API: Decode image, enforce pixel dimensions; strip EXIF and re-encode
  API->>S3: Write sanitized output under new opaque key; delete staging object
  API->>DB: Mark ready, attach ordered association, set cover if requested
  API-->>A: ready asset + authenticated preview URL
```

## Proposed upload limits

Initial values for implementation spike, subject to admin UX and Neon API validation:

- JPEG, PNG, WebP only; reject SVG, GIF, animated formats, PDF, executable and unknown types. Avatar also uses raster formats.
- Up to 6 project images and 32 MiB total per upload batch, 12 images per project. One profile portrait.
- Max 8 MiB per source image; max decoded dimensions 8000×8000 and 40 megapixels. Storage policy enforces upload body limits and backend rechecks file size and decoded dimensions.
- Presigned POST intent expires in 5 minutes, exact random object key, expected content type and byte range. Never let browser choose bucket or final public path.
- Server verifies actual file by file signature and trusted decoder; MIME header supplied by client is only a hint. Re-encode sanitized outputs (WebP/AVIF or optimized JPEG after browser-support decision), strip EXIF/GPS, set stable content-type and cache headers. Persist content hash and output dimensions.
- Human alt text required before publishing; filename is not a substitute. Caption optional. Empty decorative media allowed only if marked decorative and aria-hidden at render.

These are not Neon platform limits; adjust the app limits based on actual portrait/gallery needs and Vercel runtime memory/timeout.

## Public, draft, and private media

Draft project screenshots are stored in a private bucket and are not fetchable through the public media route. `GET /api/v1/public/media/{asset_id}` checks that at least one linked project is published or that the image is the published profile portrait, then reads the opaque object key on the server. Admin preview requires an active session. A short-lived presigned form contains the random staging key required by S3, but no durable storage URL or canonical key is sent in the asset DTO. Publish is blocked while any attached screenshot or profile photo has empty alt text. Public assets use immutable object keys; replacement writes a new key. The public route uses a five-minute browser cache; bytes already cached can remain in a visitor's browser after unpublish.

Because project screenshots are intended as public content, do not promise confidentiality after the project is published. Never upload personal documents containing secrets or unrelated user data.

## Ordering and cover behavior

One transaction accepts a full ordered list of the asset IDs associated with that project; must contain each currently linked ready image exactly once and no foreign IDs. Cover is a single boolean/explicit cover ID. If cover is deleted, set the first remaining item as cover or leave project without cover according to admin-confirmed rule; API/UI must match. Reorder control has keyboard buttons in addition to pointer drag. Gallery renders responsive first image eagerly/priority only if above the fold; other thumbs lazy-load.

## Failure recovery

| Failure point | Recovery |
|---|---|
| Intent rejected | No file sent; show field-level type/size error. |
| Browser upload network failure | Keep the selected file in page memory; retry or cancel; each retry obtains a fresh intent. |
| Object uploaded, completion fails | Keep DB row `pending`; allow retry validation; do not expose publicly. Cleanup scans pending older than TTL. |
| Image decoder rejects / mismatch | Mark rejected, delete/quarantine object; explain file requirement without server internals. |
| Storage 503 SlowDown | SDK bounded retry for reads/writes; a new presigned POST is issued on explicit retry. |
| DB commit fails after object write | Object remains orphan; reconciliation job compares pending/ready rows against keys and deletes unreferenced after grace period. |
| Delete call fails | Mark `deleting`, retry idempotently; keep reference state consistent and don't claim deleted before DB/UI state is settled. |

## Orphan cleanup and caching

An operator cleanup command is implemented at `backend/app/scripts/cleanup_media.py`. Run it from `backend/` with `uv run python -m app.scripts.cleanup_media` for a report; add `--apply` only on a verified nonproduction branch to delete expired pending/rejected, already-deleting, and 24-hour-old unreferenced ready media. It refuses rows outside the configured Neon bucket and `portfolio-media/` prefix. This command does not list arbitrary bucket objects, so use Neon storage inventory to identify untracked staging objects. Media responses include detected content type, immutable object cache metadata, `X-Content-Type-Options: nosniff`, and private admin preview no-store headers.

## Implemented endpoint summary

- `POST /api/v1/admin/media/intents`: admin + Origin/CSRF required, accepts up to 8 MiB and an allowlisted MIME, creates a pending DB row and a 5-minute presigned POST policy for a server-owned opaque key. The policy enforces the byte range at storage.
- `POST /api/v1/admin/media/{id}/complete`: verifies uploader/state, reads only a bounded object, decodes with Pillow, checks detected format/dimensions/pixel cap, strips metadata by re-encoding, writes an immutable object, then marks ready and attaches to project/profile.
- `GET /api/v1/admin/projects/{id}/images`, `PUT .../images/order`, `PATCH /api/v1/admin/media/{id}`, and `DELETE /api/v1/admin/projects/{id}/images/{asset_id}` provide admin preview, ordering, cover, alt/caption, and removal.
- `GET /api/v1/admin/media/{id}/preview` is session-protected. `GET /api/v1/public/media/{id}` returns bytes only while attached to published content.
- Allowed formats: JPEG, PNG, WebP; no SVG, GIF, animation, or PDF. 8 MiB source, 8000 px per dimension, 40 MP decoded, 5 MiB normalized output. Up to 12 images per project and 6 per batch.
- The browser uses direct presigned POST, so the Vercel 4.5 MB function body cap does not carry image bytes through Astro or FastAPI. Bucket CORS must allow the exact site origin and POST; do not use wildcard origin.

Read-only check on 19 Nov 2026: `HeadBucket` succeeded for configured bucket `indra` and reported `us-east-2`. One CORS rule exists, allows POST and uses a wildcard origin; the configured app origin does not match as an exact entry. Neon access level cannot be inferred safely from this S3 probe, and it is not yet known whether the credentials point at a nonproduction branch. No object was uploaded, deleted, or modified. Therefore the DoD for live storage proof remains **BLOCKED**.

Before enabling: create/identify a disposable Neon branch or project; confirm in Console/API that the target bucket is `private`; set `AWS_S3_PRIVATE_BUCKET_CONFIRMED=true` only for that verified private bucket; use a credential scoped to that branch with `storage:read` and `storage:write`; replace wildcard CORS in that nonproduction bucket with the exact preview/local origin and POST method; run the presigned POST/completion flow with a disposable image; verify private preview, public 404 while draft, public image after publish, and 404 after unpublish; delete the object and run cleanup in dry-run before `--apply`. Do not change production CORS or upload test files to the current `indra` bucket while branch purpose is unknown.

Usage planning estimate: assume 1.5–3 MiB per normalized screenshot after re-encode. At 12 images, budget about 18–36 MiB per project; a nominal 5 GB storage allowance is roughly 140–280 fully populated projects before headroom, staging failures, and any retained old objects. This is a planning estimate, not measured account usage. Check actual stored bytes in Neon and application `media_assets.byte_size` regularly.

## Security checklist

- Admin session/CSRF/Origin validated at intent, completion, reorder, delete.
- Per-admin rate limit (30 intents/hour, 96 MiB/day) and project image quota; no unauthenticated upload route.
- Check file count and bytes at both intent and object completion.
- Validate MIME + signature + decode; dimensions and pixel count; sanitize metadata.
- Do not trust extension, client filename, content length alone, or image URL.
- Log asset id/request id, not signed URL or credentials.
- Limit presign expiry and POST policy fields; rotate storage credential if exposed.
- Test draft cannot be fetched through public route, bucket, sitemap, preview or CDN.

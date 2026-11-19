# 05 — Backend dan Kontrak API

**Prefix version:** `/api/v1` · **Format:** JSON UTF-8 kecuali upload bytes · **Waktu:** UTC ISO-8601.

## Aturan API umum

- Respons publik hanya memuat konten `published`; detail tidak ditemukan dan draft sama-sama menjawab `404` tanpa membocorkan keberadaan draft.
- Semua write endpoint memerlukan session admin valid, CSRF token valid, Origin yang sama dengan allowlist deployment, dan schema validation. Guard UI tidak dihitung sebagai auth.
- CRUD menerima explicit field whitelist; jangan menerima objek SQLAlchemy mentah. Perubahan multi-tabel (misalnya project + ordered images) satu transaksi DB kecuali object upload yang memerlukan state machine lintas storage.
- Slug unik; `409 conflict` bila duplikat. Partial update memakai `PATCH`; full replacement hanya bila konsumen membutuhkannya.
- List admin memakai pagination `limit` (default 20, maks 100), `cursor` opaque dan sorting whitelist. Dataset MVP kecil, tetapi cursor menghindari kontrak yang perlu diubah nanti.
- API merespons error berbentuk konsisten; jangan mengirim stack trace, SQL, path file atau secrets ke klien. `request_id` dibuat di ingress dan dicatat di log.

## Konvensi envelope dan errors

Contoh sukses list:

```json
{
  "data": [{"id": "uuid", "slug": "sistem-monitoring", "title": "Sistem Monitoring"}],
  "meta": {"next_cursor": null, "limit": 20}
}
```

Contoh validation error:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Periksa kembali isian yang ditandai.",
    "fields": [{"path": "title", "code": "required", "message": "Judul wajib diisi."}],
    "request_id": "req_opaque"
  }
}
```

| HTTP | Code | Penggunaan |
|---|---|---|
| 400 | `invalid_request` | Bentuk/query tidak dapat diproses |
| 401 | `authentication_required` | Session tidak ada/tidak valid/kedaluwarsa; endpoint tulis tidak dilanjutkan |
| 403 | `forbidden` / `csrf_failed` | Principal tidak memiliki izin atau CSRF/Origin gagal |
| 404 | `not_found` | Resource tak tersedia; public detail juga memakai ini untuk draft |
| 409 | `conflict` / `slug_taken` | Slug atau kondisi versi bentrok |
| 413 | `file_too_large` | Payload melebihi batas aplikasi/object upload |
| 415 | `unsupported_media_type` | Format gambar tidak disetujui |
| 422 | `validation_error` | Pydantic/domain rule menolak input |
| 429 | `rate_limited` | Login/upload API limit tercapai; sertakan `Retry-After` bila layak |
| 500 | `internal_error` | Kesalahan tak terduga tanpa detail internal |
| 503 | `storage_unavailable` / `database_unavailable` | Dependency gagal sementara; aman untuk retry hanya bila operasi idempotent |

## Auth endpoints

| Method + path | Access | Request | Response / side effect |
|---|---|---|---|
| `POST /api/v1/auth/login` | Anonymous; throttled | `{ "username": "…", "password": "…" }` | `200 { "admin": {"username":"…"}, "csrf_token":"…" }`; set cookie `__Host-portfolio_session`, regenerate session ID, record attempt; generic `401` for invalid account/password |
| `GET /api/v1/auth/session` | Session cookie | None | `200 { "admin": ..., "csrf_token": "…", "expires_at": ... }`; `401` if invalid |
| `POST /api/v1/auth/logout` | Session + CSRF | `{}` | `204`; revoke row then expire cookie |

Login success payload contains no session bearer token; it is only in HttpOnly cookie. CSRF token is exposed separately to the same-origin frontend and retained in in-memory page state. No registration, password reset, or admin CRUD user endpoints in MVP.

## Public endpoints

| Method + path | Query | Response fields |
|---|---|---|
| `GET /api/v1/public/profile` | — | `{data:{name,role,headline,intro,about,location,availability,portrait,cv_url,social_links}}`; redact private contact config not approved for public |
| `GET /api/v1/public/experiences` | `limit,cursor` | Published experience summaries sorted `sort_order` then date desc |
| `GET /api/v1/public/education` | `kind=formal|course|certification`, `limit,cursor` | Published credentials, proof URL only if explicitly public |
| `GET /api/v1/public/projects` | `featured`, `type`, `limit,cursor` | Published project list + cover URL + stack labels |
| `GET /api/v1/public/projects/{slug}` | — | Full published case study, ordered ready images, published stack labels; `404` for absent/draft |
| `GET /api/v1/public/skills` | — | Categories and skills in configured order |
| `GET /api/v1/public/contact` | — | Only explicitly public contact methods; never recipient secret/config |

## Admin endpoints

The table below records the earlier target contract. The routes shipped in phase 06 use `GET /admin/overview`, `PUT` for full editor updates, `limit/offset` pagination (maximum 50), and `expected_updated_at` on writes that can conflict. For the implemented endpoint list, schemas, publication workflow, and response behavior, see [admin-api-reference.md](admin-api-reference.md). Phase 06 does not implement the media routes below.

Every row below requires session + CSRF/Origin except read-only GET still needs session. Route groups are systematic; generated OpenAPI must expose exact fields when implementation begins.

| Method + path | Request | Response/side effect |
|---|---|---|
| `GET /api/v1/admin/dashboard` | — | Counts by entity/status; no full content dump |
| `GET /api/v1/admin/profile` | — | Profile, settings and current publication state |
| `PATCH /api/v1/admin/profile` | `ProfileUpdate` | `ProfileRead`, single transaction |
| `POST /api/v1/admin/profile/publish` / `unpublish` | `{}` | Publish/hide singleton public profile; publish checks display name, intro and approved portrait policy |
| `GET /api/v1/admin/projects` | `status,type,query,limit,cursor,sort` | Paginated project list incl status, updated_at and cover |
| `POST /api/v1/admin/projects` | `ProjectCreate` | `201 ProjectRead`; starts draft unless explicit publish permitted |
| `GET /api/v1/admin/projects/{id}` | — | Project including ordered image metadata and stack relations |
| `PATCH /api/v1/admin/projects/{id}` | `ProjectUpdate` | Updated project, slug conflict `409` |
| `DELETE /api/v1/admin/projects/{id}` | confirmation header/body with resource id; optional `If-Match` | `204`; removes project links; schedules unreferenced asset cleanup |
| `POST /api/v1/admin/projects/{id}/publish` | `{}` | Validate publish requirements; `200 ProjectRead` |
| `POST /api/v1/admin/projects/{id}/unpublish` | `{}` | status draft; removes from public responses/sitemap |
| `GET/POST /api/v1/admin/experiences` | filters / `ExperienceCreate` | List; `201 ExperienceRead` |
| `GET/PATCH/DELETE /api/v1/admin/experiences/{id}` | update or deletion confirmation | CRUD; same source feeds two public page views |
| `POST /api/v1/admin/experiences/{id}/publish` | `{}` | Published experience appears in both views |
| `GET/POST /api/v1/admin/education` | `kind,status` / `EducationCreate` | Includes formal, course, certification |
| `PATCH/DELETE /api/v1/admin/education/{id}` | update / confirmation | CRUD |
| `POST /api/v1/admin/education/{id}/publish` / `unpublish` | `{}` | Validate kind-specific public fields; update status and published timestamp |
| `GET/POST /api/v1/admin/skills` | category / `SkillCreate` | CRUD collection; skill read/write includes sort order |
| `PATCH/DELETE /api/v1/admin/skills/{id}` | update / confirmation | Deleting a skill removes project joins by `ON DELETE RESTRICT`? See schema: service must first explicitly remove/reassign joins. |
| `POST /api/v1/admin/skills/{id}/publish` / `unpublish` | `{}` | Changes whether a general skill is shown publicly; do not silently erase project snapshot labels |
| `PUT /api/v1/admin/projects/{id}/images/order` | `{ "image_ids": ["uuid", "uuid"] }` | Exact permutation of associated ready IDs required; transaction; first/explicit cover consistent |
| `PUT /api/v1/admin/projects/{id}/images/{image_id}/cover` | `{}` | Set one cover, clear previous in transaction |
| `DELETE /api/v1/admin/projects/{id}/images/{image_id}` | confirmation | Remove association then asynchronous-safe cleanup for orphan asset |

## Media upload endpoints

| Method + path | Request | Response |
|---|---|---|
| `POST /api/v1/admin/media/upload-intents` | `{ "filename":"dashboard.png", "content_type":"image/png", "size_bytes": 123456 }` | `201 {asset_id, upload_url, required_headers, expires_at}`; reserve asset key `pending`, short expiry |
| `POST /api/v1/admin/media/{asset_id}/complete` | `{ "project_id":"uuid", "alt_text":"…", "caption":"…" }` | Server HEAD/GET and verifies object, type, size, decodes/re-encodes; ready asset linked at chosen position or fails and expires |
| `POST /api/v1/admin/profile/portrait-upload-intent` | same | Upload intent linked to profile after validation |
| `POST /api/v1/admin/media/{asset_id}/retry-validation` | `{}` | Retried only if object still exists and pending state is valid |

Presigned URL is single asset key, narrow method/headers/content-length ceiling and short TTL (target 5 minutes). Never accept a client-supplied object key or public URL as authority. Upload-intent and complete operations are idempotent with an idempotency key or state transition guard.

## Example create project

```json
{
  "title": "Sistem Monitoring",
  "slug": "sistem-monitoring",
  "summary": "Ringkasan yang sudah ditinjau pemilik.",
  "subtitle": "Opsional",
  "project_type": "web_app",
  "year": 2026,
  "role": "Frontend dan API integration",
  "challenge": "Konteks masalah terkonfirmasi.",
  "solution": "Pendekatan yang dapat dijelaskan.",
  "outcome": "Hasil yang didukung bukti.",
  "demo_url": null,
  "repository_url": null,
  "featured": false,
  "status": "draft",
  "skill_ids": []
}
```

## Schemas and validation

Pydantic request models use `extra="forbid"`, bounded strings/URLs and strict enums. Normalize leading/trailing whitespace; never silently coerce arbitrary `javascript:` URLs. Restrict external links to `https` (or `http` only for an explicitly allowed local development value); handle `mailto` as a dedicated contact channel. `year` integer between 1900 and current year + 1. Slug format lowercase ASCII letters/numbers/hyphen and unique index. Max description lengths are implementation details to define in schema, recommended: title 120, subtitle 180, summary 600, long case study section 6000, alt text 180 chars. Use Pydantic validation DTOs at HTTP boundary and SQLAlchemy 2 model/queries in services; do not use `model_construct` to bypass validation on untrusted input.

Use response schemas so internal database fields (`password_hash`, `token_hash`, `object_key` for private draft media, HMAC rate keys, audit data) never leak. Add request ID and structured logs with redaction.

## Publication invariants

`published_at` is set on first publish and refreshed only if explicit product policy requests; status changes update `updated_at`. A project can be `featured` only when published, and at most one published project is flagged featured; enabling another is a single transaction that clears the old flag. Home renders that project plus at most two secondary rows. Gallery records included publicly only when `ready` and project published. Public skill associations require published project and published skill; preserve historical project stack labels through `name_snapshot` if the general skills list changes. See schema policy/open question in [13](13-operations-risks-and-open-questions.md).

Implementation references: [schema](06-database-schema-and-migrations.md), [auth](07-auth-security-and-threat-model.md), [upload](08-media-upload-and-storage.md), [FastAPI async/concurrency](https://fastapi.tiangolo.com/async/), [Pydantic v2 models](https://docs.pydantic.dev/latest/concepts/models/).

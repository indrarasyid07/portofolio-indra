# API Publik — Referensi Fase 03

Semua route berprefix `/api/v1/public`, menerima `GET`, dan tidak memerlukan cookie. Response
menggunakan `application/json` UTF-8. OpenAPI tersedia di `/api/openapi.json`, UI interaktif di
`/api/docs`.

## Endpoint

| Method + URL | Query | Bentuk response `data` | Status utama |
|---|---|---|---|
| `GET /api/v1/public/profile` | — | Objek profil publik: nama, role, headline, intro, about, lokasi/availability yang diisi, portrait, CV URL, social links | `200`, `404`, `503` |
| `GET /api/v1/public/projects` | `featured?`, `type?`, `limit=20`, `cursor?` | Array ringkas: `id`, `slug`, judul, tipe, tahun, role, summary, cover, stack labels | `200`, `400`, `422`, `503` |
| `GET /api/v1/public/projects/{slug}` | — | Studi kasus lengkap dengan media terurut dan stack label | `200`, `404`, `503` |
| `GET /api/v1/public/experiences` | `limit=20`, `cursor?` | Array pengalaman published; satu sumber untuk tampilan Pengalaman dan Riwayat Kerja | `200`, `400`, `422`, `503` |
| `GET /api/v1/public/education` | `kind=formal\|course\|certification`, `limit=20`, `cursor?` | Array pendidikan/kursus/sertifikasi published | `200`, `400`, `422`, `503` |
| `GET /api/v1/public/skills` | — | Kategori published berisi skills published | `200`, `503` |
| `GET /api/v1/public/contact` | — | Email yang ditandai publik, GitHub, LinkedIn | `200`, `404`, `503` |

`site-settings` tidak dibuat: dokumen kontrak tidak mendefinisikan endpoint tersebut.

### Pagination dan filter

- `limit` integer 1–100, default 20. Cursor mengkode posisi `sort_order`, tahun, dan UUID dalam
  base64url. Konsumen memperlakukan cursor sebagai nilai opaque dan meminta cursor berikutnya dari
  `meta.next_cursor`; cursor rusak menghasilkan `400 invalid_request`.
- Urutan proyek: `sort_order ASC`, `year DESC`, UUID ASC. Pengalaman: `sort_order ASC`, tahun mulai
  DESC, UUID ASC. Pendidikan: `sort_order ASC`, tahun mulai DESC (nilai tahun kosong terakhir),
  UUID ASC.
- `featured` menerima boolean. Parameter `type` menerima `web`, `mobile`, `desktop`, `api`, atau
  `other`; nilai yang didukung kontrak database sekarang berbeda dari contoh kontrak API
  `web_app`. Perlu diselaraskan sebelum v1 dibekukan.
- `education.kind` hanya menerima `formal`, `course`, atau `certification`.

## Bentuk response

Profil/detail/kontak memakai data envelope tanpa pagination:

```json
{
  "data": {
    "name": "Indra",
    "role": "Programmer",
    "headline": "Membangun perangkat lunak",
    "intro": "…",
    "about": "…",
    "location": null,
    "availability": null,
    "portrait": null,
    "cv_url": null,
    "social_links": {"github": null, "linkedin": null}
  }
}
```

List menggunakan `data` berupa array dan metadata:

```json
{
  "data": [],
  "meta": {"next_cursor": null, "limit": 20}
}
```

Kesalahan memakai envelope konsisten tanpa input mentah, SQL, stack trace, atau path internal:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Periksa kembali parameter yang dikirim.",
    "request_id": "req_…",
    "fields": [{"path": "limit", "code": "greater_than_equal", "message": "Nilai tidak sesuai format yang diharapkan."}]
  }
}
```

Kode error publik: `invalid_request` (400), `not_found` (404), `validation_error` (422),
`database_unavailable` (503), dan `internal_error` (500). Draft dan slug yang tidak ada sama-sama
`404 not_found`.

## Publikasi, privasi, URL media

- Semua query mengunci `status='published'`; detail slug draft tidak membocorkan apakah baris ada.
- Daftar proyek tidak memuat challenge/solution/outcome. Detail memuat bagian tersebut.
- Informasi email hanya keluar dari route contact apabila kolom `public_email` ada dan lolos
  validasi. `admin_users`, hash, session, konfigurasi rahasia, dan object key tidak pernah menjadi
  response.
- URL demo, repo, CV, bukti pendidikan, dan social link disaring: hanya HTTPS; HTTP localhost
  diizinkan saat `APP_ENV=development|test`. Field URL yang tidak lolos menjadi `null`.
- URL image dirakit dari `PUBLIC_MEDIA_BASE_URL` dan `object_key` yang lolos pemeriksaan path;
  hanya asset dengan state `ready` yang ditampilkan. Alt text/caption dibaca dari metadata asset,
  bukan dari browser. Jika base URL belum diatur, URL image bernilai `null`, bukan URL yang dibuat
  dari input pengguna.
- Asumsi untuk bukti pendidikan: mengisi `proof_url` pada baris yang dipublish menandakan pemilik
  telah menyetujuinya untuk publik. Perlu kolom approval khusus bila pengelolaan approval terpisah
  dibutuhkan.

## Cache dan CORS

Setiap response di `/api/v1/public/*` memiliki `Cache-Control: no-store`; tidak ada stale window.
Ini menjaga perubahan publish/unpublish langsung terlihat dan selaras dengan keputusan SSR awal
di dokumen arsitektur. Belum ada invalidasi CDN; pertimbangkan cache bersama hanya setelah alur
invalidation publish diuji. SSR Astro dan browser harus menghormati `no-store`.

CORS memakai exact allowlist dari `ALLOWED_ORIGINS` (default hanya `http://localhost:4321`),
`allow_credentials=false`, method `GET`, dan tanpa header custom. Atur origin deployment lewat
environment setelah domain disetujui; jangan memakai wildcard.

## Menjalankan pemeriksaan

Dari `backend/`:

```powershell
uv sync --all-groups
uv run ruff check app migrations tests
uv run mypy
uv run pytest
uv lock --check
```

Tes API mengirim request HTTP melalui ASGI ke app dan memakai SQLite in-memory yang benar-benar
menjalankan model, constraint, join, pagination, dan filter—bukan hanya mock repository.
PostgreSQL/Neon tetap memerlukan migration smoke test terpisah pada DB development kosong.

# Laporan Implementasi Fase 03 — Public API

Tanggal: 2026-11-19  
Status: **PARTIAL — API dan tes lokal lulus; database PostgreSQL development belum tersedia**

## Implementasi

- Read-only FastAPI routes untuk profile, project list/detail, experiences, education, skills, dan
  contact. Semua response memiliki DTO Pydantic; route admin/CRUD tidak dibuat.
- Filter published diterapkan pada query. Draft project dan slug hilang sama-sama `404`.
- Projects list ringkas dengan filter featured/type dan opaque cursor; detail memuat studi kasus,
  media ready terurut, cover, dan stack labels. Pengalaman/pendidikan juga memakai cursor.
- URL external dibatasi HTTPS (HTTP hanya localhost dalam development/test); email divalidasi;
  object key divalidasi dan tidak pernah dikirim ke response. Media URL bersumber dari configured
  `PUBLIC_MEDIA_BASE_URL`, bukan URL dari data yang diterima klien.
- Error envelope konsisten untuk 400/404/422/500/503, request ID, log error tanpa SQL/detail
  sensitif, `Cache-Control: no-store` pada public API, allowlist CORS dan OpenAPI `/api/openapi.json`.
- Panduan handoff endpoint ada di [public-api-reference.md](public-api-reference.md).

## Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| HTTP API + SQLite in-memory DB-backed tests | PASS — 18 tests |
| Published/draft isolation, 404 consistency, filters, cursor, empty lists | PASS |
| Gallery order, alt/caption, unsafe object key, media state | PASS |
| Experience dan education source/filter, URL sanitization | PASS |
| Error privacy 400/422/500/503, request ID, CORS, OpenAPI | PASS |
| Ruff | PASS |
| mypy strict | PASS |
| `uv lock --check` | PASS |
| Neon/PostgreSQL DB-backed API integration | **BLOCKED** — belum ada DATABASE_URL dev tervalidasi; tidak menyambungkan production |

## Perbedaan/keputusan yang perlu diselaraskan

1. Dokumen DB/ADR meminta konfirmasi C2 (tanggal tahun-bulan) dan C4 (snapshot skill proyek).
   Kode memakai kontrak fase 02: tanggal year/month, stack snapshot di detail; relasi stack publik
   tetap memerlukan skill berstatus published mengikuti dokumen API. Pemilik perlu menyetujui
   kebijakan C2/C4 sebelum schema/API v1 dianggap beku.
2. Contoh payload kontrak menyebut `project_type="web_app"`, sedangkan enum SQLAlchemy fase 02
   membatasi `web|mobile|desktop|api|other`. API mengikuti enum database saat ini; samakan dokumen
   dan migration sebelum ada data project.
3. Endpoint `contact` diimplementasikan karena ada pada kontrak API. Endpoint `site-settings` tidak
   dibuat karena tidak tercantum dalam kontrak aktual.
4. Proof URL pendidikan direspons hanya setelah HTTPS validation; asumsi persetujuan publik adalah
   keberadaan field pada baris yang sudah dipublish karena schema belum punya flag approval terpisah.

## Blocker lanjutan

Jalankan fase integration pada PostgreSQL development kosong untuk memeriksa UUID/JSONB/index dan
query behavior sebelum Neon v1. Media URL juga memerlukan `PUBLIC_MEDIA_BASE_URL` setelah provider
storage dan domain publik dipilih; tanpa itu endpoint mengembalikan media `url: null` dengan aman.

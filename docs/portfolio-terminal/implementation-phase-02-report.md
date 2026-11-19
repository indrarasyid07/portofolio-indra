# Laporan Implementasi Fase 02 — Data Layer dan Migration

Tanggal: 2026-11-19  
Status: **PARTIAL — kode siap ditinjau; penerimaan PostgreSQL Neon terblokir**

## Hasil

- SQLAlchemy 2 async models untuk `profiles`, `projects`, `project_images`, `media_assets`,
  `experiences`, `education_records`, `skill_categories`, `skills`, `project_skills`,
  `admin_users`, `admin_sessions`, dan `login_attempts`.
- Constraint/index untuk singleton profile, slug, status, tipe, tahun/bulan, FK delete policy,
  urutan media, satu cover per proyek, satu featured project terbit, session expiry, hash, serta
  query list publik.
- Session dependency per request, pooled engine kecil dengan pre-ping/timeout, URL DB sebagai
  secret dan pemisahan pooled runtime URL dari direct migration URL.
- Alembic initial migration, downgrade eksplisit yang menghapus semua tabel, dan README perintah.
- Pydantic read schemas publik menghilangkan credential/token/hash/object key. Kerangka bootstrap
  admin menolak membuat user sebelum fase autentikasi; tidak ada akun default atau seed fiktif.
- Peta entitas → field → constraint → API model → halaman ada di
  [schema-api-page-mapping.md](schema-api-page-mapping.md).

## Pemeriksaan

| Pemeriksaan | Hasil |
|---|---|
| SQLAlchemy metadata + SQLite in-memory CRUD/constraint/FK/rollback | PASS — 9 tests, tanpa warning |
| Query loading stack proyek dengan `selectinload` | PASS — 3 query untuk 4 proyek |
| Alembic upgrade → downgrade → upgrade pada SQLite kosong sementara | PASS |
| Perbandingan migration vs SQLAlchemy metadata (`alembic check`) | PASS — tidak ada operasi baru |
| Compile SQL migration dengan dialect PostgreSQL tanpa koneksi | PASS — JSONB, UUID, dan partial index terdeteksi |
| `ruff check app migrations tests` | PASS setelah koreksi format final |
| `mypy` strict | PASS |
| `uv lock --check` | PASS |
| PostgreSQL/Neon migration dan operasi DB | **BLOCKED** — tidak ada DATABASE_DIRECT_URL kredensial dev; tidak menyambung ke layanan apa pun |

SQLite di sini hanya menguji perilaku portable. Perlu tes ulang migrasi di PostgreSQL dev karena
Neon menggunakan UUID native, JSONB, timezone-aware timestamp, dan partial index PostgreSQL.

## Perubahan/keputusan dari dokumen

- **C2 (tanggal):** model memakai `start_year/start_month/end_year/end_month`, tidak mengarang
  hari. Ini keputusan implementasi sementara dari bentuk ERD/dictionary; pemilik masih perlu
  mengonfirmasi sebelum migration dipasang sebagai v1 pada Neon.
- **C4 (stack historis):** snapshot nama dipakai untuk tampilan stack proyek; FK skill `RESTRICT`
  agar penghapusan tidak merusak histori. Kontrak API publik saat ini menyebut status skill juga
  harus published, jadi endpoint wajib diselaraskan sebelum implementasi publik.
- `project_images` tetap hanya menyimpan relasi, urutan, dan cover. Alt/caption/object key berada
  di `media_assets` sesuai normalisasi skema.
- Tidak ada migrasi yang dijalankan pada PostgreSQL karena kredensial/database dev terverifikasi
  belum tersedia. Tidak ada data production yang disentuh.

## Risiko / tindak lanjut

1. Minta konfirmasi C2 dan C4 sebelum menetapkan migration ini sebagai kontrak v1.
2. Jalankan `alembic upgrade head`, CRUD dan downgrade hanya pada DB PostgreSQL development kosong;
   validasi JSONB, partial unique index, dan precision waktu.
3. Tambah audit-events bila kebutuhan audit admin dikunci; tabel itu opsional di dokumen sumber.
4. Phase 05 perlu mengimplementasikan bootstrap admin interaktif, auth, serta kebijakan keamanan.
5. Production release migration memerlukan workflow deploy terpisah, backup, dan review; Alembic
   CLI fase ini sengaja menolak `APP_ENV=production`.

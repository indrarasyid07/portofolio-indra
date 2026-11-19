# Rencana Portofolio Terminal

**Status:** Rancangan sebelum implementasi · **Bahasa produk:** Indonesia · **Pemilik:** Indra Rasyid  
**Tanggal verifikasi platform:** 19 November 2026

Dokumen ini adalah rancangan teknis dan produk untuk memindahkan prototipe HTML/CSS/JavaScript menjadi situs portofolio publik dan panel admin. Belum ada keputusan deploy atau klaim implementasi. Isian prototipe bukan fakta biografi dan tidak boleh dipublikasikan sebelum dikonfirmasi.

## Cara membaca

| Dokumen | Isi |
|---|---|
| [01 — Audit referensi](01-reference-audit.md) | Kondisi repository, dokumentasi lama, dan prototipe asli. |
| [02 — Ruang lingkup dan UX](02-product-scope-and-ux.md) | Audiens, sitemap, alur publik/admin, permission matrix, kriteria UX. |
| [03 — Arsitektur dan ADR](03-system-architecture-and-decisions.md) | Batas sistem, rendering, deployment pilihan, ADR. |
| [04 — Frontend](04-frontend-design-and-routing.md) | Identitas visual, tokens, routes, states, accessibility, SEO. |
| [05 — Backend dan API](05-backend-and-api-contract.md) | Modul FastAPI, endpoint, kontrak payload, status dan error. |
| [06 — Database](06-database-schema-and-migrations.md) | ERD, kolom, constraints, index, migration policy. |
| [07 — Auth dan keamanan](07-auth-security-and-threat-model.md) | Session, threat model, CSRF, login, permission enforcement. |
| [08 — Media](08-media-upload-and-storage.md) | Alur upload, object storage, validasi, lifecycle dan cleanup. |
| [09 — Deployment](09-deployment-and-environments.md) | Vercel/Neon topology, environment variables, limits dan deploy. |
| [10 — Migrasi konten](10-migration-and-content-strategy.md) | Mapping data prototipe, import manual, publication rules. |
| [11 — Kualitas](11-testing-and-acceptance.md) | Testing matrix, release acceptance, accessibility/performance gates. |
| [12 — Roadmap](12-implementation-roadmap.md) | Tahapan coding beserta hasil, file, test, acceptance dan DoD. |
| [13 — Operasi dan risiko](13-operations-risks-and-open-questions.md) | Operasi rutin, risiko, asumsi, pertanyaan yang menunggu keputusan. |

## Ringkasan rancangan

- Website publik: Astro + TypeScript + CSS biasa; server-render konten publik dari API agar publikasi admin tidak menunggu rebuild. Detail tiap proyek memakai slug yang stabil.
- API: FastAPI + Python 3.12, Pydantic v2, SQLAlchemy 2 async, Alembic, PostgreSQL. Runtime Python Vercel saat ini berstatus Beta dan belum diuji pada project akun ini.
- Database: endpoint Neon `indra` yang diberikan pemilik berada di `us-east-2` (Ohio); koneksi runtime memakai pooled hostname, migrasi memakai direct URL. Branch staging belum dipastikan.
- Admin: satu akun tanpa registrasi; session opaque 256-bit pada cookie `__Host-...`, hash token disimpan di Postgres; Argon2id untuk password.
- Media: endpoint Neon Object Storage yang diberikan pemilik berada di `us-east-2` (Ohio), memakai API bergaya S3. Status private access dan branch staging belum diverifikasi; fitur upload masih gagal tertutup sampai bucket privat dikonfirmasi.
- Fase upload media dari prompt `FASE-07-UPLOAD-MEDIA` memiliki API privat, validasi gambar, admin editor, pemeriksaan publikasi, dan cleanup. Live write proof berstatus `BLOCKED`: branch belum terverifikasi nonproduksi dan bucket CORS yang ada masih wildcard.
- Deployment rekomendasi: dua Vercel Projects dari satu Git repository, root `frontend/` dan `backend/`. Browser memakai Astro same-origin BFF di `/api/v1/*`; SSR memakai `API_INTERNAL_URL`. Git lokal baru diinisialisasi; remote, akun Vercel, project backend dan preview belum tersedia.
- Arah visual: editorial charcoal, serif untuk headline, sans untuk isi, monospace untuk label terminal, lime terbatas pada aksen. Beranda fokus pada nama dan foto, bukan katalog semua konten.

## Batas rancangan

Tabel data, schema, API, region, kuota, dan platform behavior di sini adalah rancangan/verifikasi docs, bukan bukti akun atau deployment tersedia. Kuota layanan berubah; cek kembali saat implementasi dan sebelum rilis. Ketersediaan Vercel Python Runtime dan Services perlu dikonfirmasi di akun/proyek yang dipakai. Draft dan konfigurasi belum mengaktifkan service apa pun.

## Urutan implementasi yang direkomendasikan

Mulai fase 0 pada [roadmap](12-implementation-roadmap.md): pastikan Git repository root dan ownership, sepakati konten asli/foto/CV, lalu konfirmasi domain dan kelayakan Vercel Hobby untuk penggunaan personal. Jangan melakukan import otomatis atas seed demo.

## Catatan sumber

Klaim platform mutakhir ditautkan langsung ke dokumentasi resmi di dokumen terkait. Panduan keamanan merujuk OWASP; referensi tidak menggantikan review terhadap konfigurasi produksi.

# Laporan Implementasi Fase 05 — Auth dan Session

## Status: BLOCKED

**BLOCKED untuk penerimaan deployment preview lintas domain.** Implementasi lokal selesai dan lolos pemeriksaan otomatis. Domain preview frontend/backend Vercel belum tersedia, sehingga cookie `__Host-`, forwarding Origin, signing IP oleh BFF, dan perilaku session di browser belum dapat diverifikasi pada deployment. Penerimaan fase secara keseluruhan menunggu pemeriksaan tersebut.

## Implementasi

- Login admin memakai Argon2id (`m=19 MiB`, `t=2`, `p=1`), respons kredensial generik, dan verifikasi dummy hash untuk nama pengguna yang tidak dikenal.
- Bootstrap akun pertama memakai prompt password tersembunyi. Opsi rotasi password mencabut session aktif; password tidak diterima melalui argumen CLI.
- Token session acak 256-bit disimpan sebagai HMAC di PostgreSQL. Cookie memakai `HttpOnly`, `SameSite=Strict`, `Path=/`; lingkungan non-development/test menggunakan `Secure` dan prefiks `__Host-`.
- Batas session idle 30 menit dan absolut 12 jam, logout mencabut session, dan pemeriksaan session membersihkan cookie yang tidak valid.
- CSRF terikat pada token session. Operasi tulis memerlukan CSRF, Origin exact, dan `application/json`.
- Pembatasan login memakai pseudonim HMAC di PostgreSQL, advisory transaction locks, batas 5 kegagalan per akun dan 20 per sumber per 15 menit, serta retensi tujuh hari.
- Astro menyediakan BFF same-origin untuk auth/admin, meneruskan cookie dengan aman, membatasi body/timeout, dan menandatangani IP klien dengan `AUTH_PROXY_KEY` bersama backend.
- Halaman `/admin/login` dan shell `/admin` tersedia. CRUD konten belum termasuk fase ini; boundary admin yang dilindungi mengembalikan `501` untuk operasi yang belum diimplementasikan.

## Konfigurasi yang dibutuhkan

Salin contoh dari `backend/.env.example` dan `frontend/.env.example`. Atur `API_INTERNAL_URL` di runtime server frontend; samakan `AUTH_PROXY_KEY` pada frontend dan backend; isi `SESSION_HASH_KEY` serta `LOGIN_RATE_KEY` dengan secret acak tersendiri. Backend perlu `PUBLIC_SITE_ORIGIN`, `ALLOWED_ORIGINS`, dan `TRUSTED_HOSTS` yang sesuai host nyata. Jangan menaruh nilai rahasia di variabel `PUBLIC_*` atau meng-commit `.env`.

Bootstrap dan migrasi belum dijalankan terhadap Neon. Sebelum bootstrap, pastikan `DATABASE_URL` mengarah ke database `indra` yang benar dan database telah dimigrasikan melalui prosedur deployment yang disetujui.

## Verifikasi lokal

- Backend: `ruff check app migrations tests`, `mypy`, dan `pytest` — **25 tes lulus**.
- Dependency lock: `uv lock --check` — **lulus**.
- Frontend: `npm run check` — **lulus tanpa error/warning**.
- Frontend production build: `npm run build` — **lulus**.
- Migration SQL dapat ditinjau dengan `uv run alembic upgrade head --sql`; jangan mengganti ini dengan migrasi langsung ke Neon sebelum target database dipastikan.

Tes SQLite memvalidasi alur dan cabang kebijakan auth, tetapi tidak membuktikan serialisasi advisory lock PostgreSQL. Verifikasi PostgreSQL development dan browser deployment tetap diperlukan.

## Batas fase

Tidak ada CRUD admin, manajemen media, MFA, deployment, atau akun contoh yang ditambahkan. Pekerjaan fase berikutnya dapat membangun form admin di atas `require_admin` dan `require_admin_write` setelah penerimaan auth/session selesai.

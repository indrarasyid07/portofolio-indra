# Laporan Deployment — Fase 09: Vercel + Neon Preview

Tanggal: 2026-11-19  
Status: **BLOCKED — tidak ada deployment preview yang dibuat.**  
Production: **tidak dideploy dan tidak dipromosikan.**

## Yang sudah disiapkan

- Inisialisasi Git lokal pada root `Indra` dengan branch awal `main`, sesuai target satu repository. Belum dibuat commit, remote belum ditambahkan, dan isi workspace masih untracked.
- Menetapkan entrypoint ASGI FastAPI untuk Vercel di `[tool.vercel] entrypoint = "app.main:app"` pada `backend/pyproject.toml`. Vercel Python Runtime menemukan entrypoint dari `tool.vercel.entrypoint`; aplikasi tetap harus diuji pada deployment preview.
- Memperbarui dokumen deployment/ADR: Vercel Python Runtime berstatus Beta; endpoint Neon yang diberikan pemilik menunjukkan region `us-east-2` (Ohio), bukan kandidat Singapore pada rancangan lama; browser memakai Astro BFF same-origin `/api/v1/*`, sedangkan SSR menggunakan `API_INTERNAL_URL`.
- Tidak menambahkan `vercel.json`: frontend Astro sudah memakai Vercel adapter dan BFF route; belum ada project backend/preview origin yang aman untuk direferensikan. External rewrite paralel dapat membuat jalur cookie/Origin tidak konsisten.
- Memetakan kebutuhan environment per project tanpa menyalin nilai rahasia ke dokumen.

## Matriks environment

| Variable | Project | Local | Preview | Catatan |
|---|---|---|---|---|
| `API_INTERNAL_URL` | Frontend server | Ada di `.env` lokal | Belum disetel | Origin API backend preview; tidak boleh bernilai alamat API produksi. |
| `SITE_URL` | Frontend server/build | Ada di `.env` lokal | Belum disetel | URL preview frontend yang tepat untuk canonical, robots, dan sitemap. |
| `AUTH_PROXY_KEY` | Frontend + backend | Ada di `.env` lokal | Belum disetel | Rahasia bersama BFF; masukkan melalui dashboard/CLI secure env, bukan Markdown. |
| `DATABASE_URL` | Backend | Ada di `.env` lokal | Belum disetel | Runtime memakai pooled URL, SSL; database/branch preview belum dipastikan. |
| `DATABASE_DIRECT_URL` | Migrasi backend | Ada di `.env` lokal | Belum disetel | Direct URL untuk migrasi terkontrol saja; jangan masukkan ke frontend. |
| `APP_ENV` | Backend | Ada di `.env` lokal | Belum disetel | Nilai preview harus mencegah debug dan bootstrap/seed otomatis. |
| `PUBLIC_SITE_ORIGIN`, `ALLOWED_ORIGINS`, `TRUSTED_HOSTS` | Backend | Konfigurasi lokal | Belum disetel | Host/origin harus eksplisit dan cocok dengan preview; wildcard dilarang. |
| `SESSION_HASH_KEY`, `LOGIN_RATE_KEY` | Backend | Ada di `.env` lokal | Belum disetel | Rahasia berbeda dari environment produksi. |
| `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` | Backend | Ada di `.env` lokal | Belum disetel | Harus mengarah ke bucket/branch preview terisolasi. Jangan salin credential lokal sebelum akses branch/bucket dipastikan. |
| `AWS_S3_PRIVATE_BUCKET_CONFIRMED` | Backend | Tidak disetel; default `false` | Harus tetap `false` sampai akses private terverifikasi | Upload fail-closed. Jangan mengaktifkan pada preview dahulu. |

Nama variabel di tabel mengikuti kode saat ini. Beberapa dokumen rancangan lama menggunakan `DIRECT_DATABASE_URL`; kode sekarang menggunakan `DATABASE_DIRECT_URL`.

## Mengapa preview tertahan

| Gerbang | Temuan | Dampak |
|---|---|---|
| Git/Vercel | Sebelum fase ini tidak ada `.git`; lokal sudah diinisialisasi, tetapi belum ada commit atau Git remote. `vercel` tidak terpasang; `vercel --version`, `vercel whoami`, dan `vercel project ls` gagal karena command tidak ditemukan. Tidak ada `frontend/.vercel/project.json` atau link backend project. | Belum ada repository/provider atau project Vercel terautentikasi untuk membuat dua preview deployment. |
| Project topology | Belum ada Vercel project frontend/backend yang dikonfirmasi; root directory belum dapat diperiksa di dashboard. | Domain preview dan API origin belum diketahui. |
| Neon isolation | Connection endpoint yang diberikan pemilik berada di `us-east-2`. Status branch database `indra` yang dituju koneksi lokal tidak diverifikasi. Tidak ada branch khusus preview yang dipilih/dikonfirmasi. | Tidak aman untuk menjalankan preview dengan URL lokal karena dapat menyentuh data production. Tidak ada query, migration, bootstrap, atau seed terhadap Neon yang dijalankan. Neon menetapkan satu region tetap per project. |
| Object Storage | Laporan fase 07 mencatat bucket private belum diverifikasi dan CORS masih wildcard; upload fail-closed. | Belum ada konfigurasi atau upload objek. Storage preview belum aman untuk uji media. |
| Pemilik keputusan | Domain/URL, team Vercel, plan/kelayakan penggunaan, dan origin frontend preview belum dipilih. | Belum bisa menetapkan allowlist CORS/Origin, host, cookie, canonical, dan preview variables. Hobby/usage terms harus cocok dengan pemakaian aktual. |
| QA gate | Fase 08 lulus pemeriksaan lokal, tetapi integrasi CRUD/auth/media, draft/published, keyboard/zoom/reflow lengkap, serta uji staging masih terbuka. | Belum ada bukti end-to-end untuk menerima preview atau mengizinkan produksi. |

Vercel saat ini menandai Python Runtime sebagai Beta dan mendukung entrypoint FastAPI/ASGI dari `tool.vercel.entrypoint`; ini belum membuktikan build dan cookie flow aplikasi ini. Monorepo Vercel memerlukan repo Git yang sama dengan root project terpisah `frontend/` dan `backend/`. [Dokumentasi Python Runtime Vercel](https://vercel.com/docs/functions/runtimes/python), [monorepo Vercel](https://vercel.com/docs/monorepos).

Neon pooled connection tepat untuk runtime serverless; gunakan direct connection untuk migrasi yang memerlukan fitur session. Database preview harus di branch/project terisolasi, bukan URL produksi. [Dokumentasi koneksi pool Neon](https://neon.com/docs/connect/connection-pooling), [region Neon](https://neon.com/docs/introduction/regions), [Neon Object Storage](https://neon.com/docs/storage/overview).

## Verifikasi lokal

- `git status --short`: repository aktif, semua file project untracked, tidak ada remote/commit.
- `vercel --version`, `vercel whoami`, `vercel project ls`: **tidak berjalan**; Vercel CLI tidak tersedia.
- `uv lock --check`, Ruff, mypy (31 file), dan `pytest`: lulus; **37 tes passed**. `from app.main import app` berhasil dimuat sebagai `Portfolio API`, memeriksa import entrypoint lokal tanpa menjalankan deployment.
- Secret values tidak dibaca atau dicetak. Nama variable lokal dicocokkan ke kode; `.env*` diabaikan oleh `.gitignore`.
- Tidak ada deployment URL, deployment ID, smoke test Vercel, Neon write, migration, seed, storage write, perubahan CORS, atau pengubahan bucket access.

## Langkah berikutnya agar preview dapat dijalankan

1. Hubungkan repo `Indra` ini ke Git provider dan pilih team/account Vercel yang akan memiliki dua project.
2. Buat/konfirmasi branch Neon preview yang benar-benar terisolasi serta credential preview. Pastikan targetnya bukan database `indra` production.
3. Konfirmasi project/branch/bucket Object Storage untuk preview; operator verifikasi bucket private dan set CORS exact ke preview origin. Sampai selesai, upload tetap nonaktif.
4. Tetapkan URL preview frontend/API dan plan yang dipakai. Isi setiap environment melalui Vercel secure env, dengan `AUTH_PROXY_KEY`/session keys khusus preview dan origin allowlist exact.
5. Deploy backend preview dahulu; cek `/health` dan readiness database tanpa membocorkan DSN. Setelah itu deploy frontend preview dengan `API_INTERNAL_URL` menunjuk backend preview.
6. Jalankan smoke test browser untuk SSR, 404, published/draft, login/cookie/session, CSRF, CRUD, upload, logout, cache headers, dan gambar; cek logs/latency/cold start.
7. Catat hasil preview serta rollback. Gerbang production tetap menunggu izin eksplisit pengguna, domain/plan yang disetujui, backup, dan seluruh QA gates.

Tidak ada langkah produksi yang dijalankan.

# Laporan handoff — Fase 10: Operations

Tanggal: 2026-11-19  
Status keseluruhan: **HANDOFF DOKUMENTASI SELESAI; operasi production dan recovery drill BLOCKED**.

## Hasil

| Item | Status | Owner/langkah berikut |
|---|---|---|
| Developer onboarding, tool versions, env names, commands dan tree | **DONE** | Pemilik upgrade Node jika masih `22.23.3`; Astro memerlukan `22.23.4+`. |
| Panduan login/CRUD/publish/media/admin password | **DONE** | Pemilik memverifikasi konten dan password admin secara privat saat preview siap. |
| Deploy/migration/rollback runbook | **DONE (prosedur)** | **BLOCKED** bukti deploy/rollback nyata sampai Git remote, Vercel projects, dan preview aman tersedia. |
| Backup/restore procedure | **DONE (prosedur)** | **BLOCKED** eksekusi: belum ada backup terverifikasi, lokasi arsip/retention, atau database nonproduction restore target. |
| Security incident/key/session rotation | **DONE (prosedur)** | Password-rotation CLI sudah ada; live revoke test belum dijalankan terhadap DB nonproduction. |
| Health/readiness | **DONE (kode lokal)** | `/health` liveness; `/ready` menguji `SELECT 1`. Observability deployment belum tersedia. |
| Cost, Hobby terms, Neon quota snapshot | **DONE (dokumentasi)** | Pemilik mengonfirmasi plan/kelayakan sesuai penggunaan nyata; snapshot 2026-11-19 harus diperiksa ulang sebelum deploy. |
| Integritas konten | **DONE (status dicatat)** | Nama publik, foto, proyek dan riwayat masih perlu verifikasi pemilik. Setelah handoff, hanya endpoint pengalaman publik dibaca dan mengembalikan nol record; status konten lain dan identitas target DB belum diverifikasi. |
| Accessibility/SEO maintenance checklist | **DONE (prosedur)** | Reflow/zoom/keyboard end-to-end masih perlu staging/browser acceptance. |
| Production status | **DONE (akurat)** | Belum dideploy. Tidak ada URL, deployment ID, backup, atau restore drill yang diklaim. |

## Recovery drills

| Drill | Status | Alasan |
|---|---|---|
| Restore Postgres ke nonproduction, cek tabel/count/constraints | **BLOCKED** | Tidak ada branch restore/test yang dikonfirmasi dan backup archive belum dibuat. |
| Rotasi credential admin/revoke sesi, request berikutnya 401 | **BLOCKED** | CLI ada, tetapi tidak ada DB nonproduction/browser deployment yang aman untuk diuji. |
| Simulasi objek hilang dan cek fallback/repair | **BLOCKED** | Bucket/branch nonproduction dan access level belum dikonfirmasi; tidak boleh menghapus atau mengubah objek. |
| Rollback deployment tanpa rollback konten | **BLOCKED** | Belum ada deployment preview atau content data yang diadministrasi. Runbook memisahkan rollback kode dari restore data. |
| Initial schema migration | **DONE (target identity UNVERIFIED)** | Revisi awal dan retention index berhasil diterapkan ke database dari `DATABASE_DIRECT_URL` lokal. Branch/environment belum dikonfirmasi sebagai preview atau production. |

## Verifikasi yang benar-benar dilakukan

- Code review menunjukkan skrip `bootstrap_admin --rotate-password` menggunakan prompt tersembunyi, mengganti hash password dan mencabut sesi aktif; perilaku database live belum diuji.
- Script cleanup media default dry-run dan membutuhkan `--apply` untuk menghapus kandidat; tidak ada cleanup dijalankan.
- `GET /health` tidak memerlukan database. Endpoint `/ready` menguji `SELECT 1`. Seusai percobaan Alembic yang gagal karena nama unique constraint PostgreSQL bentrok, nama constraint dibuat unik pada model/migration. Migrasi berhasil sampai `b7f4c7a1d2e9 (head)` di target yang dikonfigurasi lewat `DATABASE_DIRECT_URL`; identitas branch/environment tidak dibuka atau diverifikasi.
- Pemeriksaan baca sesudah migrasi: `/ready` 200 dan `/api/v1/public/experiences?limit=1` 200 dengan nol record. Profil, proyek, pendidikan dan isi database lain tidak ditinjau. `.env` tidak dicetak dan tetap di-ignore. Tidak ada backup, key rotation, logout/session revoke, object write/delete atau deployment.
- Verifikasi otomatis lokal selesai: Ruff lulus; mypy melaporkan tidak ada isu pada 31 source files; pytest `39 passed`; Astro check memeriksa 26 file dengan 0 errors, 0 warnings, 0 hints; `npm run build` sukses dan membundel output server Vercel.
- Hasil migration/GET hanya membuktikan target koneksi yang sedang dikonfigurasi merespons; ini bukan bukti bahwa target tersebut branch preview yang aman, bukan bukti upload bucket, autentikasi end-to-end, staging atau production.

## Changelog

- Menambahkan `/ready` untuk readiness database dengan respons 503 generik dan proxy dev `/api/ready`.
- Membuat onboarding, admin guide, operations runbook, content/SEO/accessibility checklist, serta laporan final.
- Membekukan kontrak lintas fase dari dokumen rancangan dan kode lokal; bagian yang memerlukan preview browser ditandai blocked.
- Memperbaiki nama unique constraint yang bentrok, menambahkan event loop psycopg yang kompatibel dengan Windows, dan menerapkan schema sampai head pada target konfigurasi lokal (identitas branch belum diverifikasi).
- Memperbarui indeks dokumentasi dan status overview agar tidak lagi menyebut stack/hosting belum dipilih maupun proyek masih hanya rencana.

## Backlog future

- Search, analytics, media batch, automated backup/restore scheduler, alerting, dan MFA/passkey tetap future scope—bukan MVP yang telah tersedia.

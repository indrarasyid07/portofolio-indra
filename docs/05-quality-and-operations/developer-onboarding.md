# Developer onboarding

## Status dan kebutuhan alat

Repository root adalah folder `Indra/`. Frontend berada di `frontend/`; API dan migrasi berada di `backend/`. Branch Git lokal `main` sudah diinisialisasi, tetapi belum ada commit atau remote.

- Node.js `22.23.4+` (disarankan Node 24 LTS) dan npm `9.6.5+`. Build terakhir memakai Node `24.22.1`; Node bawaan `22.23.3` pada workstation ini ditolak oleh Astro.
- Python `3.12` sesuai `backend/.python-version` dan `uv` untuk membuat virtual environment serta memasang lockfile.
- PostgreSQL client tools (`pg_dump`, `pg_restore`) hanya dibutuhkan untuk backup/restore.
- AWS CLI hanya dibutuhkan untuk inventory/cadangan objek setelah bucket preview yang aman dikonfirmasi.

Versi yang terlihat saat handoff: Node sistem `22.23.3`, npm `10.9.9`, uv `0.13.7`, Python launcher menunjukkan `3.12`. Pastikan `node --version` benar-benar `22.23.4+` sebelum menjalankan Astro. Tidak perlu menyiapkan Neon/Vercel untuk halaman scaffold atau `GET /health`.

## Environment lokal

Environment dibaca dari `frontend/.env` dan `backend/.env`; contoh aman tersedia di `.env.example`. Nama variabel yang dipakai kode:

| Lokasi | Nama |
|---|---|
| Frontend server | `API_INTERNAL_URL`, `SITE_URL`, `AUTH_PROXY_KEY` |
| Backend | `APP_ENV`, `DATABASE_URL`, `DATABASE_DIRECT_URL`, `SESSION_HASH_KEY`, `LOGIN_RATE_KEY`, `AUTH_PROXY_KEY`, `PUBLIC_SITE_ORIGIN`, `SESSION_IDLE_MINUTES`, `SESSION_ABSOLUTE_HOURS`, `TRUSTED_HOSTS`, `ALLOWED_ORIGINS` |
| Backend media | `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_S3_PRIVATE_BUCKET_CONFIRMED` |

`DATABASE_URL` dipakai aplikasi; `DATABASE_DIRECT_URL` khusus migrasi/operasi yang memerlukan koneksi langsung. `AUTH_PROXY_KEY` harus sama di frontend dan backend. Kunci sesi, rate-limit, dan storage credential tidak boleh dipindahkan ke browser atau commit. `.env*` diabaikan Git.

Jika contoh env perlu disalin, jangan menimpa env yang sudah ada.

PowerShell:

```powershell
if (-not (Test-Path frontend/.env)) { Copy-Item frontend/.env.example frontend/.env }
if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
```

Bash:

```bash
test -f frontend/.env || cp frontend/.env.example frontend/.env
test -f backend/.env || cp backend/.env.example backend/.env
```

Setiap clone/operator harus mengisi sendiri env lokal dari secret manager yang disetujui. Jangan menyalin `.env` yang sudah terisi ke chat, dokumen, atau Git.

## Jalankan lokal

Terminal 1, PowerShell atau Bash:

```text
cd backend
uv sync --locked
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal 2:

```text
cd frontend
npm ci
npm run dev
```

Buka `http://localhost:4321/`. Liveness API: `http://127.0.0.1:8000/health` atau proxy dev `http://localhost:4321/api/health`. Readiness database: `http://127.0.0.1:8000/ready` atau proxy dev `http://localhost:4321/api/ready`; readiness harus mengembalikan 503 bila database tidak terhubung. Liveness tetap mengembalikan 200 selama proses API hidup.

Backend tanpa konfigurasi database tetap dapat menjawab `/health`. Frontend SSR memerlukan backend; data yang belum ada akan ditampilkan sebagai keadaan kosong/tidak tersedia. Tidak ada data pribadi demo yang otomatis dibuat.

## Perintah kualitas

Jalankan dari folder masing-masing:

```powershell
# frontend
npm run check
npm run build

# backend
uv lock --check
uv run ruff check app migrations tests
uv run mypy app
uv run pytest
```

## Migrasi database untuk development

Alembic memakai `DATABASE_DIRECT_URL`, sedangkan request aplikasi memakai `DATABASE_URL`. Pastikan kedua URL menunjuk ke database/branch development yang sama sebelum menjalankan migrasi. Di Windows, runner Alembic memilih `SelectorEventLoop` agar koneksi async psycopg kompatibel.

```powershell
uv run alembic current
uv run alembic upgrade head
```

Head migration saat ini `b7f4c7a1d2e9`. Migration tersebut sudah diterapkan pada database di `DATABASE_DIRECT_URL` lokal, tetapi branch/environment target belum diverifikasi. Untuk migrasi berikutnya, jangan jalankan `upgrade head` terhadap target yang identitasnya belum dipastikan. Migrasi hanya membuat struktur data, bukan data pengalaman/proyek.

## Peta folder penting

```text
Indra/
├── backend/
│   ├── app/api/v1/       # route publik, admin, auth, media
│   ├── app/core/         # konfigurasi dan error
│   ├── app/db/           # engine dan session SQLAlchemy
│   ├── app/models/       # model database
│   ├── app/scripts/      # bootstrap/rotasi admin dan cleanup media
│   ├── migrations/       # Alembic revisions
│   └── tests/            # unit/API/security tests
├── frontend/
│   ├── src/pages/        # halaman Astro publik dan admin
│   ├── src/layouts/      # layout publik/auth
│   ├── src/lib/          # API client/BFF helpers
│   ├── src/scripts/      # progressive enhancement admin/gallery
│   └── src/styles/       # CSS aplikasi
├── docs/
│   ├── 05-quality-and-operations/
│   └── portfolio-terminal/ # spesifikasi dan laporan fase
└── prototype/            # prototype lama; bukan data produksi
```

## Jalur dokumen terkait

- [Panduan admin](admin-guide.md)
- [Runbook operasional](operations-runbook.md)
- [Status integritas konten dan SEO](content-integrity.md)
- [Laporan handoff fase 10](implementation-phase-10-report.md)

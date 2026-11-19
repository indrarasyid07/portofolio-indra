# Portofolio Programmer

Workspace ini menyatukan dua repository: frontend (`portofolio-indra`) dan backend (`portofolio-indra-backend`). Frontend publik memakai Astro SSR dan mengambil konten yang dipublikasikan dari API FastAPI. Halaman publik hanya menampilkan konten berstatus terbit.

| Repository | Folder lokal | Tujuan |
|---|---|---|
| [Frontend](https://github.com/indrarasyid07/portofolio-indra) | `frontend/` dan dokumentasi workspace | Website publik dan panel admin Astro. Root Vercel diarahkan ke `frontend/`. |
| [Backend](https://github.com/indrarasyid07/portofolio-indra-backend) | `backend/` | API FastAPI, migrasi, dan pengujian. |

Clone frontend ke folder kerja, lalu clone repository backend ke dalam folder `backend/`:

```powershell
git clone https://github.com/indrarasyid07/portofolio-indra.git portofolio-indra
cd portofolio-indra
git clone https://github.com/indrarasyid07/portofolio-indra-backend.git backend
```

## Kebutuhan lokal

- Node.js 22.23.4 atau lebih baru dan npm 9.6.5 atau lebih baru. Node `22.23.3` belum memenuhi syarat Astro.
- Python 3.12 dan `uv`; `uv` memilih versi dari `backend/.python-version` dan memasang interpreter terkelola jika belum tersedia.
- Tidak perlu kredensial produksi untuk halaman scaffold atau `/health`.

## Jalankan lokal di PowerShell

Buka dua jendela PowerShell. Jalankan perintah dari root workspace `portofolio-indra`.

### Terminal 1 — backend API

```powershell
cd .\backend
uv sync --locked
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 2 — frontend

```powershell
cd .\frontend
npm ci
npm run dev
```

Buka website di `http://localhost:4321/`. Backend adalah API, bukan website: alamat root `http://127.0.0.1:8000/` memang menjawab 404 karena tidak ada route `/`.

| Tujuan | URL | Keterangan |
|---|---|---|
| Website | `http://localhost:4321/` | Frontend Astro. |
| Liveness API | `http://127.0.0.1:8000/health` | Memastikan proses backend hidup; tidak perlu DB. |
| Readiness API | `http://127.0.0.1:8000/ready` | Mengecek koneksi DB; `503` berarti DB belum siap. |
| Dokumentasi API | `http://127.0.0.1:8000/docs` | Swagger UI lokal. |
| Proxy health frontend | `http://localhost:4321/api/health` | Pemeriksaan melalui dev proxy Astro. |
| Login admin | `http://localhost:4321/admin/login` | Perlu akun yang dibuat lewat bootstrap admin; tidak ada akun/password demo. |

Astro memerlukan Node `22.23.4+`. Periksa `node --version` sebelum `npm ci`. Gunakan Node LTS yang memenuhi syarat; bila baru memasang atau mengganti versi Node, buka PowerShell baru.

Halaman publik: `/`, `/profil`, `/pengalaman`, `/riwayat-pekerjaan`, `/pendidikan`, `/proyek`, `/proyek/[slug]`, `/tech-stack`, dan `/kontak`. Route SSR memakai `API_INTERNAL_URL` yang hanya tersedia di server. Tanpa backend atau data yang dipublikasikan, halaman akan menampilkan status yang sesuai; tidak ada profil atau proyek contoh yang dibuat sebagai konten publik.

## Jalankan lokal di Bash

```bash
# Terminal 1
cd backend
uv sync --locked
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

```bash
# Terminal 2
cd frontend
npm ci
npm run dev
```

## Verifikasi

```powershell
# frontend
cd frontend
npm run check
npm run build

# backend
cd ..\backend
uv run ruff check .
uv run mypy app
uv run pytest
```

Gunakan perintah Bash yang sama dengan separator direktori `/`.

## Environment

Salin `frontend/.env.example` atau `backend/.env.example` menjadi `.env` di folder aplikasi terkait bila perlu mengganti nilai lokal. Berkas `.env` diabaikan Git. Jangan menaruh rahasia pada variabel `PUBLIC_*`; konfigurasi API frontend hanya dipakai server/dev proxy. `DATABASE_URL` belum diperlukan untuk `/health` atau memulai proses backend.

Runtime backend memakai `DATABASE_URL`; migrasi Alembic memakai `DATABASE_DIRECT_URL`. Verifikasi kedua URL menunjuk ke environment yang dimaksud sebelum migrasi atau perubahan konten. Server tidak menjalankan migrasi otomatis. Konten Neon saat ini telah diisi dan dipublikasikan; environment baru tidak mengimpor konten secara otomatis.

Frontend dev mem-proxy `/api/health` ke FastAPI lokal. Route Astro `/api/v1/*` menjadi BFF same-origin untuk login, session, logout, dan `/admin/*`; set `API_INTERNAL_URL` serta `AUTH_PROXY_KEY` di frontend dan kunci yang sama di backend. Set `PUBLIC_SITE_ORIGIN`, `ALLOWED_ORIGINS`, dan `TRUSTED_HOSTS` di backend sesuai domain yang benar-benar dipakai. Deployment dan preview lintas project belum diverifikasi.

## Batas implementasi saat ini

Frontend publik mengambil profil, pengalaman, pendidikan, proyek, tech stack, dan kontak dari API. Admin menyediakan login/session dan CRUD konten, termasuk foto profil serta galeri gambar proyek. Upload memakai presigned POST ke bucket privat Neon; server memeriksa dan mengode ulang gambar, dan API publik hanya mengirim media terkait konten terbit. Koneksi database Neon dan alur upload telah digunakan dari lingkungan lokal; deployment belum dilakukan. Jangan menganggap konten prototipe sebagai fakta publik.

Dokumentasi proyek: [indeks docs](docs/README.md), [onboarding developer](docs/05-quality-and-operations/developer-onboarding.md), [panduan admin](docs/05-quality-and-operations/admin-guide.md), [runbook operasi](docs/05-quality-and-operations/operations-runbook.md), [integritas konten, accessibility, dan SEO](docs/05-quality-and-operations/content-integrity.md), serta [kontrak lintas fase](docs/05-quality-and-operations/cross-phase-contract.md). Laporan fase: [fase 04](docs/portfolio-terminal/implementation-phase-04-report.md), [fase 05](docs/portfolio-terminal/implementation-phase-05-report.md), [fase 06](docs/portfolio-terminal/implementation-phase-06-report.md), [fase 07](docs/portfolio-terminal/implementation-phase-07-report.md), [fase 08](docs/portfolio-terminal/implementation-phase-08-report.md), [fase 09](docs/portfolio-terminal/implementation-phase-09-report.md), dan [fase 10](docs/05-quality-and-operations/implementation-phase-10-report.md). Kontrak admin API: [admin-api-reference.md](docs/portfolio-terminal/admin-api-reference.md).

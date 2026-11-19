# Laporan Audit Implementasi — Fase 00

**Tanggal audit:** 2026-11-19 (Asia/Jakarta)  
**Status:** PARTIAL — audit selesai; keputusan pemilik dan beberapa kontrak masih memblokir fase coding.  
**Scope:** verifikasi root, dokumen, prototipe, kontrak, baseline lokal, dan rujukan platform. Audit ini tidak mengubah source aplikasi.

## 1. Repository dan baseline

- Root yang dilaporkan benar: `D:\Dokumen\Indra\Project Pribadi\Portofolio\Indra`. Folder root berisi `docs/` dan `prototype/`; sibling `Syifa/` tidak disentuh.
- Tidak ada `.git` di root `Indra` maupun direktori induk yang diperiksa. `git status --short --branch`, `git rev-parse`, dan `git log -1` tidak dapat dijalankan sebagai pemeriksaan repository karena Git metadata tidak ditemukan. Branch, HEAD, remote, dan kepemilikan perubahan tidak dapat dibuktikan.
- Root tidak memiliki `package.json`, lockfile npm/pnpm/yarn, `pyproject.toml`, `requirements.txt`, `.gitignore`, atau `.env`. Belum ada aplikasi frontend/backend dan belum ada package manager yang dipakai.
- 14 dokumen di `docs/portfolio-terminal/` ditemukan, tidak kosong, dan dibaca. Seluruh target tautan Markdown relatif di folder tersebut resolve. Sepuluh dokumen lama di `docs/` juga masih ada.
- Proyek tidak memiliki test suite aplikasi untuk baseline. Status: **NOT RUN (audit-only; source aplikasi belum ada)**. Tidak ada klaim build, deploy, atau test aplikasi.

Pohon ringkas:

```text
Indra/
├── docs/
│   ├── 00-overview/ … 07-decisions/     # 10 dokumen lama
│   └── portfolio-terminal/              # 14 dokumen rancangan + laporan ini
└── prototype/                           # versi prototipe lokal yang lebih lama
```

## 2. Dokumen dan keputusan utama

| Area | Keputusan rancangan saat ini | Sumber | Status / ketergantungan |
|---|---|---|---|
| Produk dan bahasa | Situs portofolio programmer berbahasa Indonesia; beranda fokus pada nama, foto, ringkasan, CTA, dan paling banyak satu proyek unggulan. | [02-product-scope-and-ux.md](02-product-scope-and-ux.md), [11-testing-and-acceptance.md](11-testing-and-acceptance.md) | Arah jelas; nama penayangan, foto, dan copy faktual belum disetujui. |
| Frontend | Astro + TypeScript + CSS biasa; SSR/on-demand untuk halaman publik; tanpa React/Tailwind sebagai default. | [03-system-architecture-and-decisions.md](03-system-architecture-and-decisions.md), [04-frontend-design-and-routing.md](04-frontend-design-and-routing.md) | ADR masih diusulkan; perlu persetujuan fase 0 dan pembuktian deployment. |
| Backend/data | FastAPI, Pydantic v2, SQLAlchemy 2 async, Alembic, PostgreSQL Neon. | [03-system-architecture-and-decisions.md](03-system-architecture-and-decisions.md), [05-backend-and-api-contract.md](05-backend-and-api-contract.md), [06-database-schema-and-migrations.md](06-database-schema-and-migrations.md) | Kontrak tanggal dan relasi skill perlu dirapikan sebelum migrasi v1. |
| Deployment | Dokumen memilih dua Vercel Projects dari satu repo sebagai baseline; Vercel Services disebut Private Beta. | [03-system-architecture-and-decisions.md](03-system-architecture-and-decisions.md), [09-deployment-and-environments.md](09-deployment-and-environments.md) | Status Services pada dokumen sudah tertinggal; lihat konflik C1. Perlu Git remote dan pilihan plan/domain. |
| Auth | Satu admin tanpa registrasi; Argon2id; opaque session 256-bit di cookie HttpOnly; CSRF + Origin check di backend; PostgreSQL untuk session/rate limiting. | [07-auth-security-and-threat-model.md](07-auth-security-and-threat-model.md) | Rancangan masuk akal, tetapi sesi, throttle, deployment origin, dan beberapa istilah hashing perlu satu kontrak final. |
| Media | Metadata di Postgres, file di object storage, gambar diverifikasi dan disanitasi, media draft tidak boleh terbuka. | [08-media-upload-and-storage.md](08-media-upload-and-storage.md) | Mekanisme private/public bucket atau signed read URL belum dibuktikan; spike diperlukan sebelum fase upload. |
| Data | Seed/ilustrasi prototipe bukan fakta biografi dan tidak boleh masuk production. Data publik hanya `published`. | [10-migration-and-content-strategy.md](10-migration-and-content-strategy.md), [13-operations-risks-and-open-questions.md](13-operations-risks-and-open-questions.md) | Tidak ada data/foto/CV/proyek faktual yang disetujui untuk publikasi. Empty state harus dipakai sampai konten tersedia. |
| UX/kualitas | Tiap route punya hierarki sesuai kontennya; aksesibilitas WCAG 2.2 AA, keyboard, reflow, error/empty states, SEO dan performa diukur. | [04-frontend-design-and-routing.md](04-frontend-design-and-routing.md), [11-testing-and-acceptance.md](11-testing-and-acceptance.md) | Target/rencana, belum hasil implementasi atau pengujian. |

## 3. Audit prototipe

Rujukan terbaru yang ditetapkan dokumen adalah `C:\Users\indra\Downloads\indra-terminal-portfolio`. Folder ini berisi 11 halaman HTML, empat JS/CSS utama, empat SVG, dan README. `Indra/prototype/` adalah versi lain yang lebih lama: satu `index.html` dengan `app.js`, `styles.css`, `data.js`, `admin.js`, README, dan aset. Hash berkas kedua versi berbeda; jangan menganggap keduanya identik. Dokumen [01-reference-audit.md](01-reference-audit.md) sudah membedakan keduanya.

| Halaman sumber | Route target | Perilaku dan catatan migrasi |
|---|---|---|
| `index.html` (`home`) | `/` | Nama, ringkasan, terminal visual, CTA, proyek unggulan dan tautan proyek lain. Beranda tetap ringkas. |
| `profil.html` (`profile`) | `/profil` | Profil editorial dan tautan CV opsional; konten masih contoh. |
| `pengalaman.html` (`experience`) | `/pengalaman` | Perspektif cara kerja/kontribusi dari data pengalaman yang sama. |
| `riwayat-pekerjaan.html` (`jobs`) | `/riwayat-pekerjaan` | Timeline kronologis lengkap dari sumber pengalaman yang sama. |
| `pendidikan.html` (`education`) | `/pendidikan` | Memuat formal, kursus, dan sertifikasi; pemisahan section/route masih keputusan produk Q5. |
| `proyek.html` (`projects`) | `/proyek` | Indeks proyek; prototype memakai filter/galeri dan data seed. |
| `detail-proyek.html` (`detail`) | `/proyek/{slug}` | Ganti query `?id=` prototype dengan slug stabil, metadata SSR, dan 404 untuk draft/tidak ada. |
| `tech-stack.html` (`tech`) | `/tech-stack` | Daftar stack umum; hubungan ke stack proyek perlu kontrak yang disepakati. |
| `kontak.html` (`contact`) | `/kontak` | Form hanya merakit `mailto:`; tidak mengirim atau menyimpan pesan ke server. |
| `login.html` | `/admin/login` | Kredensial demo berada di sisi klien; hapus pada implementasi. |
| `admin.html` | `/admin/*` | CRUD lokal, impor/ekspor JSON, reset seed, dan upload ke data URL/localStorage. Semua operasi harus diganti API server yang terotorisasi. |

Visual yang layak dipertahankan: charcoal/hijau gelap, aksen lime yang hemat, serif editorial + sans isi + monospace metadata, garis halus dan ritme berbeda per halaman. Tidak semua halaman perlu panel terminal. Skip-link, focus-visible, label, `details`, dan `prefers-reduced-motion` sudah tampak sebagian pada source dan perlu diuji ulang di aplikasi. CSS memakai breakpoint 1100/850/650 px; nilai akhir harus ditentukan lewat pemeriksaan browser. Preview SVG dan portrait placeholder adalah ilustrasi, bukan aset portofolio nyata.

Interaksi browser-only yang wajib diganti: `localStorage` untuk konten, `sessionStorage` sebagai guard login, username/password demo `admin`/`demo2026`, screenshot sebagai JPEG data URL, JSON import/export/reset, dan form kontak `mailto:`. Prototype tidak menyediakan autentikasi atau penyimpanan server yang aman. File localStorage di browser pengguna tidak dapat dibuktikan dari folder ini; jika ada data personal, pemilik perlu ekspor manual sebelum migrasi.

## 4. Kontrak lintas komponen

- **Route publik:** `/`, `/profil`, `/pengalaman`, `/riwayat-pekerjaan`, `/pendidikan`, `/proyek`, `/proyek/{slug}`, `/tech-stack`, `/kontak`.
- **Route admin:** `/admin/login`, `/admin/*`; route admin harus SSR, noindex, no-store, dan memvalidasi session di server.
- **API:** prefix `/api/v1`; publik: profile, experiences, education, projects, project detail, skills, contact. Admin: auth, dashboard, profile, projects, experiences, education, skills, media upload/order/cover/delete. Detail endpoint ada di [05-backend-and-api-contract.md](05-backend-and-api-contract.md).
- **Data:** profile singleton; projects, experiences, education records, skill categories/skills; project images/media; project-skill join; admin users/sessions; login attempts; optional audit events. Satu `experiences` collection mendukung dua tampilan kerja.
- **Publication:** publik hanya menerima entri published dan media ready; draft/tidak ditemukan sama-sama 404 untuk detail; cache awal no-store agar publish/unpublish tidak bocor atau stale.
- **Browser auth:** browser memakai origin publik yang sama `/api/*`; proxy menuju API. Cookie host-only `__Host-portfolio_session`; semua write wajib backend auth, CSRF, dan exact Origin.
- **Deployment:** dua Vercel Projects adalah fallback yang tetap mungkin. Services saat ini tercantum sebagai Beta di semua plan; evaluasi sebagai opsi, tetapi jangan menganggap akses/fitur tersedia pada akun sebelum diuji.
- **Object storage:** Neon Object Storage adalah kandidat; alur upload, draft privacy, signed URL dan pemisahan bucket belum dibuktikan.

## 5. Konflik dan rekomendasi

| ID / prioritas | Temuan | Sumber dan dampak | Rekomendasi | Status |
|---|---|---|---|---|
| C1 — High | Status Vercel Services tidak mutakhir. ADR/deployment menyebut Private Beta dan akses berdasarkan permintaan. Dokumentasi Vercel yang diperiksa 2026-11-19 menyebut Services Beta di semua plan; blog resmi menyebut public beta (30 Jun 2026). | [03](03-system-architecture-and-decisions.md), [09](09-deployment-and-environments.md); memengaruhi topologi serta kerumitan preview/origin. | Revisi status/sumber pada dokumen berikutnya. Pertahankan dua Projects sebagai opsi fallback, dan lakukan spike Services hanya setelah pemilik memilih topologi serta akun mengizinkan konfigurasi. | Pemilik perlu menyetujui topology; status faktual terverifikasi. |
| C2 — High | Format tanggal pengalaman/pendidikan tidak tunggal. Bagian definisi tabel pada schema memakai `start_date/end_date`, sedangkan ERD dan dictionary memakai `start_year/start_month/end_year/end_month`; API belum menyebut bentuk payload tanggal secara eksplisit. | [05](05-backend-and-api-contract.md), [06](06-database-schema-and-migrations.md), Q7 di [13](13-operations-risks-and-open-questions.md); berisiko membuat API dan migrasi berbeda. | Bekukan satu bentuk. Rekomendasi: tahun + bulan nullable karena dokumen melarang mengarang hari; tampilan jangan menyiratkan tanggal yang tidak diketahui. | Blocking sebelum schema/API v1. |
| C3 — Medium | Session digest disebut SHA-256 pada diagram login, tetapi HMAC-SHA-256 pada rancangan session dan skema DB. | [06](06-database-schema-and-migrations.md), [07](07-auth-security-and-threat-model.md); implementasi dan rotasi key harus seragam. | Pilih eksplisit satu algoritme/format digest dan key-version policy; perbarui diagram, schema dan tests bersama. | Blocking sebelum fase auth. |
| C4 — High | Kebijakan relasi project-skill belum konsisten: API hanya mengekspos association jika skill juga published, sedangkan schema mempertimbangkan snapshot label yang tetap tampil setelah skill diubah/unpublish/dihapus. | [05](05-backend-and-api-contract.md), [06](06-database-schema-and-migrations.md), Q8 di [13](13-operations-risks-and-open-questions.md); perubahan katalog umum dapat mengubah studi kasus lama. | Pemilik memilih apakah stack historis proyek memakai snapshot independen atau mengikuti status skill umum. Samakan FK/delete behavior, query publik dan admin. | Blocking sebelum schema/API v1. |
| C5 — High | Kebijakan media publik memakai private bucket dan route byte dengan pemeriksaan status publish. Neon presigned POST/CORS didukung dokumentasi; tetapi branch akun belum dipastikan nonproduksi, level akses bucket belum diverifikasi, dan CORS saat ini wildcard. | [08](08-media-upload-and-storage.md), [13](13-operations-risks-and-open-questions.md), Q12; konfigurasi wildcard atau target branch yang salah bisa membuat preview tidak aman. | Ganti CORS hanya di bucket staging dengan origin tepat; lakukan disposable upload/publish/unpublish/cleanup dan verifikasi access level di Console/API sebelum aktivasi. | Kode lokal fase media selesai; blocking bukti nonproduksi/aktivasi storage. |
| C6 — Medium | Route kursus/sertifikasi masih berubah antara satu `/pendidikan` dengan section dan route `/pembelajaran` terpisah. | [02](02-product-scope-and-ux.md), Q5 di [13](13-operations-risks-and-open-questions.md); memengaruhi navigasi, bukan model kind. | MVP dapat memakai `/pendidikan` dengan section formal/kursus/sertifikasi; pecah route jika pemilik memilih. | Keputusan boleh menunggu sebelum routing final. |
| C7 — High | Tidak ada Git repository. | Status root dan semua parent yang diperiksa; [12](12-implementation-roadmap.md), Q1 di [13](13-operations-risks-and-open-questions.md). Tanpa repo/remote, baseline perubahan dan workflow deploy dari Git tak tersedia. | Pemilik memutuskan apakah `Indra` diinisialisasi/dihubungkan ke Git. Jangan init atau push tanpa instruksi eksplisit. | Blocking untuk alur deploy; tidak menghambat penyelesaian audit. |

## 6. Sumber platform yang dicek

Diakses 2026-11-19. Tautan platform harus dicek lagi ketika akun dan layanan dipilih.

| Claim yang diperiksa | Hasil | Sumber resmi |
|---|---|---|
| Vercel Python runtime dan status | FastAPI/ASGI didukung; blog resmi 15 Okt 2026 mengumumkan Python GA. Halaman runtime masih memuat banner Beta bertanggal 30 Jan 2026, jadi halaman runtime tertinggal dari pengumuman GA. Versi yang tercantum pada docs runtime: Python 3.12 default, 3.13, 3.14; bundle standar 500 MB. | [Python runtime](https://vercel.com/docs/functions/runtimes/python), [pengumuman GA](https://vercel.com/blog/python-on-vercel-is-now-generally-available) |
| Vercel Services | Dokumen Services menyatakan Beta di semua plan; pengumuman resmi menyebut public beta pada 30 Jun 2026. Availability akun/proyek tetap harus dibuktikan. | [Services docs](https://vercel.com/docs/services), [pengumuman Services public beta](https://vercel.com/blog/vercel-services-run-full-stack-on-vercel) |
| Vercel Hobby | Terms membatasi penggunaan Hobby untuk personal/non-commercial. Pemilik perlu memastikan bentuk pemakaian situs sesuai plan; audit tidak membuat keputusan legal. | [Vercel Terms, Hobby Plan](https://vercel.com/legal/terms), [Hobby plan](https://vercel.com/docs/plans/hobby) |
| Neon region/object storage/plans | Singapore `aws-ap-southeast-1` mencantumkan Postgres dan Object Storage; Free Object Storage 5 GB/project. Neon docs juga mencantumkan Free Postgres 100 CU-hours/project, 1 GB/project, 5 GB transfer/project, restore 6 jam, serta pooled PgBouncer transaction mode. | [Regions](https://neon.com/docs/introduction/regions), [Object Storage](https://neon.com/docs/storage/overview), [plans](https://neon.com/docs/introduction/plans), [connection pooling](https://neon.com/docs/connect/connection-pooling) |
| Astro SSR on Vercel | SSR membutuhkan adapter Vercel; output statis tidak memberi render konten request-time. | [Astro Vercel deployment](https://docs.astro.build/en/guides/deploy/vercel/) |

## 7. Keputusan pemilik yang menahan coding

1. Konfirmasi `Indra` sebagai scope dan putuskan apakah repository perlu diinisialisasi/dihubungkan ke Git (Q1).
2. Pilih domain/brand URL dan kisaran biaya/plan; konfirmasi apakah penggunaan cocok dengan Vercel Hobby (Q2–Q3).
3. Setujui topologi deployment, termasuk apakah mencoba Services Beta atau memakai dua Projects sebagai fallback.
4. Setujui konten yang boleh dibuka ke publik: nama penayangan, role/bio, foto, CV, email/link kontak, proyek, pekerjaan, pendidikan, dan izin aset (Q4, Q12). Belum ada fakta seed yang layak dipublikasikan.
5. Putuskan pertanyaan produk yang berdampak ke kontrak: pembelajaran satu halaman atau terpisah (Q5), inbox kontak atau mailto (Q6), presisi periode pengalaman (Q7), dan relasi stack proyek (Q8).
6. Sepakati session TTL/MFA dan siapa/lokasi/cadence backup (Q9–Q10) sebelum auth/production operations.
7. Konfirmasi apakah localStorage prototipe pernah diedit dengan data sendiri; ekspor dilakukan oleh pemilik dari browser terkait, bukan dari source folder (Q11).

## 8. Quality gate fase 00

| Kriteria | Status | Bukti |
|---|---|---|
| Root benar dan di luar scope tidak disentuh | PASS | Root `Indra` terverifikasi; `Syifa` tidak diinspeksi atau diubah. |
| Git baseline dan perubahan milik pengguna terlindungi | BLOCKED | Tidak ada `.git`; status/branch/HEAD tidak dapat dibuktikan. Tidak ada file yang diubah sebelum laporan ini. |
| 14 dokumen dicek | PASS | Semua file ada, tidak kosong, isi dibaca; tautan relatif resolve. |
| 11 halaman prototype dipetakan | PASS | Tabel route di laporan ini; source Downloads tersedia. |
| Seed contoh dibedakan dari fakta | PASS | `data.js` menandai `sample: true`; README menyatakan data/ilustrasi contoh. |
| Stack/deployment dirujuk ke dokumen aktual | PARTIAL | Rancangan diringkas; status Vercel Services perlu revisi sumber dan persetujuan topologi. |
| Konflik dan rekomendasi tercatat | PASS | C1–C7 dicatat di atas. |
| Kode aplikasi berubah | PASS | Tidak ada source aplikasi yang dibuat atau diubah. |
| Tes aplikasi | NOT RUN | Audit-only; belum ada aplikasi atau test suite. |
| Backup sebelum migrasi data real | NOT APPLICABLE | Belum ada DB/data produksi atau migrasi; backup/export wajib sebelum fase import nanti. |

**Status akhir:** PARTIAL / READY FOR REVIEW. Audit fase 00 selesai; coding belum layak dimulai sampai keputusan blocking pada bagian 7 dan kontrak C2/C4 disepakati. Laporan ini adalah satu-satunya file baru; dokumen sumber dan prototipe tetap dipertahankan.

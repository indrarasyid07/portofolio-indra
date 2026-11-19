# QA Report — Fase 08: QA, SEO, dan Aksesibilitas

Tanggal: 2026-11-19  
Lingkungan: lokal, frontend Astro di `http://127.0.0.1:4321`; backend API dan data staging tidak tersedia.  
Status: **Lulus untuk pemeriksaan lokal; belum menjadi persetujuan rilis produksi.**

## Ringkasan perubahan

- Menambahkan kartu Open Graph/Twitter PNG 1200×630 sebagai gambar cadangan, lalu menampilkan metadata sosial pada halaman publik.
- Sitemap hanya menambahkan `/profil` dan `/kontak` saat endpoint publik terkait mengembalikan konten terbit. Detail proyek tetap berasal dari daftar proyek publik.
- Menghapus elemen `<main>` bertingkat pada halaman 404 dan respons proyek yang tidak tersedia. `AppLayout` kini menjadi satu landmark utama.
- Menaikkan kontras token border yang dipakai kontrol dan input, termasuk tombol keluar, pagination, field gambar, dan tombol status/danger.

## Matriks pemeriksaan

| Area | Hasil | Bukti / batas pemeriksaan |
|---|---|---|
| Astro diagnostics | Lulus | `npm run check`: 0 error, 0 warning, 0 hint. |
| Build frontend | Lulus | `npm run build`: output server Astro/Vercel berhasil dibuat. Node v24.22.1 dipakai; Node bawaan v22.23.3 tidak memenuhi minimum Astro `>=22.23.4`. |
| Dependency audit frontend | Lulus | `npm audit --omit=dev`: 0 vulnerabilities. Dependensi produksi diperiksa; audit ini tidak mencakup dependensi pengembangan. |
| Backend lock/lint/type | Lulus | `uv lock --check`, `uv run ruff check app migrations tests`, `uv run mypy app`; mypy memeriksa 31 file. |
| Backend test suite | Lulus | `uv run pytest`: 37 passed. Database staging tidak disentuh. |
| HTTP smoke test | Lulus sebagian | Home, profil, login admin, robots, sitemap, dan URL acak merespons masing-masing 200/200/200/200/200/404. Browser lokal juga menampilkan satu landmark `main` dan tautan skip-to-content. |
| Metadata dan aset | Lulus | `/admin/login` dan 404 memiliki `noindex,nofollow`; `/og-default.png` merespons 200 dengan `image/png`; semua route SSR mengirim `private, no-store`. |
| Sitemap fail-closed | Lulus | Saat backend tidak tersedia, sitemap tidak memasukkan `/profil` atau `/kontak`; hanya route statis dan proyek yang benar-benar dikembalikan endpoint publik yang bisa ditambahkan. |
| Draft/published dan akses langsung detail | Belum dapat diverifikasi end-to-end | URL proyek acak merespons 503 karena API tidak tersedia; jadi status 404 untuk draft/unpublished dan 200 untuk proyek published belum dibuktikan terhadap database staging. Implementasi API publik memfilter proyek berdasarkan status published. |
| CRUD admin, session, media | Belum dapat diuji integrasi | Memerlukan API, akun admin uji, database, serta bucket staging. Tidak ada login, perubahan data, atau upload yang dilakukan. |
| Keyboard, zoom, reflow 320–390 px | Sebagian | Struktur skip link, label, landmark, breakpoint, dan `prefers-reduced-motion` diperiksa. Uji manual lengkap keyboard dan zoom 200%/400% belum dilakukan. |
| Performa / LCP / SSR | Belum terukur | Belum ada deployment atau data produksi yang dapat diukur. Tidak ada skor Lighthouse atau klaim performa dibuat. |
| Caching | Terkonfigurasi konservatif | Halaman SSR dan sitemap memakai `private, no-store` untuk mencegah cache konten personal/status lama. Ini menonaktifkan cache bersama; dampak TTFB belum diukur. |

### Smoke test HTTP lokal

| URL | Status | Metadata |
|---|---:|---|
| `/` | 200 | Gambar sosial cadangan `og-default.png` tersedia. |
| `/profil` | 200 | Satu `<main>` dari layout aplikasi. |
| `/proyek/qa-draft-check` | 503 | API tidak tersedia; hasil ini bukan bukti respons untuk draft/unpublished. |
| `/admin/login` | 200 | `noindex,nofollow`. |
| `/robots.txt` | 200 | Membatasi `/admin` dan `/api`, serta menunjuk sitemap. |
| `/sitemap.xml` | 200 | Route tersedia; daftar konten dinamis bergantung API. |
| `/this-route-does-not-exist` | 404 | `noindex,nofollow`, satu `<main>`. |

## Aksesibilitas dan temuan kontras

Bahasa dokumen menggunakan `id`; layout memiliki skip link, label navigasi, satu landmark utama, gaya fokus `:focus-visible`, dan aturan `prefers-reduced-motion`. Label input login terhubung eksplisit ke field dan status login memakai `aria-live`.

Rasio warna teks yang dihitung secara lokal: teks redup `#A3B0A0` pada kanvas `#0E140F` = **8.24:1**, teks sekunder `#8B9B89` = **6.35:1**, aksen `#C5EF7C` = **14.22:1**, dan warna error `#F1A49D` = **9.36:1**. Semua melebihi ambang 4.5:1 untuk teks normal WCAG 2.2 AA. Token border kuat baru `#5C7458` mencapai **3.26:1** di atas permukaan `#172017` dan **3.52:1** di atas field `#111811`; ini memenuhi ambang 3:1 untuk indikator antarmuka yang diperlukan. Ambang tersebut merujuk ke [WCAG 2.2 SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum) dan [SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast).

## Temuan terbuka sebelum gerbang produksi

1. Jalankan ulang skenario publik/admin terhadap staging: login/logout, CRUD, konflik versi, validasi negatif, pemisahan draft/published, direct URL, dan upload/media.
2. Uji keyboard end-to-end termasuk menu mobile, formulir admin, dialog/konfirmasi, serta status error/sukses.
3. Uji zoom 200% dan 400%, reflow 320–390 px, pembaca layar, serta audit otomatis WCAG pada halaman publik dan admin.
4. Verifikasi bucket private dan CORS storage untuk origin frontend yang benar. Aktivasi upload tetap mengikuti gerbang fase 07; belum ada objek atau pengaturan bucket yang diubah dalam fase ini.
5. Ukur LCP, ukuran aset/JavaScript, dan SSR latency pada deployment staging. Jangan menafsirkan hasil lokal sebagai angka produksi.

## Pemeriksaan keamanan statis

- File konfigurasi lokal `.env*` diabaikan oleh `.gitignore`; keberadaannya dicek tanpa membaca atau menampilkan nilainya.
- Pencarian `innerHTML`, `outerHTML`, `document.write`, dan `eval(` di `frontend/src` serta `backend/app` tidak menemukan pola injeksi DOM mentah.
- Review kode menemukan header keamanan pada layout, `TrustedHostMiddleware`, daftar origin CORS tanpa wildcard, cookie sesi `HttpOnly`/`SameSite=Strict`, dan pemeriksaan CSRF pada endpoint mutasi. Ini adalah review kode lokal, bukan penetration test.

## Keputusan

Tidak ditemukan regresi Critical/High dalam pemeriksaan kode dan lingkungan lokal yang tersedia. Namun pemeriksaan integrasi dan aksesibilitas manual di atas masih terbuka, sehingga laporan ini **bukan sertifikasi WCAG penuh atau persetujuan deploy**. Tidak ada deployment produksi.

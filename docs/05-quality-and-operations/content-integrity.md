# Integritas konten, accessibility, dan SEO

## Status fakta dan placeholder

| Record/fakta | Status | Tindakan |
|---|---|---|
| Nama publik | **Perlu verifikasi pemilik**. `Indra Rasyid` muncul di dokumen awal sebagai label pemilik, tetapi belum ada bukti persetujuan nama tampilan publik pada implementasi. | Konfirmasi ejaan/nama sebelum publish profil. |
| Foto, role, headline, deskripsi profil, lokasi, availability, kontak, CV | **Belum diverifikasi**. | Minta file/isi final; jangan membuat foto atau klaim. Lokasi/kontak/CV opsional. |
| Pengalaman kerja, pendidikan, course, sertifikasi | **Belum diverifikasi**. | Masukkan hanya riwayat dan tanggal yang disetujui pemilik; jangan menebak tanggal atau kredensial. |
| Proyek, hasil, peran, tech stack, tautan/demo | **Belum diverifikasi**. | Pastikan izin klien/brand/screenshot dan hapus rahasia sebelum menerbitkan. |
| Skills/tools umum | **Belum diverifikasi**. | Hanya tampilkan tools yang memang ingin dicantumkan pemilik. |
| Placeholder/fallback UI | Copy generik seperti “Portofolio programmer” dan “foto profil belum tersedia” adalah keadaan UI, bukan data personal. | Jangan memindahkan placeholder menjadi record published. |
| Prototype lama | Ada SPA placeholder di `prototype/` dan prototype multi-halaman demo di `C:\Users\indra\Downloads\indra-terminal-portfolio`; keduanya bukan sumber data aplikasi dan belum diimpor. | Perlakukan semua fixture, SVG preview, foto placeholder, screenshot dan copy contoh sebagai bahan desain saja sampai pemilik mengonfirmasi. Lihat [audit perbandingan prototype](../portfolio-terminal/01-reference-audit.md#rekonsiliasi-referensi-prototipe-dan-file-lokal). |
| Data database saat ini | Pada 2026-11-19 setelah migration, endpoint publik pengalaman merespons `200` dengan nol record pada koneksi aplikasi yang terkonfigurasi. Identitas branch/environment belum diverifikasi; koleksi lain tidak diperiksa. | Jangan simpulkan database kosong secara keseluruhan. Verifikasi branch aman, lalu review tiap daftar publik/admin sebelum rilis. |

Belum ada record biografi yang dinyatakan **terverifikasi/published** dalam handoff ini. Ini bukan klaim bahwa database remote kosong.

## Pemeriksaan SEO setelah konten berubah

1. Buka halaman publik dan pastikan title, description, canonical memakai URL deployment yang benar.
2. Cek preview link melalui `og:title`, `og:description`, `og:url`, `og:image`; fallback local `/og-default.png` 1200×630 dipakai jika foto/cover tidak diberikan.
3. Pastikan gambar punya alt text yang spesifik; pada publish API menolak media terkait yang belum memenuhi alt text. Dekoratif tidak diberi deskripsi yang membingungkan.
4. Buka `/sitemap.xml`; daftar hanya boleh mencakup halaman serta proyek terbit. Profil/kontak dinamis masuk saat endpoint public tersedia. Draft tidak boleh muncul.
5. Pastikan `/admin/login`, admin dan 404 mempunyai `noindex`; `/robots.txt` melarang `/admin` dan `/api` serta menunjuk sitemap.
6. Buka published project direct URL, lalu pastikan draft/unpublished mengembalikan 404/noindex; hasil ini belum diuji di staging.
7. Cek URL demo/repository/credential proof ke tujuan yang tepat, HTTPS, no broken link, dan jangan menerbitkan private drive links.
8. Setelah unpublish media, cek public route dan ingat bytes yang pernah di-cache dapat bertahan sampai TTL browser habis.

## Pemeriksaan accessibility setelah perubahan

Gunakan navigasi keyboard untuk menu, seluruh tautan dan form admin; periksa visible focus dan tidak ada keyboard trap. Uji browser zoom 200% dan 400%, viewport 320–390 px, reflow, alt/name pada kontrol, error/status announcement, dan reduced-motion. Pemeriksaan fase 08 meluluskan beberapa static/local checks, tetapi belum merupakan sertifikasi WCAG dan belum menguji zoom/keyboard end-to-end.

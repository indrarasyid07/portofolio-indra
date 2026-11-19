# Laporan Implementasi Fase 04 — Frontend Publik

Tanggal: 2026-11-19  
Status: **IMPLEMENTED — pemeriksaan Astro dan build lulus; verifikasi dengan data API terbit menunggu backend/database siap**

## Implementasi

- Mengganti satu halaman scaffold Astro dengan route SSR terpisah: beranda, profil, pengalaman, riwayat pekerjaan, pendidikan, indeks/detail proyek, tech stack, kontak, dan 404.
- Menggunakan satu wrapper API server-side bertipe dengan timeout 4,5 detik, `cache: no-store`, dan pesan error generik. `API_INTERNAL_URL` tidak diberi awalan `PUBLIC_` dan tidak dimasukkan ke HTML.
- Menambah layout dan komponen pengantar/status bersama. Halaman tetap merender teks di server; hanya menu navigasi yang memakai JavaScript kecil. Menu dapat ditutup via Escape dan setelah link dipilih.
- Mempertahankan identitas editorial-terminal melalui palet gelap hijau/lime, serif untuk judul, sans untuk isi, monospace untuk path dan metadata, tanpa scanline atau animasi wajib. Layout memiliki state desktop, tablet, dan mobile.
- Profil/foto, pengalaman, riwayat pendidikan, proyek, skill, dan kontak berasal dari endpoint publik. Placeholder prototype tidak dipakai sebagai fakta. Beranda menyembunyikan bagian ringkasan atau proyek pilihan ketika datanya kosong.
- Detail slug tidak ditemukan menghasilkan 404 tanpa canonical; ketika API tidak tersedia menghasilkan 503 dan `noindex`. Sitemap memuat route publik dan slug yang dikembalikan endpoint proyek; `robots.txt` mengecualikan `/admin` dan `/api`.
- Seluruh dokumen berbahasa Indonesia, `lang="id"`, title/description/canonical/OG unik per route, alt text dari API, skip link, focus-visible, serta reduced motion.

## Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `npm run check` dengan Node 24.22.1 | PASS — 18 file, 0 error/warning/hint |
| `npm run build` (Astro SSR + Vercel adapter) | PASS |
| Kontras teks utama, muted, subtle, aksen tombol, dan bingkai kuat | PASS — masing-masing 15.63:1, 7.39:1, 5.69:1, 14.22:1, 3.26:1 |
| Preview browser: beranda, menu mobile, tautan menuju proyek, empty/error state proyek | PASS secara visual dan accessibility tree |
| Request route publik, sitemap, robots | PASS — semua halaman statis mengembalikan 200 |
| Detail slug tak dikenal saat backend tidak aktif | Tidak dapat menguji perilaku API 404; request saat ini menghasilkan state layanan 503 |

## Batas verifikasi dan langkah berikutnya

- Node default mesin `22.23.3` berada sedikit di bawah persyaratan Astro `>=22.23.4`. Pemeriksaan dijalankan dengan runtime Node 24.22.1 yang tersedia di mesin; tidak ada dependency proyek yang diubah.
- Backend API tidak dijalankan dalam pemeriksaan browser dan database development belum memiliki konten terbit. Karena itu published/unpublish, foto publik, SEO image, serta tiap tampilan berisi konten belum dapat diverifikasi end-to-end. Tidak ada seed atau perubahan ke Neon dalam fase ini.
- Preview browser menunjukkan state mobile default dan menu, tetapi ukuran 360/390/768/1280 CSS px belum disimulasikan satu per satu.
- Deployment harus menetapkan `API_INTERNAL_URL` dan `SITE_URL` di environment server. Nilai lokal saja tidak mengatur konektivitas Vercel ke backend.
- Login, admin, editor konten, upload media, dan form kontak transaksional tetap untuk fase lanjutan.

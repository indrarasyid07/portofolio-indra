# Laporan Implementasi Fase 06 — Admin CRUD

## Status: BLOCKED untuk penerimaan UI browser lintas layanan

Implementasi CRUD lokal selesai dan tes API lulus. **BLOCKED** hanya berlaku untuk penerimaan end-to-end di browser pada deployment: belum ada domain preview dan Neon belum dimigrasikan, jadi cookie/session melalui BFF, query PostgreSQL, dan perubahan yang terlihat di situs deployment belum dapat diverifikasi bersama.

## Yang dibangun

- API admin FastAPI untuk ringkasan database, profil/kontak publik, proyek, pengalaman, pendidikan, kategori tech stack, dan item tech stack. Seluruh route baca memerlukan session; mutasi memerlukan session, Origin exact, CSRF, JSON, dan batas ukuran request.
- Schema request memakai field whitelist dan validasi slug, URL HTTPS, enum, panjang teks, tahun/bulan, serta relasi tech stack. Tidak ada field admin/session/object-key yang dapat dimass-assign.
- Create dimulai sebagai draft. Publish dan unpublish menjadi route eksplisit, sehingga perubahan status selalu tervalidasi dan `published_at` konsisten. Query publik tetap menjadi sumber tampilan; satu entity pengalaman dipakai kedua halaman publik.
- Update/publish/delete memakai `expected_updated_at` dan row lock. Versi lama mendapat `409 conflict`, sehingga simpanan editor tidak saling menimpa tanpa diketahui.
- Proyek dapat disimpan tanpa gambar; UI menyatakan pengelolaan gambar menyusul. Tech stack per proyek disimpan melalui relasi dan snapshot label. Penghapusan kategori/tech stack yang masih direferensikan ditolak.
- Halaman admin `/admin`, `/admin/profil`, `/admin/proyek`, `/admin/pengalaman`, `/admin/pendidikan`, dan `/admin/tech-stack` memakai API same-origin; tidak menggunakan `localStorage`. Ada pencarian/filter, pagination, editor, validasi browser, error/pending/success state, konfirmasi publikasi/penghapusan, dan guard perubahan belum tersimpan.
- Tampilan tabel bergulir pada layar sempit; form menyusun ulang kolom pada mobile; navigasi, tombol, fokus keyboard, status screen reader, dan noindex/no-store disediakan.

## Verifikasi lokal

- Backend `ruff check app migrations tests` — lulus.
- Backend `mypy` — lulus, 27 file sumber.
- Backend `pytest` — **30 tes lulus**, termasuk draft → publish → unpublish, endpoint publik, URL tak aman, konflik slug, optimistic concurrency, session anonymous/expired, email publik, pengalaman satu sumber, serta hubungan project-stack.
- Frontend `npm run check` — lulus, 25 file, tanpa error/warning/hint.
- Frontend `npm run build` — production build Astro/Vercel lulus.

Tes backend memakai SQLite in-memory untuk jalur API. Tes tidak membuktikan locking PostgreSQL lintas transaksi, constraint/partial index pada Neon, atau interaksi BFF dan cookie di browser deployment.

## Batas yang disengaja

- Tidak ada migration baru karena fase ini memakai skema domain yang telah tersedia.
- Tidak ada koneksi, migration, seed, atau bootstrap ke Neon.
- Upload foto/screenshot, crop, library media, dan penyimpanan object permanen tetap menunggu fase 07.
- CRUD berupa hapus permanen setelah konfirmasi; relasi media tidak ikut dihapus. Entitas dengan referensi tech stack dilindungi dari penghapusan.
- File referensi lama `admin.html`/`assets/admin.js` tidak ada di monorepo yang diperiksa; UI dibuat pada route Astro baru dengan tema gelap/terminal yang sudah dipakai proyek.

Endpoint dan schema saat ini dirinci di [admin-api-reference.md](admin-api-reference.md).

# Laporan Implementasi Fase 07 — Upload Media

## Status: BLOCKED untuk aktivasi storage nonproduksi

Kode lokal dan tes selesai. Bucket `indra` dapat diakses pada `us-east-2`, tetapi tujuan branch belum bisa dipastikan nonproduksi, level akses bucket belum diverifikasi di Neon Console/API, dan CORS yang ada menggunakan wildcard. Upload API kini gagal tertutup sampai `AWS_S3_PRIVATE_BUCKET_CONFIRMED=true`. Tidak ada objek yang diunggah atau diubah. Langkah aktivasi terarah ada di [08-media-upload-and-storage.md](08-media-upload-and-storage.md). Tidak ada deployment production.

## Yang dibangun

- FastAPI menyediakan intent presigned POST selama lima menit dengan batas byte pada policy storage, key UUID yang dibuat server, bucket/credential dari environment backend, MIME allowlist, batas jumlah media proyek, dan auth session + Origin + CSRF.
- Alur completion mengambil objek dengan batas ukuran, memverifikasi hasil decode, format JPEG/PNG/WebP, frame tunggal, dimensi maksimum 8000×8000 dan 40 MP, lalu re-encode tanpa EXIF/GPS. Hasil canonical punya key immutable baru; staging dihapus setelah transaksi berhasil.
- Foto profil dan proyek bisa diupload dari panel admin. Proyek menyimpan draft tanpa gambar. Editor menampilkan preview, progress, status, pembatalan, retry dengan pilih-ulang, alt/caption, sampul, urutan keyboard Naik/Turun, dan hapus dengan konfirmasi.
- API publik mengirim gambar melalui route pemeriksaan publikasi; objek draft menghasilkan 404. Upload API gagal tertutup sampai operator mengonfirmasi private bucket. Admin preview memerlukan session dan `no-store`. Publikasi ditolak jika alt text gambar kosong. Menghapus sampul memilih gambar pertama yang masih ada.
- Frontend Astro BFF mem-proxy endpoint media admin dan route byte publik same-origin. File gambar tidak melewati batas request body Vercel.
- Perintah cleanup dry-run/default dan `--apply` dibangun, dengan cakupan dibatasi pada bucket terkonfigurasi dan prefix `portfolio-media/`.
- Tidak ada migration baru; skema `media_assets`/`project_images` dari fase 02 sudah memadai.

## Pemeriksaan storage tanpa menulis

- `HeadBucket`: berhasil.
- Region yang dikembalikan: `us-east-2`.
- CORS: satu rule, POST diizinkan, wildcard origin ditemukan; origin aplikasi tidak tercantum secara exact.
- Level akses bucket tidak ditebak dari S3; harus dilihat di Console/API Neon. Status branch staging vs production juga belum diketahui.
- Tidak menjalankan `PutObject`, `DeleteObject`, migration, atau konfigurasi CORS.

## Verifikasi lokal

- `uv run ruff check app migrations tests` — lulus.
- `uv run mypy app` — lulus, 31 file sumber.
- `uv run pytest` — 36 tes lulus, termasuk normalisasi raster, MIME palsu, ukuran, format animasi, alur intent/completion melalui adapter storage mock, media draft, dan route publik.
- Frontend `npm run check` — 0 error, 0 warning, 0 hint.
- Frontend `npm run build` — production build Astro/Vercel lulus.
- Tes memakai SQLite dan storage mock; bukan bukti credential, CORS atau upload langsung ke Neon berfungsi.

## Batas dan tindak lanjut sebelum rilis

- Konfirmasi branch/bucket nonproduksi dan `private` access level; ganti wildcard CORS hanya di bucket staging dengan origin yang tepat; uji POST presigned, publish/unpublish dan cleanup end-to-end.
- Jalankan perintah cleanup dalam dry-run pada staging, tinjau kandidat, lalu `--apply` hanya untuk bucket/branch tersebut.
- Repository belum memiliki `.git`; perubahan belum tercatat dalam commit.
- Prototipe `admin.html`/`assets/admin.js` yang disebut prompt tidak ada di repository, dan `prototype/` tidak berisi referensi `images`, `data:image`, atau `base64`; tidak ada data lama untuk dimigrasikan.
- Estimasi kapasitas dan langkah operasional dijelaskan pada dokumen media. Kuota aktual akun belum dibaca.

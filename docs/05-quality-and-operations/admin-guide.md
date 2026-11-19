# Panduan pemilik panel admin

Panduan ini berlaku untuk deployment yang sudah disiapkan. **Belum ada URL deployment, database staging yang tervalidasi, atau akun admin yang sudah diterima lewat browser**. Jangan menganggap halaman admin lokal sebagai CMS produksi.

## Masuk dan keluar

1. Buka `/admin/login` pada origin situs yang disetujui.
2. Masukkan nama pengguna dan kata sandi unik (8–128 karakter). Kata sandi panjang tetap disarankan untuk admin. Login error bersifat generik; status 429 berarti batas percobaan tercapai—tunggu sebelum mencoba lagi.
3. Gunakan menu Keluar pada panel. Logout mencabut sesi server dan menghapus cookie.
4. Sesi tidak aktif berakhir setelah 30 menit; batas absolut saat ini 12 jam. Jika sesi habis saat mengedit, tinjau dan kirim ulang perubahan setelah login, jangan mengandalkan auto-submit.

Tidak ada registrasi publik, reset password melalui website, atau password demo.

Jika akun admin belum pernah dibuat, jalankan bootstrap pertama dari folder `backend` setelah memastikan `DATABASE_URL` menunjuk database/branch yang benar:

```powershell
uv run python -m app.scripts.bootstrap_admin
```

Skrip meminta username dan password secara interaktif; password tidak ditampilkan atau dimasukkan sebagai argumen. Bootstrap akan menolak membuat akun kedua. Di Windows, skrip menggunakan `SelectorEventLoop` agar psycopg async dapat terhubung. Migration tidak membuat akun otomatis.

## Ganti/reset password dengan aman

Jalankan hanya dari terminal privat yang `.env`-nya sudah menunjuk database target yang benar. Jangan menyalin nilai `DATABASE_URL` atau password ke command line/chat. Dari `backend/`:

```powershell
uv run python -m app.scripts.bootstrap_admin --rotate-password
```

```bash
uv run python -m app.scripts.bootstrap_admin --rotate-password
```

Username dan password baru diminta secara interaktif; password tidak ditulis sebagai argumen. Skrip hanya merotasi akun admin tunggal yang sudah terdaftar, memperbarui hash Argon2id, dan mencabut semua sesi aktif. Setelah selesai, login ulang dan cek satu halaman admin read-only. Perintah tanpa `--rotate-password` hanya untuk bootstrap pertama saat belum ada akun.

## Mengelola konten

Menu panel saat ini:

- **Profil** — nama tampil, role, headline, intro, tentang, lokasi/ketersediaan, tautan, dan foto profil.
- **Proyek** — simpan draft dahulu; isi judul, slug, ringkasan, peran, jenis/tahun, konteks, hasil, tautan repo/demo, stack yang dipakai, serta cover/galeri.
- **Pengalaman** — tambah satu record; halaman Pengalaman dan Riwayat Kerja menggunakan sumber pengalaman yang sama.
- **Pendidikan** — pilih jenis pendidikan formal, course, atau sertifikasi; masukkan institusi, rentang waktu, deskripsi, bukti/credential ID bila relevan.
- **Tech stack** — kelola kategori dan skill umum; relasi proyek menyimpan label stack saat ini agar studi kasus lama tetap terbaca.

Alur aman publikasi:

1. Simpan sebagai **Draft** dan tinjau seluruh field serta tautan.
2. Untuk gambar, pilih file JPEG/PNG/WebP maksimal 8 MiB. Tunggu upload dan validasi selesai. Isi alt text yang menggambarkan isi foto; caption bersifat opsional.
3. Atur sampul dan urutan gambar memakai kontrol pada editor. Uji urutan juga dengan tombol keyboard Naik/Turun.
4. Baca pratinjau admin dan pastikan tidak ada data internal, alamat privat, token, screenshot klien tanpa izin, atau teks contoh.
5. Terbitkan hanya setelah fakta/izin disetujui pemilik. Halaman publik memakai status published.
6. Untuk menarik konten, pilih **Unpublish**. Ini menyembunyikan dari route publik/sitemap; media browser yang pernah di-cache dapat bertahan sampai cache lokal kedaluwarsa.
7. Sebelum hard delete, simpan salinan yang memang perlu dipertahankan. Dialog konfirmasi tidak menggantikan backup. Hapus media memakai kontrol admin; jangan hapus objek langsung dari bucket saat masih direferensikan.

Tidak ada “simpan otomatis”. Perubahan hanya berlaku sesudah respons sukses.

## Pemecahan masalah

| Gejala | Makna / tindakan |
|---|---|
| 401 atau diarahkan kembali ke login | Sesi habis/dicabut; login kembali dan periksa perubahan yang belum terkirim. |
| 403 saat menyimpan | Origin/CSRF tidak cocok. Muat ulang halaman dari domain yang benar; jangan menonaktifkan CSRF atau mengizinkan wildcard. |
| 409 konflik versi | Data berubah sejak form dibuka; muat ulang record dan ulangi edit berdasarkan versi terbaru. |
| 422 validasi | Periksa field wajib, slug unik, format URL, rentang tanggal, alt text, dan tipe konten. |
| 429 | Rate limit login/upload; berhenti mencoba berulang dan tunggu jeda yang ditampilkan. |
| 503 | API, database, atau storage sementara tidak tersedia. Jangan ulangi operasi berulang kali; cek `/health`, `/ready`, log berdasarkan request ID, dan status Neon/Vercel. |
| Upload tidak tersedia | Gerbang upload masih tertutup sampai bucket privat dan CORS origin exact lolos verifikasi. Jangan ubah `AWS_S3_PRIVATE_BUCKET_CONFIRMED` untuk melewati gerbang. |
| Gambar tidak terlihat publik | Cek alt text, status publish parent, media state, response route publik, dan referensi asset. Jangan kirim URL staging/private ke publik. |

Detail autentikasi dan kontrak endpoint tersedia pada [threat model](../portfolio-terminal/07-auth-security-and-threat-model.md) dan [admin API](../portfolio-terminal/admin-api-reference.md).

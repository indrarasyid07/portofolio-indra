# Kebutuhan Panel Admin

**Status:** Draft awal

## Tujuan

Pemilik mengelola isi situs melalui antarmuka admin, tanpa mengubah HTML atau kode sumber untuk pembaruan konten rutin.

## Kemampuan awal

- Login dan logout admin.
- Tambah, edit, hapus, dan atur urutan profil, pengalaman, pendidikan, kursus/sertifikasi, proyek, kemampuan, serta tautan.
- Unggah dan ganti foto profil serta gambar proyek.
- Validasi field wajib dan format tautan sebelum menyimpan.
- Tampilkan pratinjau perubahan.

## Perlu diputuskan

- Apakah MVP hanya memakai satu akun admin.
- Apakah perubahan langsung terbit atau memakai status draft/published.
- Batas ukuran/format unggahan dan lokasi penyimpanan media.
- Apakah form kontak perlu inbox admin atau cukup mengirim email.

## Keamanan minimum

- Halaman admin hanya tersedia bagi pengguna terautentikasi.
- Password harus di-hash; jangan simpan password polos.
- Rahasia aplikasi disimpan dalam konfigurasi environment dan tidak masuk Git.
- Validasi server-side berlaku untuk semua operasi tulis dan unggahan.

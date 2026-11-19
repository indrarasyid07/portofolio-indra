# 02 — Ruang Lingkup Produk dan UX

**Status:** Usulan implementable; konten faktual menunggu pemilik.

## Tujuan dan audiens

Portofolio memperkenalkan Indra kepada recruiter, calon pemberi kerja, klien, dan calon kolaborator melalui bukti kerja dan cara menghubungi. Beranda menjawab siapa pemiliknya, fokusnya, dan ke mana pengunjung dapat lanjut. Detail dan daftar lengkap berada di halaman khusus sehingga informasi tidak menumpuk di satu layar.

## Sitemap dan perilaku

| Halaman | URL yang disarankan | Isi utama | Tindakan utama |
|---|---|---|---|
| Beranda | `/` | Nama + foto profil terlihat tanpa scroll pada desktop; role, ringkasan 1–2 kalimat, status opsional, CTA, maksimal 1 proyek unggulan dan 2 tautan proyek lain. | Lihat proyek / Hubungi |
| Profil | `/profil` | Cerita, fokus, cara kerja, lokasi/status bila disetujui, tautan CV opsional. | Baca pengalaman |
| Pengalaman | `/pengalaman` | Pendekatan kerja dan kontribusi terpilih yang dikaitkan ke entri pengalaman yang sama. | Lihat riwayat kronologis |
| Riwayat Pekerjaan | `/riwayat-pekerjaan` | Timeline lengkap perusahaan/peran/tipe/lokasi/periode/deskripsi/pencapaian. | Buka kontribusi entri |
| Pendidikan | `/pendidikan` | Pendidikan formal. | Lihat kredensial terkait |
| Kursus & Sertifikasi | `/pembelajaran` atau bagian tersusun di `/pendidikan` | Kursus dan sertifikasi dibedakan kind, penerbit, tanggal, bukti. **Perlu diputuskan:** route terpisah bila jumlah konten bertambah; MVP boleh satu route dengan anchor/section. | Buka bukti (jika ada) |
| Proyek | `/proyek` | Indeks proyek published, filter tipe jika daftar cukup banyak, cover, tahun, peran, ringkasan, tech stack relevan. | Buka studi kasus |
| Detail Proyek | `/proyek/{slug}` | Konteks, tantangan, peran, solusi, hasil yang dapat diverifikasi, stack, galeri, demo/repo opsional. | Demo / repo / proyek lain |
| Tech Stack | `/tech-stack` | Stack umum dikelompokkan menurut fungsi; jangan anggap badge sebagai level mahir. | Baca proyek terkait (fase lanjutan) |
| Kontak | `/kontak` | Email/tautan profesional yang disetujui dan mailto. Form tidak dimasukkan MVP sampai strategi delivery/anti-spam diputuskan. | Mulai email |
| Login Admin | `/admin/login` | Form login saja; noindex. | Masuk |
| Admin | `/admin/*` | Overview, CRUD, media, preview, draft/publish, profil dan kontak. | Simpan draft/publish |

Navigasi desktop: Beranda, Profil, Pengalaman, Riwayat, Pendidikan, Proyek, Tech Stack, Kontak. Jika lebar sempit, menu collapsible berlabel dan keyboard-operable. Di ponsel semua item tetap tersedia tanpa horizontal scroll.

## Perbedaan Pengalaman dan Riwayat Pekerjaan

Kedua halaman membaca baris `experiences` yang sama. Halaman Pengalaman bersifat editorial: ringkasan metode dan kontribusi pilihan, dengan tautan ke entri/sumber. Riwayat Pekerjaan bersifat kronologis lengkap dan menampilkan semua pekerjaan published. Field perusahaan, peran, periode, deskripsi, pencapaian, urutan dan status hanya diedit sekali di admin. Konten “metode kerja” yang sifatnya personal dapat menjadi field profil terpisah, bukan duplikasi entri karier.

## Batas MVP

**Masuk MVP:** 9 halaman publik dari permintaan awal; SSR + SEO; satu admin; CRUD profil, kontak, project, experience, education/course/certification, skill; draft/publish; upload multiple image, pilih cover, caption/alt, reorder/delete; login/logout/revoke; seed dev yang terpisah dari data pribadi.

**Tidak masuk sampai ada keputusan:** registrasi/lebih dari satu admin, blog, testimoni, analytics personal, inbox pesan, form kontak dengan email delivery, multi-bahasa, komentar, search yang kompleks, role granular, workflow approval.

## Alur kerja inti

1. Pengunjung masuk ke Beranda, mengenali nama/foto/fokus, lalu menavigasi langsung ke halaman relevan.
2. Pengunjung membuka proyek; halaman detail menyajikan isi server-rendered dan metadata sendiri tanpa harus menjalankan JavaScript untuk membaca substansi.
3. Pemilik login, mengedit konten di route koleksi, melihat validasi dekat field, menyimpan Draft atau menerbitkan, lalu membuka preview publik.
4. Jika session kadaluarsa saat edit, formulir tidak dibuang; admin melihat pesan dan dapat menyalin/menyimpan draft lokal sementara, login lagi, lalu mengirim ulang. Jangan menyimpan password/session dalam localStorage.
5. Penghapusan meminta konfirmasi berisi nama record dan konsekuensi relasi/media; kesalahan server tidak menghapus perubahan form.

## Permission matrix

| Kapabilitas | Pengunjung anonim | Admin terautentikasi | Operasi bootstrap |
|---|---:|---:|---:|
| Membaca konten published | Ya | Ya | Tidak relevan |
| Membaca draft/preview draft | Tidak | Ya | Tidak |
| Login/logout | Ya (endpoint dibatasi) | Ya | Tidak |
| CRUD profil/kontak/experience/education/skills/projects | Tidak | Ya | Tidak |
| Upload, reorder, hapus media | Tidak | Ya | Tidak |
| Menjalankan bootstrap awal admin | Tidak | Tidak | Ya, sekali dari CLI/secure operator environment |
| Registrasi atau mengubah password admin | Tidak | Tidak pada MVP; gunakan script/operator yang direncanakan | Ya, melalui prosedur aman |
| Mengakses data log attempt/session mentah | Tidak | Tidak melalui UI; operator terbatas | Ya, hanya seperlunya |

Semua izin diperiksa di FastAPI pada setiap request tulis. Route guard Astro hanya untuk UX; tidak dihitung sebagai kontrol akses.

## UX admin

- Koleksi memakai tabel dengan kolom yang bisa dipindai, status Draft/Published, tanggal perubahan, sorting dan empty state; layar kecil beralih ke row cards.
- Form panjang memakai section heading dan dua kolom hanya pada layar lebar. Label selalu terlihat; hint, counter, batas karakter, validasi server, dan error dikaitkan ke field.
- Autosave tidak menjadi asumsi MVP. Tampilkan “Belum disimpan”, simpan, batalkan, dan peringatan saat navigasi dengan perubahan lokal.
- Delete meminta konfirmasi; publikasi menjelaskan konten yang langsung tampak publik. Publish/unpublish bisa dibatalkan lewat perubahan status.
- Gallery upload mendukung preview, progress per file, reorder dengan tombol Move up/down yang dapat diakses (drag-and-drop opsional), pilih cover tunggal, alt wajib, caption opsional, retry, hapus, dan batas upload jelas.
- Tampilkan alert sukses/gagal yang diumumkan screen reader; error tidak hanya mengandalkan warna.
- Overview memuat ringkasan jumlah draft/published dan shortcut ke koleksi; hindari statistik kosong dan label “online” jika tidak ada monitor koneksi riil.

## Konten dan editorial

Jangan publikasikan placeholder, data seed, atau pencapaian tanpa bukti/klarifikasi pemilik. Periode saat ini memiliki `end_date = null` serta label “Sekarang”. CV dan foto membutuhkan alt/caption serta approval. Hindari menyatakan skill level jika pemilik tidak memberi metode ukur. Detail proyek boleh memakai “hasil kualitatif” bila tidak ada metrik numerik, tetapi klaim harus dikonfirmasi.

## Prinsip kualitas UX

Setiap halaman punya struktur berdasarkan jenis isinya; jangan mengulang template hero dan grid card untuk setiap rute. Terminal cue berfungsi sebagai penanda konteks atau navigasi, bukan sebagai dekorasi yang mengurangi keterbacaan. Tindakan penting bisa dilakukan keyboard, fokus terlihat, target sentuh sekurangnya 44×44 CSS px, warna bukan satu-satunya penanda status, dan zoom 200% tetap usable.

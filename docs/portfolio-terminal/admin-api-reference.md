# API Admin — Implementasi Fase 06

Semua route berada di `/api/v1/admin`. GET juga memerlukan session admin. Mutasi memerlukan session, CSRF di `X-CSRF-Token`, Origin exact, dan `Content-Type: application/json`. Respons admin memakai `Cache-Control: no-store`.

Request memakai schema field whitelist dengan `extra=forbid`; hash password, session, object key, `created_at`, dan `published_at` tidak dapat diubah melalui editor. Konten teks disimpan sebagai teks biasa, tidak sebagai HTML.

## Ringkasan dan profil

| Method + path | Fungsi |
|---|---|
| `GET /overview` | Jumlah proyek, proyek terbit, pengalaman, pendidikan, tech stack, dan status profil dari database. |
| `GET /profile` | Mengambil profil singleton; bila belum disimpan mengembalikan nilai kosong berstatus draft. |
| `PUT /profile` | Membuat atau mengganti data profil, termasuk email yang secara eksplisit ditetapkan sebagai email publik. Update memakai `expected_updated_at`. |
| `POST /profile/publish` / `unpublish` | Terbitkan/sembunyikan profil; publish memerlukan nama, peran, headline, dan pengantar. |

Profil auth admin tidak ikut dalam DTO profil dan tidak pernah dipublikasikan. Foto profil diganti melalui upload media; teks alternatif wajib terisi sebelum profil diterbitkan.

## Proyek

| Method + path | Fungsi |
|---|---|
| `GET /projects?status=&search=&limit=50&offset=0` | Daftar terpaginasikan dengan filter status dan pencarian judul/slug/ringkasan. Batas halaman 50. |
| `POST /projects` | Membuat proyek sebagai draft. Menerima metadata studi kasus dan `skill_ids`; gambar bukan syarat untuk menyimpan draft. |
| `GET /projects/{id}` | Mengambil detail admin dan urutan tech stack. |
| `PUT /projects/{id}` | Mengganti field yang diizinkan; membawa `expected_updated_at`. Slug bentrok menghasilkan 409. |
| `DELETE /projects/{id}` | Hapus proyek dan relasi join-nya setelah konfirmasi UI; harus menyertakan versi terbaru. |
| `POST /projects/{id}/publish` / `unpublish` | Mengubah status; mengirim `{ "expected_updated_at": "...UTC..." }`. Publish menangani batas satu proyek unggulan di transaksi yang sama. |

Field proyek: `slug`, `title`, `subtitle`, `project_type`, `year`, `role`, `summary`, `challenge`, `solution`, `outcome`, `demo_url`, `repository_url`, `featured`, `sort_order`, dan `skill_ids`. Tipe proyek mengikuti nilai database: `web`, `mobile`, `desktop`, `api`, atau `other`. Status tidak dapat dimass-assign; gunakan route publikasi.

## Pengalaman dan pendidikan

| Method + path | Fungsi |
|---|---|
| `GET /experiences?status=&search=&limit=50&offset=0`, `POST /experiences` | List terpaginasikan dan pembuatan draft pengalaman. |
| `GET /experiences/{id}`, `PUT /experiences/{id}`, `DELETE /experiences/{id}` | Baca, ganti dengan optimistic version, atau hapus setelah konfirmasi. |
| `POST /experiences/{id}/publish` / `unpublish` | Publikasi satu entity pengalaman yang sama untuk halaman Pengalaman dan Riwayat Pekerjaan. |
| `GET /education?status=&kind=&search=&limit=50&offset=0`, `POST /education` | List terpaginasikan/filter dan pembuatan draft formal, course, atau sertifikasi. |
| `GET /education/{id}`, `PUT /education/{id}`, `DELETE /education/{id}` | Baca, ganti dengan optimistic version, atau hapus setelah konfirmasi. |
| `POST /education/{id}/publish` / `unpublish` | Publikasi atau menyembunyikan pendidikan/course/sertifikasi. |

Rentang pengalaman menyimpan presisi tahun/bulan yang tersedia; pekerjaan aktif mengosongkan tahun dan bulan akhir. `highlights` berupa array teks. Tahun/bulan pendidikan opsional dan urutannya divalidasi.

## Kategori dan tech stack

| Method + path | Fungsi |
|---|---|
| `GET /skill-categories`, `POST /skill-categories` | Daftar kategori beserta jumlah entri; buat kategori draft. |
| `PUT /skill-categories/{id}`, `DELETE /skill-categories/{id}` | Ganti kategori dengan optimistic version; hapus ditolak bila masih memiliki tech stack. |
| `POST /skill-categories/{id}/publish` / `unpublish` | Mengatur keterlihatan kategori publik. |
| `GET /skills?status=&category_id=&search=&limit=50&offset=0`, `POST /skills` | List terpaginasikan dan buat draft tech stack. |
| `PUT /skills/{id}`, `DELETE /skills/{id}` | Edit dengan optimistic version; penghapusan ditolak jika masih direferensikan proyek. |
| `POST /skills/{id}/publish` / `unpublish` | Mengatur keterlihatan tech stack umum. |

Project association menyimpan snapshot nama supaya detail proyek mempertahankan label pemakaian. Public API menampilkan stack terkait bila skill-nya terbit.

## Validasi, konflik, dan penghapusan

- Update, publikasi, dan penghapusan mengirim `expected_updated_at` berzona waktu dari response saat editor dibuka. Row dikunci saat mutasi dan versi dibandingkan; stale editor menerima `409 conflict` dan harus memuat ulang sebelum menyimpan.
- Slug hanya menerima lowercase ASCII, angka, dan hyphen tunggal di antara segmen. URL eksternal harus HTTPS (HTTP localhost hanya untuk `APP_ENV=development|test`); URL ber-userinfo ditolak.
- Publish status memakai route tersendiri; draft tidak muncul di endpoint publik. Unpublish mengubah status menjadi draft dan menghapusnya dari query publik.
- Proyek/pengalaman/pendidikan/skill dapat dihapus permanen setelah dialog konfirmasi. Hapus kategori atau tech stack yang masih direferensikan ditolak dengan 409.
- Error tetap berbentuk `{ "error": { "code", "message", "request_id", "fields"? } }`. Kode utama: 401, 403, 404, 409, 413, 415, 422, 503.

## Foto profil dan galeri proyek (fase 07)

Semua mutasi menggunakan session, Origin exact, CSRF, dan JSON. Asset disimpan pada bucket yang diwajibkan private; object key kanonis tidak dikirim sebagai metadata. Presigned POST memuat key staging acak selama lima menit sebagai field yang diperlukan S3.

| Method + path | Fungsi |
|---|---|
| `POST /media/intents` | Buat intent upload 5 menit dengan target `profile` atau `project`, nama file, MIME, ukuran, alt, caption; maximum 8 MiB. Response memuat presigned POST policy, asset id dan URL preview admin. |
| `POST /media/{id}/complete` | Validasi objek yang sudah diunggah, decode/re-encode JPEG/PNG/WebP, strip metadata, lalu simpan sebagai asset `ready`. Project target dilampirkan dengan urutan dan sampul; target profile langsung mengganti portrait. |
| `GET /media/{id}` / `PATCH /media/{id}` | Baca atau ubah alt/caption asset dengan autentikasi admin. |
| `GET /media/{id}/preview` | Pratinjau gambar admin dengan header no-store. |
| `GET /projects/{id}/images` | Daftar galeri dan metadata untuk editor. |
| `PUT /projects/{id}/images/order` | Kirim `image_ids` seluruh asset persis satu kali dan `cover_id` milik proyek; order sampul diganti dalam transaksi. |
| `DELETE /projects/{id}/images/{asset_id}` | Lepas gambar setelah otorisasi; bila sampul dihapus, item pertama yang tersisa menjadi sampul. Objek yang tidak direferensikan dihapus dari bucket. |
| `GET /api/v1/public/media/{id}` | Route publik same-origin yang mengirim byte hanya bila asset terhubung pada profil/proyek published. Draft menjawab 404. |

Field `Content-Type` pada presigned POST harus cocok dengan intent. Bucket CORS harus mengizinkan origin frontend yang tepat serta metode POST. Intent menolak semua unggahan sampai `AWS_S3_PRIVATE_BUCKET_CONFIRMED=true` disetel setelah operator memverifikasi bucket `private`. Batas server: maksimum sumber 8 MiB, 8000 px per sisi, 40 megapixel, output hasil normalisasi 5 MiB; hingga 12 image per proyek, 6 per batch/32 MiB total, 30 intent per jam dan 96 MiB per admin per hari. SVG, GIF/animasi, PDF, dan format lain ditolak. API media tidak mengubah/membuat migration.

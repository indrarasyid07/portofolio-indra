# Peta Skema, API, dan Halaman

Pemetaan ini mengikuti kontrak API dan implementasi CRUD fase 06; endpoint upload media masih menunggu fase berikutnya.

| Entitas | Field penting | Constraint / relasi | Model API yang dituju | Halaman / penggunaan |
|---|---|---|---|---|
| `profiles` | Nama, role, headline, intro, about, lokasi/availability opsional, portrait asset, kontak publik, status/published time | `id=1`; status draft/published; portrait boleh null dan asset tak ikut terhapus | `ProfileRead`; publik hanya field yang disetujui | Beranda, Tentang, admin profil |
| `projects` | Slug, judul, tipe, tahun, peran, ringkasan, challenge/solution/outcome, demo/repo, featured, urutan, status | Slug unik dan format dicek di API; tipe/status CHECK; featured published dibatasi satu; urutan >= 0 | `ProjectRead`; proyek publik harus published | Daftar Proyek, detail `/proyek/{slug}`, dashboard/admin proyek |
| `project_images` | Project, asset, urutan, cover | PK gabungan; satu urutan dan satu cover maksimum per proyek; hapus project menghapus link, bukan asset | Bagian `images[]` pada detail proyek; URL publik diselesaikan service media | Galeri proyek dan editor media |
| `media_assets` | Provider/bucket/object key, MIME, ukuran, dimensi, SHA-256, state, alt/caption, uploader | Object key unik per provider/bucket; ukuran positif; admin uploader `SET NULL`; object storage dikelola terpisah | DTO media teredaksi; object key privat tidak dikirim ke browser | Upload dan pustaka media admin |
| `experiences` | Jabatan, organisasi, tipe kerja, lokasi, tahun/bulan mulai/akhir, ringkasan, highlights | Status draft/published; nilai bulan 1–12; akhir harus setelah awal; satu koleksi untuk dua tampilan | `ExperienceRead` | Pengalaman dan Riwayat Pekerjaan |
| `education_records` | Jenis formal/course/certification, judul, institusi, tahun/bulan, deskripsi, bukti, credential | Status dan kind CHECK; bulan 1–12; urutan tanggal divalidasi | `EducationRead` | Pendidikan, Kursus, Sertifikasi |
| `skill_categories` | Slug, label, urutan, is_published | Slug unik; urutan nonnegatif | Bagian kategori pada `SkillRead`/respons skills | Daftar tech stack umum dan admin skills |
| `skills` | Kategori, nama, catatan, status, urutan | Kategori FK `RESTRICT`; nama unik per kategori | `SkillRead`; publik menampilkan kategori dan skill terbit | Stack umum, dan pilihan stack di editor proyek |
| `project_skills` | Project, skill, urutan, snapshot nama | PK gabungan; project cascade; skill restrict; snapshot tetap merekam label saat ini | Stack historis pada detail proyek | Tech stack per studi kasus |
| `admin_users` | Username/normalized username, password hash, aktif, waktu ubah password | Username ternormalisasi unik; tidak ada signup publik | Tidak pernah menjadi response publik | Login dan panel admin (fase autentikasi) |
| `admin_sessions` | User, token/CSRF hash, key version, waktu aktif/expiry/revocation | Token hash unik; expiry > created; cascade saat user dihapus | Internal saja; raw cookie/token tak disimpan | Login/session admin |
| `login_attempts` | HMAC attempt/source key, waktu, outcome | Index per HMAC dan waktu; tidak menyimpan username/IP mentah | Internal saja | Rate limit dan perlindungan login |

## Batas response publik

- `ProfileRead`, `ProjectRead`, `ExperienceRead`, `EducationRead`, dan `SkillRead` tidak
  mengandung password/token/hash/HMAC atau object key.
- Filter publik berdasarkan status published diterapkan di query/service saat endpoint dibuat.
- `published_at` disimpan dengan timezone; payload API memakai ISO 8601. Nilai tanggal kerja dan
  pendidikan tetap tahun/bulan supaya hari yang tidak diketahui tidak dikarang.
- Data media publik perlu URL hasil resolver storage; tabel database hanya menyimpan metadata.

## Keputusan sementara fase 02

1. Tanggal pengalaman dan pendidikan memakai tahun + bulan nullable karena bentuk ini sudah ada
   pada ERD dan dictionary. Bagian definisi tabel yang menyebut `start_date/end_date` bertentangan;
   pemilik perlu menutup C2 sebelum v1 dipasang ke Neon.
2. `project_skills` menyimpan `name_snapshot` dan FK skill memakai `RESTRICT`. Endpoint publik
   perlu menggunakan snapshot untuk stack proyek meskipun skill umum di-unpublish; ini perlu
   menyelaraskan kontrak API C4 sebelum v1. Skill tidak dihapus lewat cascade.
3. Vocabulary awal project type dan employment type adalah nilai konservatif pada CHECK model.
   Kontrak endpoint boleh memperluasnya hanya melalui keputusan dan migration baru.
4. Slug diperiksa dengan format eksplisit di API; CHECK database juga melarang kapital, spasi,
   slug kosong, hyphen ganda, serta hyphen awal/akhir.

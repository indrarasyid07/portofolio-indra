# 01 — Audit Referensi

**Tanggal:** 19 November 2026 · **Metode:** inspeksi file filesystem, tidak menjalankan atau mengubah prototype.

## Lokasi dan batas audit

Repository yang dimaksud prompt ditemukan di `D:\Dokumen\Indra\Project Pribadi\Portofolio\Indra`, bukan parent `Portofolio` dan bukan folder Downloads. Folder yang ada di root Indra saat audit hanya `docs/` dan `prototype/`. `git rev-parse --show-toplevel` tidak menemukan metadata Git pada Indra maupun parent yang diperiksa; karena itu audit tidak mengklaim status branch, commit, atau perubahan Git. Folder sibling `Syifa` tidak diaudit karena di luar cakupan.

Folder referensi `C:\Users\indra\Downloads\indra-terminal-portfolio` tersedia dan seluruh file di bawah yang terinventarisasi dibaca. Repository yang diaudit tetap folder Indra. Tidak ada file lama yang diubah oleh proses audit.

## Dokumen yang sudah ada

10 file berikut tetap dipertahankan apa adanya:

- `docs/README.md`
- `docs/00-overview/project-overview.md`
- `docs/01-product/portfolio-brief.md`
- `docs/02-design-and-content/content-structure.md`
- `docs/02-design-and-content/visual-direction.md`
- `docs/03-architecture/architecture-overview.md`
- `docs/04-admin-and-security/admin-panel.md`
- `docs/05-quality-and-operations/quality-and-operations.md`
- `docs/06-roadmap/roadmap.md`
- `docs/07-decisions/README.md`

Dokumen lama menyebut framework/backend/database/hosting belum dipilih, kebutuhan berbahasa Indonesia, foto dan nama pada pembuka, beranda yang ringkas, serta inspirasi editorial terminal. `docs/02-design-and-content/content-structure.md` menyatukan Pengalaman dan Riwayat Pekerjaan secara konseptual, tetapi daftar halaman sebelumnya belum mencantumkan halaman Riwayat Pekerjaan terpisah. Rancangan baru memperinci keputusan itu tanpa mengedit catatan lama. Indeks lama tidak menautkan subfolder dokumentasi baru; penautan ulang dapat dilakukan setelah rancangan disetujui, bukan pada fase audit ini.

Prototype lokal `Indra/prototype/` berisi `index.html`, `styles.css`, `app.js`, dan `README.md`. Itu konsep satu HTML dengan hash-based views; form kontak hanya memberi pesan pratinjau. Ia berbeda dari prototype multi-page di Downloads dan bukan data CMS/database.

## Referensi Downloads yang dibaca

HTML: `index.html`, `profil.html`, `pengalaman.html`, `riwayat-pekerjaan.html`, `pendidikan.html`, `proyek.html`, `detail-proyek.html`, `tech-stack.html`, `kontak.html`, `login.html`, `admin.html`. Asset: `assets/style.css`, `assets/data.js`, `assets/site.js`, `assets/admin.js`, `assets/portrait-placeholder.svg`, `assets/preview-devtools.svg`, `assets/preview-operations.svg`, `assets/preview-studio.svg`, dan `README.md`.

## Temuan yang berdasar file

| Area | Kondisi yang terlihat | Dampak migrasi |
|---|---|---|
| UI publik | Tiap HTML memakai shell, navigasi Indonesia, label command-line; konten utama dirender oleh `site.js` dari `body[data-page]`. | Pertahankan visual cues yang relevan, ubah tiap renderer menjadi route Astro independen yang server-rendered. Jangan bawa satu file JS besar sebagai arsitektur final. |
| Sitemap | Ada Beranda, Profil, Pengalaman, Riwayat Pekerjaan, Pendidikan, Proyek, Detail Proyek, Tech Stack, Kontak. | Cocok dengan target halaman; slug detail perlu distabilkan dan routing query `?id=` diganti `/proyek/{slug}`. |
| Pengalaman | Seed `experience` dipakai oleh view proses/kontribusi dan timeline Riwayat Pekerjaan; halaman Pengalaman mengambil maksimum 3 item. | Gunakan satu `experiences` collection; dua template/perspektif baca. |
| Data | `data.js` menyimpan `sample: true`; 3 proyek, 2 pengalaman, 3 pendidikan/kursus/sertifikasi, 8 skill; banyak string secara eksplisit berlabel contoh. | Jangan mengimpor seed sebagai riwayat faktual. Buat konten kosong/draft atau data fixture terpisah untuk development. |
| Proyek | Field meliputi id, title, subtitle, type, year, role, summary, challenge, solution, outcome, stack, demoLink, repoLink, images, featured. | Normalisasi stack/images; tambahkan slug/status/timestamps, caption-alt dan urutan media. |
| Pendidikan | `kind` hanya membedakan `formal` dan `certification`; kursus dicampur ke kategori nonformal. | Target memperjelas kind formal/course/certification agar kebutuhan kursus tersendiri terpenuhi. |
| Skills | Flat array `{id, category, name, note}`; belum punya urutan dan status publikasi. | Rancang skill category serta relation proyek ke skill. Jangan membuat rating proficiency tanpa data ukur. |
| Admin demo | CRUD proyek/pengalaman/pendidikan/skills dan profil; JSON import/export/reset; hingga 6 screenshot per project, maksimal 5 MB/file pada UI demo. | UX berguna sebagai referensi. Server harus validasi ulang; file-data URL dan browser storage bukan sistem produksi. |
| Auth demo | `login.html` membandingkan `admin`/`demo2026` di browser, `sessionStorage` guard di `admin.js`. | Semua kredensial dan guard demo harus dibuang. Tidak bisa dimigrasikan sebagai autentikasi. |
| Media | Gambar dikompresi canvas ke JPEG data URL dan disimpan di localStorage; SVG contoh berisi label placeholder. | Upload direct ke object storage, metadata di database, validasi MIME/signature dan decode di server; jangan migrasi SVG ilustrasi sebagai gambar proyek nyata. |
| Kontak | Form merakit `mailto:` dan tidak menyimpan/mengirim ke backend. | MVP dapat menampilkan kontak langsung + mailto. Form inbox server-side adalah keputusan terpisah karena butuh anti-spam, delivery, retention, dan privacy. |
| Aksesibilitas | Skip links, focus-visible, label form, ARIA untuk filter/galeri/menu dan reduced-motion tersedia sebagian. | Pertahankan; uji fokus menu, status/announcement, alt foto, kontras dan responsivitas pada implementasi. |
| Visual | Charcoal/hijau lime, serif editorial, sans isi, monospace labels, garis minim, asimetri per page, scan-line dekoratif, hover/rotasi terminal. | Pertahankan palet dan hierarki; efek scanline/rotasi hanya jika tidak mengganggu teks atau reduced-motion. Hindari panel terminal sebagai pembungkus setiap konten. |

## Catatan kualitas referensi

`style.css` memuat rules publik dan admin dalam satu file, media queries pada 1100/850/650 px, reduced motion di akhir, serta decorative fixed scanline pseudo-element. Implementasi harus memeriksa dampak overlay fixed terhadap rendering/kontras dan menghormati reduced motion. Pada beberapa elemen teks yang dipakai sebagai ikon, implementasi baru harus memakai ikon konsisten atau teks eksplisit dan tidak menambah simbol dekoratif yang membingungkan screen reader.

Prototype punya gambar “preview” dengan desain mockup dan alt yang menyebut screenshot, tetapi README memberi tahu semua ilustrasi adalah contoh. Tampilan publik harus membuang gambar ini sebelum konten nyata siap, atau mempertahankannya hanya dalam environment lokal yang jelas dilabeli.

## Tidak disimpulkan dari audit

Tidak ada fakta tentang pengalaman, perusahaan, pendidikan, sertifikat, email, GitHub, LinkedIn, atau hasil proyek yang dapat diambil dari seed. Belum ada konfirmasi foto asli, CV, domain, akun cloud, Git remote, target retensi kontak, maupun status lisensi atas konten dan gambar. Semua itu adalah input yang perlu diberikan pemilik.

## Rekonsiliasi referensi prototipe dan file lokal

Audit ulang dilakukan untuk prompt `13-REFERENSI-PROTOTIPE.md`. “Referensi percakapan” berarti ZIP multi-halaman yang dijelaskan dalam prompt tersebut. “Direktori lokal” berarti salinan `C:\Users\indra\Downloads\indra-terminal-portfolio` **serta** prototype berbeda yang ada di repository `Indra/prototype/`. Salinan Downloads cocok dengan inventaris multi-halaman yang dijelaskan, sedangkan `Indra/prototype/` adalah SPA hash satu-HTML dengan versi desain lain. Saat berbeda, salinan yang relevan ditinjau sebagai referensi, tetapi keputusan implementasi tetap mengikuti rancangan `docs/portfolio-terminal/` dan konten faktual harus datang dari pemilik.

| Observasi | Ditemukan di referensi percakapan? | Ditemukan di direktori lokal? | Ada perubahan? | Tindakan |
|---|---|---|---|---|
| Prototype multi-halaman publik: beranda, profil, pengalaman, riwayat pekerjaan, pendidikan, proyek, detail, tech stack, kontak | Ya; 9 file halaman | Ya; 9 HTML di Downloads. `Indra/prototype/` hanya satu `index.html` dengan tampilan hash. | Ya — halaman kini menjadi route Astro mandiri: `/`, `/profil`, `/pengalaman`, `/riwayat-pekerjaan`, `/pendidikan`, `/proyek`, `/proyek/[slug]`, `/tech-stack`, `/kontak`. | Gunakan route aplikasi dan sitemap sebagai kontrak. Prototype SPA disimpan hanya sebagai bahan historis; jangan menggabungkan script renderer-nya. |
| Login dan panel admin | Ya; `login.html` dan `admin.html`, demo browser-only | Ya; keduanya ada di Downloads. Tidak ada di prototype satu-HTML repo. | Ya — dipisah menjadi `/admin/login`, `/admin/*` dengan FastAPI/session server-side. | Ikuti auth/security docs; mekanisme login/session prototype tidak boleh dipakai atau di-deploy. |
| Palet dan tipografi | Ya; token lengkap yang dicantumkan prompt | Ya; token CSS Downloads cocok, dengan beberapa token tambahan. Prototype repo memakai varian ink/acid, font dan ukuran halaman berbeda. | Ya — Astro memakai palet hijau/charcoal/serif/mono yang tercatat di `04-frontend-design-and-routing.md`; bukan salinan CSS dari salah satu prototype. | Lanjutkan design token Astro. Pertahankan komposisi editorial dan terminal cue secukupnya; verifikasi contrast pada kombinasi yang benar-benar dirender. |
| Komposisi halaman | Ya; komposisi berbeda tiap route, hero terminal dan proyek visual | Ya; pola itu terlihat pada HTML/CSS Downloads. Repo prototype membuat beberapa view dalam satu dokumen. | Sebagian — halaman Astro punya template khusus, tetapi media proyek asli belum diberikan. | Jangan ubah ke template SaaS seragam. Jangan menampilkan preview ilustratif sebagai karya nyata; gunakan fallback kosong sampai aset disetujui. |
| Foto dan preview proyek SVG | Ya; `portrait-placeholder.svg` dan `preview-*.svg` dinyatakan placeholder/demo | Ya; empat SVG ada di Downloads. Repo prototype menggunakan ilustrasi/placeholder, bukan foto pemilik. | Ya — media sekarang memakai entity/API upload dan object storage, tetapi akses bucket belum dikonfirmasi. | Jangan import SVG, screenshot mockup, ataupun foto placeholder sebagai konten publik; upload baru setelah bucket staging private diverifikasi. |
| Seed riwayat, proyek, pendidikan, skill | Ya; `sample: true`, beberapa record contoh | Ya; `assets/data.js` Downloads memuat sample dan daftar tersebut. Prototype repo juga memuat teks contoh/placeholders statis. | Ya — konten dimodelkan dalam Postgres/API tanpa impor seed lama; fakta profil tetap belum diverifikasi. | Tidak ada record seed yang boleh dianggap biografi. Masukkan hanya konten yang dikonfirmasi dan disetujui pemilik. |
| Penyimpanan CRUD di browser | Ya; `localStorage` dengan key prototype, ekspor/impor JSON | Ya; `assets/data.js` Downloads membaca/menulis `localStorage`; repo prototype tidak menyediakan backend/persistensi CMS. | Ya — CRUD memakai endpoint admin dan DB; target Neon belum diuji pada fase ini. | Jangan migrasikan browser state secara otomatis. Bila ada data penting milik pemilik di browser, pemilik harus mengekspor dan meninjau dulu sebelum prosedur import terpisah. |
| Kredensial demo dan session client | Ya; demo login dan `sessionStorage` | Ya; README/admin JS Downloads mendokumentasikan demo login dan guard client. | Ya — diganti bootstrap admin, cookie HttpOnly, hash session di Postgres, CSRF, Origin dan rate limit. | Jangan membawa credential/guard demo. Uji login, cookie dan revoke pada preview terisolasi sebelum deployment. |
| Gambar sebagai data URL/base64 | Ya; editor demo menerima data URLs dan menyimpan gambar di localStorage | Ya; `assets/data.js` menerima `data:image/...`; README menjelaskan kompresi canvas. | Ya — upload image dimaksudkan melewati API/storage, bukan localStorage; bukti provider nyata masih blocked. | Jangan port base64. Tetap gagal-tertutup saat bucket private belum diverifikasi. |
| Kontak | Ya; `mailto:` dan tidak ada backend inbox | Ya; README Downloads mencatat `mailto:`; `Indra/prototype/` hanya respons pratinjau. | Sebagian — kontrak sekarang hanya link email/social yang disetujui; tidak ada inbox dan email belum diberikan. | Pertahankan email langsung/mailto sesuai `02-product-scope-and-ux.md`; jangan membuat form submit palsu atau menyimpan PII tanpa keputusan baru. |
| Pengalaman dan riwayat pekerjaan | Ya; dua halaman memakai satu `experience` collection | Ya; README dan `assets/site.js` menunjukkan collection yang sama; prototype repo memiliki tampilan berbeda tanpa data server. | Ya — satu table/API `experiences`; halaman Astro menyajikan perspektif ringkasan vs timeline. | Perubahan satu record harus tercermin pada dua halaman. Jangan menambah entity/collection kedua; lihat kontrak lintas fase. |
| Layout mobile dan breakpoint | Ya; CSS Downloads punya breakpoint 1100/850/650 serta reduced-motion | Ya; file CSS mencocokkan breakpoint tersebut. Prototype repo berbeda: 960/760 serta titik tambahan di style lain. | Sebagian — frontend Astro punya breakpoint sendiri, bukan salinan angka prototype; bukti zoom/keyboard mobile penuh belum ada. | Gunakan breakpoint prototype sebagai referensi inspeksi saja. Validasi reflow 320–390 px, zoom, keyboard dan reduced motion di browser sebelum release. |
| Struktur data pendidikan dan skill | Ya; demo memisahkan formal/kursus/sertifikasi serta kategori skill | Ya; Downloads memuat record kategori dan skills, dengan representasi kursus yang campur di seed lama. Repo prototype menampilkan placeholder sederhana. | Ya — API membedakan `formal`, `course`, `certification`, dan skill categories/status. | Pertahankan kontrak schema baru. Jangan impor tanpa mapping eksplisit dan approval isi. |
| Export/reset dan local demo utility | Ya; admin prototype menyediakan JSON import/export/reset sample | Ya; `assets/admin.js` dan `data.js` ada. | Ya — admin server tidak mengandalkan fitur tersebut; backup sekarang mengikuti runbook operator, bukan browser export. | Jangan port reset sample ke aplikasi. Jika owner minta ekspor/import kemudian, buat prosedur terautentikasi dengan review privasi dan schema. |

### Kesimpulan perbandingan

Salinan Downloads adalah prototype multi-page yang dirujuk prompt; folder `Indra/prototype/` adalah prototype lain dengan navigasi/hash view satu-page dan token visual berbeda. Frontend Astro telah memetakan route produk, memakai palet rujukan yang disetujui di dokumen desain, dan mengganti demo browser auth/data dengan route/API serta kontrak server. Perbedaan source prototype ini tidak menjadi alasan untuk menyalin kedua implementasi atau mengimpor isi demo. Aset asli, konten biografi, foto, proyek, izin publikasi, dan kredensial deployment belum disediakan/diuji.

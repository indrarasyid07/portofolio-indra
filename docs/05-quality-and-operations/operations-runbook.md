# Runbook operasional

## Status environment

| Environment | Status saat handoff |
|---|---|
| Local | Frontend dan backend dapat dijalankan dengan perintah di [onboarding](developer-onboarding.md); env rahasia lokal sudah ada dan tidak ditampilkan. |
| Preview | **BLOCKED**: belum ada Git remote/Vercel project backend, Neon branch staging terpilih, bucket preview private terverifikasi, atau URL origin. |
| Production | **Belum dideploy**; domain/plan/data publik belum disetujui. |

Catatan DB: initial schema mencapai Alembic head `b7f4c7a1d2e9` pada target `DATABASE_DIRECT_URL` di environment lokal. Branch/lingkungan target belum diverifikasi; jangan menyebutnya staging atau production. API publik pengalaman saat ini membaca nol record pada koneksi runtime.

Lihat [laporan deployment fase 09](../portfolio-terminal/implementation-phase-09-report.md) untuk gerbang dan environment variable names. Root Vercel untuk dua project direncanakan `frontend/` dan `backend/`; backend FastAPI memakai `[tool.vercel] entrypoint = "app.main:app"`. Python Runtime Vercel saat ini Beta, sehingga deploy nyata harus diuji sebelum menerima platform.

## Deployment dan migrasi

Deployment belum dapat dijalankan dari workspace saat ini. Jika repository/Vercel/Neon staging telah tersambung:

1. Jalankan semua quality checks dari onboarding dan tinjau `git diff`/commit.
2. Pastikan frontend preview `API_INTERNAL_URL` mengarah ke API preview dan backend memakai branch DB serta bucket storage preview; tidak boleh memakai URL/credential produksi.
3. Ambil backup database dan objek yang sudah diuji keterbacaannya. Review revisi `backend/migrations/versions/` dan hasil SQL sebelum migrasi.
4. Dari `backend/`, periksa status dan jalankan migrasi **hanya** terhadap branch/DB yang sudah dikonfirmasi:

   ```text
   uv run alembic current
   uv run alembic history
   uv run alembic upgrade head
   ```

5. Pastikan `uv run alembic current` menunjuk head yang diharapkan. Jalankan smoke test `/health`, `/ready`, API publik, login, CRUD, publikasi draft, media, logout, CSRF, cookie/cache, dan log.
6. Promosikan frontend/backend secara terkoordinasi hanya sesudah skema lama/baru kompatibel dan gate pemilik disetujui. Setelah rilis, cek halaman, metadata, sitemap, gambar, dan error/usage.

Rollback kode adalah mengalihkan deployment frontend/API ke deployment sebelumnya yang diketahui sehat. Itu **tidak** membatalkan data atau migrasi. Untuk skema, utamakan migrasi forward-fix yang kompatibel. `alembic downgrade` hanya dilakukan setelah diuji pada database disposable dan review risiko data; jangan menjalankannya untuk mencoba “undo” perubahan produksi. Jika pemulihan database perlu dilakukan, restore ke database/branch baru lalu arahkan aplikasi setelah verifikasi—jangan overwrite database real sebagai drill.

Saat belum ada deployment, tidak ada deployment ID atau perintah rollback Vercel yang dapat diklaim.

## Backup PostgreSQL

### Kebijakan yang masih perlu disetujui

- Usulan awal: backup mingguan dan sebelum migrasi besar/penghapusan massal; retention sementara 4 mingguan + 3 bulanan. Pemilik belum mengesahkan cadence, retensi, tujuan arsip, dan recovery point objective.
- Snapshot/instant restore Neon dapat membantu pemulihan jangka pendek, tetapi bukan backup off-provider. Paket Free saat ini memiliki instant restore history terbatas (6 jam dan batas perubahan); periksa plan proyek aktual sebelum mengandalkannya.
- Dump harus memakai koneksi **direct**, SSL/channel binding sesuai konfigurasi project. Jangan memakai pooled runtime URL untuk `pg_dump`.

### Proses dump

1. Pastikan dengan account/branch name bahwa koneksi mengarah ke database target yang dimaksud.
2. Siapkan `pg_service.conf` di luar repository berisi host, port, nama database, role dan `sslmode=require`; simpan password terpisah dalam `PGPASSFILE` privat. Pada Windows batasi ACL file hanya untuk akun operator; pada Bash set `chmod 600`. Jangan taruh password pada command argument, terminal transcript, atau file project.
3. Set `PGSERVICEFILE`, `PGPASSFILE`, dan `PGSERVICE=portfolio_backup` pada sesi terminal privat. Simpan hasil di direktori cadangan terenkripsi di luar repository.
4. Dari `backend/`, buat dump custom format dan validasi daftar archive:

   ```text
   pg_dump --dbname="service=portfolio_backup" --format=custom --no-owner --no-privileges --file="<secure-path>/portfolio-<timestamp>.dump"
   pg_restore --list "<secure-path>/portfolio-<timestamp>.dump"
   ```

5. Enkripsi archive dengan key yang berbeda lokasi dari archive (misalnya age/gpg di perangkat operator), uji baca/decrypt ke direktori sementara yang terlindung, lalu hapus plaintext secara aman sesuai kebijakan perangkat. `pg_restore --list` saja belum membuktikan restore benar.
6. Catat timestamp, database/branch alias nonrahasia, ukuran, hasil decrypt, dan checksum. Jangan menyimpan connection string.

### Restore drill PostgreSQL

Belum dilakukan karena belum ada target test branch/database yang dikonfirmasi dan tidak ada backup valid. Setelah tersedia:

1. Buat branch/database **nonproduction** kosong dan pastikan nama/environment terlihat jelas.
2. Decrypt archive ke storage terlindung dan restore tanpa owner/privileges:

   ```text
   pg_restore --exit-on-error --no-owner --no-privileges --dbname="service=portfolio_restore_test" "<secure-path>/portfolio-<timestamp>.dump"
   ```

3. Jalankan `uv run alembic current`; periksa daftar tabel dan constraint di `information_schema`; cek admin overview/public endpoints serta beberapa record count. Jangan mengubah password atau mengirim email selama drill.
4. Hapus branch test sesuai kebijakan setelah hasil dicatat. Keberhasilan dinyatakan hanya bila restore selesai, schema/constraint cocok, aplikasi dapat membaca record, dan hasil tercatat.

## Backup dan restore object storage

`pg_dump` tidak memuat byte gambar. Neon Object Storage bercabang bersama Neon dan S3 API menyediakan `ListObjectsV2`, `GetObject`, `PutObject`, dan `HeadObject`; akses inventory/read menuntut credential yang sesuai. Branch copy-on-write membantu eksperimen, tetapi bukan salinan independen di luar Neon. Lifecycle rules S3 tersimpan tetapi tidak ditegakkan oleh Neon saat verifikasi terakhir; jangan jadwalkan retensi otomatis berbasis lifecycle tanpa proof.

Cadangan jangka panjang yang disarankan—belum dikonfigurasi—adalah sync prefix `portfolio-media/` ke lokasi arsip terpisah, enkripsi sebelum dipindahkan/ditahan, role baca minimal untuk backup, write terpisah untuk restore, dan test restore ke bucket/branch disposable. File backup dan database dump harus punya manifest key, ukuran, SHA-256 bila tersedia, tanggal, database dump ID, serta jumlah objek. Jangan pakai opsi `--delete`.

Contoh inventory/download setelah target branch serta credential terverifikasi:

```powershell
aws s3 sync "s3://<bucket-preview>/portfolio-media/" "<secure-archive>\portfolio-media" --endpoint-url $env:AWS_ENDPOINT_URL_S3 --dryrun
```

Setelah operator meninjau daftar yang akan diunduh, ulangi tanpa `--dryrun` ke storage terlindung. Untuk restore, arahkan ke bucket/branch test dan lakukan dry-run lebih dulu:

```powershell
aws s3 sync "<secure-archive>\portfolio-media" "s3://<bucket-test>/portfolio-media/" --endpoint-url $env:AWS_ENDPOINT_URL_S3 --dryrun
```

Belum ada arsip objek, restore drill, atau inventory menyeluruh. Perintah cleanup aplikasi [`cleanup_media.py`](../../backend/app/scripts/cleanup_media.py) hanya mengecek referensi di DB dan prefix konfigurasi; bukan pengganti inventory bucket. Jalankan default dry-run saja, dan **jangan** gunakan `--apply` sebelum database dan bucket nonproduksi dipastikan.

## Password, sesi, dan credential incident

- **Akun admin dicurigai bocor:** unpublish konten sensitif bila perlu; dari host privat yang terarah ke DB benar, jalankan `uv run python -m app.scripts.bootstrap_admin --rotate-password`. Ini meminta password tersembunyi dan mencabut semua sesi. Setelahnya uji login baru dan pastikan sesi lama menerima 401. Drill live belum dilakukan.
- **`SESSION_HASH_KEY` bocor:** buat secret baru di secret manager, rotasi backend environment dan redeploy; seluruh sesi lama tidak akan valid. Password admin tetap perlu dirotasi jika juga dicurigai.
- **`AUTH_PROXY_KEY` bocor:** ganti key di frontend dan backend environment dalam rilis terkoordinasi; request BFF/backend harus kembali diuji. Jangan tinggalkan dua nilai berbeda.
- **Database credential bocor:** cabut role/kredensial lama di Neon setelah menyiapkan credential pengganti; update runtime `DATABASE_URL` dan migration-only `DATABASE_DIRECT_URL` sesuai environment, verifikasi, lalu buang nilai lama.
- **S3 key bocor:** revoke credential di Neon, buat credential scope minimum untuk branch/bucket yang benar, update environment backend, periksa audit/storage logs. Jangan aktifkan write sebelum bucket private dikonfirmasi.
- **Ada secret di Git/build/log:** cabut segera—menghapus teks dari commit berikutnya tidak membuat key lama aman. Review deployment logs dan akses storage/database terkait.

Semua secret diubah melalui environment settings/secret manager, tidak melalui pull request atau dokumen. Simpan catatan timestamp, key name, environment, dan verifikasi tanpa mencatat nilainya.

## Observability dan review rutin

- `GET /health` adalah **liveness** proses, tidak menyentuh database.
- `GET /ready` menjalankan `SELECT 1` dan mengembalikan status umum. 503 menandakan database belum siap; respons/log tidak mengandung DSN atau query detail.
- Storage belum punya readiness probe yang aman karena akses bucket belum diverifikasi. Periksa storage quota/API error melalui Neon Console setelah target environment disetujui.
- Log backend menambahkan request ID dan membatasi exception log ke jenis error. Jangan log password, request body auth, cookie, CSRF token, presigned URL, database URL, key S3, atau alt/caption/portfolio text yang tidak diperlukan.
- Deployment belum ada, jadi observability Vercel/Neon production belum tersedia. Tidak ada alert external atau jadwal automatik yang dibuat.

Usulan review manual bulanan: Vercel invocations/CPU/transfer/build failures/runtime errors, Neon CU-hours/storage/branches/transfer/query errors, usia/ukuran backup dan hasil restore terakhir, objek orphan/pending, akses akun MFA/credential, build/security advisory, serta HTTP 5xx dan metadata. Catat keputusan dan tindak lanjut tanpa menyalin PII/secrets. Untuk preview, lakukan review sesudah setiap release.

## Biaya/plan dan exit strategy

Snapshot dokumentasi resmi diperiksa 2026-11-19; ini bukan bukti plan akun maupun kuota aktual:

- Vercel Hobby: $0 untuk **penggunaan personal/nonkomersial saja**. Term of Service melarang penggunaan komersial di Hobby. Dokumen tidak dapat menyatakan proyek ini memenuhi syarat—pemilik harus memastikan konteks penggunaan aktual. Bila batas free usage tercapai, Hobby deployments/usage dapat dipause; pantau dashboard dan beralih ke plan yang cocok sebelum jadi outage.
- Neon Free: $0; saat diperiksa berisi 100 CU-hours/project/bulan, 1 GB Postgres/project (20 GB account total), 5 GB public transfer/project, 5 GB Object Storage/project, scale-to-zero sekitar 5 menit, 10 branches/project, serta instant restore hingga 6 jam dengan batas riwayat perubahan. Free tidak menyediakan spending notifications; kuota tiap resource berbeda dan dapat membatasi service. Periksa Dashboard/usage sebelum menambah preview branches atau memakai media.
- Nilai kuota/harga/entitlement berubah. Domain, plan, limit penggunaan, dan terms belum dipilih pemilik; tidak ada estimasi biaya/traffic proyek aktual.

Untuk migrasi provider: `pg_dump` custom format → `pg_restore` pada Postgres target; ekspor objek melalui S3-compatible `ListObjectsV2/GetObject` dan upload ulang dengan key/manifest; update object key references setelah hash/size terverifikasi. Export dan restore perlu rehearsal; Neon region/branch behavior bukan backup lintas provider.

Referensi utama: [Vercel Hobby terms](https://vercel.com/legal/terms), [Vercel Hobby plan](https://vercel.com/docs/plans/hobby), [Vercel limits](https://vercel.com/docs/limits), [Neon plans](https://neon.com/docs/introduction/plans), [Neon S3 compatibility](https://neon.com/docs/storage/s3-compatibility), [Neon objects](https://neon.com/docs/storage/objects).

## Backlog future (di luar MVP)

- Search/full-text untuk proyek; analytics yang menghormati privasi.
- Upload batch dan pemrosesan image varian.
- Alerting otomatis, backup scheduler, dan report usage setelah provider/plan final.
- MFA/passkey admin bila ancaman dan deployment membutuhkan.
- Inbox kontak hanya bila ada keputusan privasi, retensi dan anti-spam.

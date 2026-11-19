# 10 — Strategi Migrasi dan Konten

## Sumber

Sumber visual/data prototype yang dimigrasikan adalah `C:\Users\indra\Downloads\indra-terminal-portfolio`. Audit menunjukkan source ini file statis, bukan database export. Browser localStorage yang pernah terisi pada suatu perangkat tidak dapat dibaca dari filesystem ini; jika pemilik mempunyai isi custom yang penting, gunakan fitur export JSON prototype secara lokal dan serahkan file tersebut sebelum import. Jangan mengklaim data localStorage sudah dicadangkan.

Source prototype pada prompt berisi seed demo yang `sample: true`. README menyebut semua data awal dan ilustrasi sebagai contoh, bukan klaim pribadi. Karena itu transform default adalah **no import ke production**. Isi sebenarnya harus dikonfirmasi pemilik dan dibuat sebagai draft melalui admin/form import yang ditinjau. Asset `preview-*.svg` adalah mockup demonstrasi, bukan screenshot proyek asli.

## Mapping dari data seed prototype

| Sumber JS / field | Tujuan produksi | Transformasi/validasi |
|---|---|---|
| `profile.name` | `profiles.name` | Seed menyebut Indra Rasyid, tetapi minta pemilik konfirmasi nama penayangan. |
| `profile.role` | `profiles.role` | Draft; jangan auto-publish sebagai representasi final. |
| `headline`, `intro`, `about` | kolom `profiles` | Draft content; konfirmasi gaya bahasa Indonesia dan klaim. |
| `location`, `availability` | `profiles.location`, `availability` | Opsional/privasi; default hidden sampai dipilih pemilik. |
| `email`, `github`, `linkedin`, `resumeUrl` | public contact/profile fields | Seed blank; tidak ada data untuk import. Validasi url dan persetujuan publik. |
| `portrait` | `media_assets` + `profiles.portrait_asset_id` | Placeholder SVG `portrait-placeholder.svg` tidak menjadi foto final. Upload foto asli dan isi alt. |
| `projects[].id` | ID UUID baru | ID lama `p-1` bukan slug/UUID produksi; simpan mapping sementara hanya selama import. |
| `title`, `subtitle`, `type`, `year`, `role`, `summary`, `challenge`, `solution`, `outcome` | `projects` | Semua isian sample ditolak untuk publication; review satu per satu. Normalisasi `type` enum. |
| `demoLink`, `repoLink` | `demo_url`, `repository_url` | Blank di seed; hanya accept HTTPS link milik/relevan pemilik. |
| `stack[]` | `skills` + `project_skills` | Simpan general skills terpisah dari project relation; jangan menyalin label generik “Design system”, “REST API” sebagai bukti skill aktual. |
| `images[]` | `media_assets` + `project_images` | Preview SVG dan mockup diabaikan; screenshot nyata harus diupload kembali, diverifikasi dan diberi urutan/alt. |
| `featured` | `projects.featured` | Hanya dapat true bila proyek published dan disetujui menjadi sorotan; max-one featured utama di home presentation. |
| `experience[]` | `experiences` | Semua organisasi/peran/kontribusi berisi contoh; jangan import sebagai riwayat faktual. User konfirmasi employer, dates, location, employment kind, highlights. |
| `education[]` (`kind=formal`) | `education_records.kind=formal` | Title/institution/year contoh; jangan publish. |
| `education[]` (`kind=certification`) | `education_records.kind=course` atau `certification` | Pemilik mengklasifikasikan satu per satu; seed mencampur kursus/sertifikasi pada kind sama. Simpan issuer, tanggal dan bukti bila tersedia. |
| `skills[]` | `skill_categories` + `skills` | Contoh stack umum; tidak menyatakan level. Pemilik memilih skills yang benar-benar digunakan. |
| `sample` | tidak dipindah sebagai production column | Diganti status draft/review dan environment fixtures; flag sample jangan dijadikan tombol public “hilangkan label contoh” tanpa audit data. |
| localStorage export JSON | optional staging import tool | Validasi version/schema, scan sample flag, preview diff, dry-run, explicit confirm. Jangan overwrite dataset produksi tanpa backup dan record count summary. |

## Import procedure

1. Owner supplies factual content/source files; keep the raw source read-only and record source filename + received date privately.
2. Build migration mapping importer as one-off CLI/script (not a permanent public API). It validates required values, reports rejected fields, and creates records as Draft.
3. A dry-run prints counts by entity, image paths, placeholder/sample warnings, slug collisions and missing data; never print secrets or whole profile text to CI logs.
4. Compare the resulting admin preview with source and owner; correct category, dates and order manually.
5. Upload real photos/screenshots through admin; save original asset externally before the first migration. Verify image dimensions, alt, cover, gallery order and public/draft access.
6. Publish each profile/project/work/education item only after explicit owner review. Confirm Home has correct photo, title, CTA and featured list; review OG preview and CV URL.
7. If importing existing localStorage JSON: export from each relevant browser, retain an encrypted backup outside repo, validate the supported JSON schema/version, run staging dry-run, then production dry-run summary and explicit migration approval. Do not trust imported HTML URLs/data URLs, auth/session keys, or passwords.

## Content readiness checklist

| Content | Required before public release |
|---|---|
| Identity | Approved display name, accurate role, real portrait with correct crop, meaningful alt text |
| Profile | 1–2 line home intro, longer about, approved location/availability disclosure |
| Experience | Employer/org, role, type, date precision, accurate responsibilities/results; no confidential employer data |
| Education/course/certification | Correct kind, institution/issuer, dates and proof URL rights |
| Project | Owner contribution, problem/solution, truthful result, permission to show screenshot/code/client name, stack related to actual work |
| Contact | Approved email/social links; CV file permission and current contact details |
| Media rights | Image ownership/license; redact credentials, PII, internal URLs/production records |

## Rollback and backups

Before import: snapshot/backup Postgres and export images to a controlled local archive, record counts and version. A rollback may restore rows and re-upload objects; deleting current production data based on a branch reset is not an approved strategy. Keep raw image originals; optimized web versions are not replacements. Validate restored DB + object links as separate actions.

## File ownership boundary

Prototype reference outside `Indra` remains an input, not a production asset copied automatically. The local `Indra/prototype/` is also preserved and not rewritten. Actual implementation structure will be proposed in [roadmap](12-implementation-roadmap.md), but no frontend/API or scripts were created in this documentation phase.

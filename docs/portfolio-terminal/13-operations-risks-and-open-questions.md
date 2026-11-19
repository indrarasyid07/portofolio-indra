# 13 — Operasi, Risiko, dan Pertanyaan Terbuka

## Risiko utama

| ID | Risiko | Dampak | Rencana |
|---|---|---|---|
| R1 | Seed/placeholder disangka data Indra | Klaim reputasi yang salah | No seed ke production; draft + owner signoff; lihat [10](10-migration-and-content-strategy.md). |
| R2 | Vercel Python runtime masih Beta; packaging/entrypoint atau ASGI deployment tidak cocok | API deploy gagal atau butuh host alternatif | Entrypoint `app.main:app` sudah ditetapkan; proof-of-concept deployment masih wajib sebelum memilih platform final. Pin Python; jaga storage/DB adapters terisolasi. |
| R3 | Vercel Hobby dibatasi ke personal/non-commercial; quota pause | Situs berhenti saat limit atau penggunaan tidak sesuai plan | Konfirmasi terms aktual dan pemakaian; monitor; rencana upgrade/host alternatif. |
| R4 | Vercel Services beta tidak tersedia | Topologi satu-project tidak dapat dipakai | Baseline dua projects; tidak bergantung pada Services. |
| R5 | Preview rewrite/Cookie/Origin mismatch | Admin gagal login atau CSRF rentan | Exact origin mapping; browser/API E2E pada prod-like preview; never wildcard. |
| R6 | Neon scale-to-zero latency atau free caps terlewati | Cold request lambat/DB pause | Measure; cap DB pools; cache only published after tested; monitor compute/storage/transfer. |
| R7 | Neon Object Storage API subset tidak mendukung chosen signed flow | Upload atau public/private media tidak workable | Spike provider early; isolate S3 adapter; preserve storage migration option. |
| R8 | Draft asset leaked through public-read storage | Konten unpublished bisa ditemukan | Private staging or protected redirect/signing; test object URL directly; publish workflow verified. |
| R9 | Admin hanya satu tanpa MFA di web app | Credential/session compromise high impact | Unique long password, provider account MFA, short TTL/revoke, rate limit; add app MFA/passkeys if risk justifies. |
| R10 | No durable backup or object backup tested | Hilang konten gambar/database | Define separate backup/restore cadence; snapshots are not assumed object backups; exercise restoration. |
| R11 | Proyek/screenshot mengungkap rahasia pihak lain | Privasi/kontrak/security incident | Content rights checklist; redact URL/data/token; owner approval before publish. |
| R12 | SSR uncached increases Vercel functions and DB load | Cost/quota/cold start | Begin no-store, measure real traffic; add short cache only with publish invalidation tested. |
| R13 | Custom rate limiting incorrectly trusts forwarded IP | Brute force evade or spoofed bans | Trust proxy headers only through Vercel ingress; bound keyed account attempts; concurrent DB test; fail closed. |
| R14 | Accessibility regressions in terminal-heavy dark UI | Barriers for users | Contrast/focus/reflow manual test; accent purpose and AA check; no scanline if it harms legibility. |

## Operasional yang direncanakan

### Routine

- Monthly: review Vercel/Neon usage against current limits, failed builds, server/function errors and DB/storage footprint. Frequency may be adjusted after public launch.
- After every publish: open public page, confirm photo/cover/links/metadata, check draft no longer appears, and verify date/order. Avoid logging in production admin over untrusted devices.
- Before major edit/delete or schema migration: export current data and ensure images/DB restore path; unpublish prior to hard delete.
- Credential/storage compromise: revoke all admin sessions, rotate affected database/storage/session keys, redeploy, inspect security events, validate media and publish state.
- DB outage: public SSR may show a branded fallback, but admin writes fail closed. Do not display stale private draft. Restore service and review DB health; no automatic data reset.

### Backup, recovery, and retention (proposals)

- Neon Free currently documents instant restore up to 6 hours and a limited change window; that protects against some recent DB changes only and does not stand in for a long-term off-provider backup. Confirm current plan before selecting retention policy.
- Before first production content, store encrypted `pg_dump` at a separate account/location on a cadence suitable to content changes (weekly baseline; after content bulk import); keep an owner-held encrypted original-media archive. Exact destination, retention duration and restoration owner are **Perlu diputuskan**.
- Restore drills verify schema version, admin login, published content count and each object key reference independently. A database restore branch and object state may not be aligned unless using Neon branch-aware storage and matching branch semantics; document actual process after test.
- Candidate audit log retention 90 days; login failure keys 7 days. These are not final policy until owner confirms privacy/support needs.

### Monitoring and alerts

No external monitoring vendor chosen. Initial needs: HTTP health check, latest deployment status, API 5xx rate, login throttling events, storage 503, DB connection/timeouts, Vercel/Neon quotas. Avoid detailed PII in third-party logs. Vercel Hobby runtime log retention is limited per docs (check current page at setup); export metrics/logs may need paid plan/vendor. Do not make “online” status claim until real health data exists.

### Incident runbook outline

1. Identify symptom from monitor/deployment log without copying credentials or full request bodies.
2. Decide whether issue is frontend, API, DB, storage or provider quota. Pause publish/upload if data integrity is uncertain.
3. Roll back code only if schema compatibility allows; otherwise deploy compatible hotfix. Do not roll DB back casually; restore from snapshot/export only after owner understands data loss window.
4. For compromised admin, revoke sessions and rotate credentials. For draft leakage, unpublish and disable relevant bucket/URL path, then review access logs.
5. Confirm public routes/API no longer leak draft; document timeline, effect, root cause, and follow-up changes.

## Pertanyaan untuk pemilik / keputusan sebelum coding

| ID | Pertanyaan | Default proposal | Dampak |
|---|---|---|---|
| Q1 | Provider dan remote Git mana yang akan meng-host repository `Indra`? | Root `Indra` sudah diinisialisasi lokal; jangan sentuh `Syifa`. | Vercel belum dapat mengimpor repo atau membuat deployment dari commit. |
| Q2 | Apakah situs murni portofolio personal/non-komersial sesuai Vercel Hobby terms? | Gunakan Hobby hanya bila owner memastikan sesuai terms; jika ragu, evaluasi paid plan/provider lain. | Menentukan target biaya dan keabsahan plan. |
| Q3 | Domain/brand/URL admin apa yang dipakai? | Satu domain utama dan same-origin `/api`. | Cookie, CSP, Origin allowlist, SEO canonical, rewrite. |
| Q4 | Apakah field profil, lokasi, status tersedia dan CV perlu publik? | Lokasi/status/CV opsional; hide until approved. | Privacy and contact surface. |
| Q5 | Apakah kursus dan sertifikasi satu halaman dengan sections atau rute terpisah? | Satu `/pendidikan` untuk MVP; memisahkan section. | Navigation and content model unchanged. |
| Q6 | Apakah form kontak perlu menyimpan inbox di admin, atau cukup mailto/email langsung? | Direct email/mailto; no DB inbox. | Form inbox adds PII, spam defence, notification/delivery, retention, delete/export, and service dependency. |
| Q7 | Apakah pengalaman dimasukkan dengan tanggal tahun saja atau bulan/tanggal presisi? | Simpan month/year precision yang tersedia; never invent day. | DB date fields and display labels. |
| Q8 | Untuk project skill, apakah hubungan ke stack umum wajib atau snapshot label per proyek? | Maintain relation plus name snapshot to preserve historical tech wording. | Schema is slightly more complex; API already supports skill IDs. |
| Q9 | Berapa lama idle/absolute session dan apakah admin web perlu MFA/passkey? | 30 min idle / 12 h absolute; strong password + Vercel/Neon MFA. | User friction/security posture. |
| Q10 | Siapa yang menyimpan backup dan di mana? | Owner-managed encrypted export + separate media archive, cadence initially weekly. | Data-loss tolerance / cost. |
| Q11 | Apakah prototype localStorage pernah diubah dengan isi milik sendiri? | Audit source seed only; never assume browser data exists. | If yes, owner exports JSON and migration uses dry-run. |
| Q12 | Apakah screenshots/brand/company names have permission to publish? | Require owner review for each asset/claim. | Go-live gate. |

## Assumptions register

- Bahasa default website/admin adalah Bahasa Indonesia.
- Hanya satu admin pada MVP dan tidak ada pendaftaran publik.
- “Pengalaman” dan “Riwayat Pekerjaan” berbeda penyajian, satu sumber `experiences`.
- Kebutuhan update konten melalui panel berarti server-side data source, bukan rebuild manual.
- Screenshot dan file publik merupakan media yang disetujui; belum ada fakta/screenshot asli yang diimpor.
- Endpoint Neon yang diberikan pemilik berada di `us-east-2` (Ohio); Singapore hanya kandidat lama dalam rancangan, bukan target akun aktual atau persyaratan residensi.
- Semua harga/limits/availability cepat berubah. Nilai yang tertulis adalah snapshot referensi docs pada 19 Nov 2026, bukan kontrak layanan.

## Criteria to revisit architecture

Revisit provider/topology if one of: Python runtime loses/changes Beta capability; cold-start p75 exceeds the agreed budget; object storage cannot safely separate draft/published objects; function quota forecast approaches cap; site use expands commercially; app needs more admin/users/MFA workflow; inbox contact or private client case studies are required; object storage/data backup cannot be restored within accepted RPO/RTO.

# Kualitas dan Operasi

**Status:** implementasi lokal; belum ada deployment production atau recovery drill.

## Panduan aktif

- [Onboarding developer](developer-onboarding.md): versi runtime, environment, struktur, dan perintah kerja.
- [Panduan admin](admin-guide.md): login, pengelolaan konten, media, dan reset password.
- [Runbook operasi](operations-runbook.md): deployment, migrasi, rollback, backup, keamanan, pemantauan, dan biaya.
- [Integritas konten, accessibility, dan SEO](content-integrity.md): fakta yang perlu diverifikasi dan checklist pemeliharaan.
- [Kontrak lintas fase](cross-phase-contract.md): API freeze, lifecycle publikasi, session path, dan status bukti/regression.
- [Laporan fase 10](implementation-phase-10-report.md): status handoff dan recovery drill.

## Gate sebelum rilis

- Verifikasi profil, foto, riwayat, sertifikasi, proyek, izin publikasi, tautan, dan alt text dengan pemilik.
- Selesaikan keyboard, zoom/reflow, accessibility, SEO, CRUD, autentikasi, serta upload pada preview yang terisolasi.
- Siapkan backup database dan objek yang terverifikasi; lakukan restore drill ke lingkungan nonproduction.
- Lakukan deployment preview dan rollback aplikasi. Review migrasi sebelum menyentuh production.
- Siapkan pemantauan health/readiness, error 5xx, kuota database/storage, serta kontak pemilik insiden.

Kriteria tersebut belum dianggap lulus hanya karena prosedurnya terdokumentasi. Lihat laporan fase 10 untuk status bukti yang tersedia.

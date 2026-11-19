# Ringkasan Proyek

**Status:** MVP diimplementasikan secara lokal; deployment production belum dilakukan  
**Pemilik:** Indra Rasyid  
**Bahasa situs:** Indonesia

## Tujuan

Membangun situs portofolio programmer yang menampilkan identitas, pengalaman, pendidikan, sertifikasi, kemampuan, dan proyek. Pemilik dapat memperbarui konten melalui panel admin tanpa mengubah HTML secara manual.

## Status saat ini

- Kebutuhan produk awal tercatat dalam [brief portofolio](../01-product/portfolio-brief.md).
- Pembagian halaman dan arah editorial terminal tercatat di [struktur konten](../02-design-and-content/content-structure.md) dan [arah visual](../02-design-and-content/visual-direction.md).
- Prototype historis satu-halaman tersedia di [folder prototype repository](../../prototype/README.md); salinan demo multi-halaman yang dirujuk terpisah berada di `C:\Users\indra\Downloads\indra-terminal-portfolio`. Keduanya hanya referensi visual, bukan sumber konten aplikasi. Bandingkan pada [audit referensi prototype](../portfolio-terminal/01-reference-audit.md#rekonsiliasi-referensi-prototipe-dan-file-lokal).
- [Prototipe Figma awal](https://www.figma.com/design/laPbFUjnYTdEFX5ks9FsEI) masih dummy berbahasa Inggris dan belum memuat foto profil final.
- Stack lokal telah dipilih: Astro SSR, FastAPI, PostgreSQL, Neon, dan object storage S3-compatible. Schema awal telah dimigrasikan pada database dari `DATABASE_DIRECT_URL` lokal (head `b7f4c7a1d2e9`); identitas branch/environment belum diverifikasi. Bucket privat, preview, dan deployment masih belum diverifikasi.
- Ringkasan environment, operasi, risiko, dan prosedur handoff tersedia di [dokumentasi kualitas dan operasi](../05-quality-and-operations/quality-and-operations.md). [Laporan fase 10](../05-quality-and-operations/implementation-phase-10-report.md) mencatat pemeriksaan yang benar-benar dilakukan.
- Konten personal dan proyek belum diverifikasi untuk publikasi; prototype dan fixture lama bukan fakta biografi.

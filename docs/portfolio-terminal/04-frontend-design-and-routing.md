# 04 — Frontend, Desain, dan Routing

## Arah visual yang diturunkan dari referensi

Referensi asli memakai latar charcoal/hijau gelap, teks terang, lime, aksen hangat terbatas, judul serif, sans untuk teks, monospace untuk command/path, garis tipis, halaman dengan komposisi berbeda, dan terminal ilustratif pada beranda. Rancangan menjaga itu sambil mempertahankan fokus manusia: nama + foto mengawali situs, copy singkat, CTA, satu proyek pilihan; katalog lengkap berada di halaman lain.

Teknik visual dipakai jika membantu orientasi: label command menunjukkan konteks halaman, monospace menandai metadata, garis membentuk ritme editorial, terminal panel pada beranda merangkum tautan utama. Scanline fixed tidak menjadi elemen wajib karena dapat mengurangi kejernihan/kontras; rotasi panel hanya eksplorasi dan harus dihilangkan jika menimbulkan pixel clipping. Tidak semua halaman memakai hero terminal atau kartu.

## Design tokens — draft

Warna awal mengikuti prototype terbaru (`assets/style.css`), bukan palette lama yang berbeda sedikit. Finalisasi memerlukan pemeriksaan kontras aktual saat CSS dipakai.

| Token semantik | Nilai draft | Pemakaian |
|---|---|---|
| `--color-canvas` | `#0E140F` | Latar utama |
| `--color-surface` | `#172017` | Form/admin/public surfaces |
| `--color-surface-raised` | `#1E2A20` | Dropdown, panel raised |
| `--color-border` | `#303D31` | Pemisah konten |
| `--color-border-strong` | `#50644F` | Focus / kontur penting setelah uji contrast UI |
| `--color-text` | `#EAECE2` | Body/headline utama |
| `--color-muted` | `#A3B0A0` | Deskripsi body; verifikasi 4.5:1 terhadap surface terpilih |
| `--color-subtle` | `#8B9B89` | Metadata sekunder; hanya jika lolos kontras teks ukuran aktual |
| `--color-accent` | `#C5EF7C` | Aksi utama, prompt/focus/selected; jangan sebagai fill untuk teks putih |
| `--color-warm` | `#E7BF8C` | Aksen informasi kecil, bukan status tunggal |
| `--color-danger` | `#F1A49D` | Error + label/ikon/border |

Kontras final harus memenuhi WCAG 2.2 AA: teks biasa 4.5:1, teks besar 3:1, kontrol/indikator fokus 3:1 terhadap warna sekitar. Hijau accent dengan label tombol gelap, misalnya `#172015`, dan bukan teks putih. Warna token boleh direvisi setelah menghitung pairing foreground/background aktual. Status Draft/Published/Error selalu punya teks atau ikon selain warna.

Tipografi: serif sistem Georgia sebagai pilihan headline editorial; sans sistem (`system-ui`) untuk paragraf dan form; monospace sistem untuk labels dan metadata. Tidak bergantung pada font eksternal. Ukuran isi dasar 16px, line-height isi 1.6–1.8, panjang baris konten prosa 60–75 karakter, headline memakai `clamp()` dengan batas yang menjaga nama utuh.

Spacing tokens: basis 4/8 px, spasi komponen 8/12/16/24, section 32/48/64/88. Radius hampir nol/segi sedikit untuk kecocokan shell terminal; tidak menghilangkan focus ring. Lebar isi 1160–1220px maksimum; prosa lebih sempit.

## Route/component matrix

| Route | Render | Komponen khusus |
|---|---|---|
| `/` | SSR publik | `HomeIntro`, `FeaturedProjectRow` |
| `/profil` | SSR publik | `ProfileStory`, `ProfileFacts`, `ResumeLink` |
| `/pengalaman` | SSR publik | `PracticeIntro`, `ContributionExcerpt` |
| `/riwayat-pekerjaan` | SSR publik | `ExperienceTimeline` |
| `/pendidikan` | SSR publik | `EducationRecord`, `CourseRecord`, `CertificationRecord` |
| `/proyek` | SSR publik | `ProjectIndex`, optional filter enhancement, `ProjectRow` or varied `ProjectFeature` |
| `/proyek/[slug]` | SSR publik | `CaseStudy`, `ProjectGallery`, next-project link |
| `/tech-stack` | SSR publik | `StackCategory`, `SkillList` |
| `/kontak` | SSR publik | `ContactLinks`, `MailtoAction` |
| `/admin/login` | SSR; `noindex` | `LoginForm`, `InlineError` |
| `/admin/*` | SSR; gated per request | `AdminShell`, collection table/cards, editor, upload manager |

Do not ship broad client-side hydration for the whole public site. Use native links, `details/summary` when it improves disclosure, and short TypeScript modules only for menu toggle, project filter/gallery and admin editor interactions. If a route can remain useful without JavaScript, do so. Use Astro layouts/components to share structure, not to flatten page differences.

## Responsive behavior

Breakpoints are content-driven starting points: 760px for public navigation/major layout collapse, 960–1100px for narrow desktop, and 600–650px for dense admin/editor layouts. Final thresholds must be adjusted through browser checks. On small viewports: one column, photo remains near identity summary, gallery is full width with thumbnails horizontally scrollable only when labeled and keyboard reachable, tables become compact cards, form actions become full-width if helpful, no horizontal page overflow. Touch controls target ≥44×44px.

Zoom and reflow: usable at 320 CSS px and 200% browser zoom. Avoid fixed heights for copy and admin editors. For 400% zoom/equivalent mobile reflow, content order remains logical and no 2D scroll is needed except a gallery thumbnail region if keyboard alternatives exist.

## States

| State | Public | Admin |
|---|---|---|
| Loading | SSR should provide page skeleton only for genuinely deferred media; text content server rendered. | Visible loading state for save/upload; disable duplicate submit and expose status. |
| Empty | Hide optional sections or show a concise “Belum ada …” state only on route where it helps. Home never lists empty placeholders. | Empty collection explains how to add an entry. |
| Error | 404 for absent/unpublished project; retryable generic service error without internal details. | Preserve form values; field-level validation + form-level request failure; session-expired return path. |
| Draft | Never appear in anonymous page/API/sitemap/OG metadata. | Preview only after admin authorization; preview headers `noindex, no-store`. |
| Media failure | Alt/caption and layout fallback retained; don't show broken SVG demo as real portfolio art. | Keep file status and retry/delete controls. |

## SEO and metadata

Each route returns a unique Indonesian `title`, description, canonical and Open Graph title/description/image. Project pages use title + summary and published cover image. Dynamic routes return 404 before emitting canonical if slug absent/unpublished. Generate sitemap from published routes/slug rows only; robots excludes `/admin`, preview, API. Add `robots=noindex,nofollow` meta AND deny indexing through response policy where possible; protect routes with auth separately. Use semantic HTML, one H1, descriptive link text, image alt derived from editor field, locale `id-ID` (HTML `lang="id"`). Use JSON-LD `Person` only for confirmed, publicly approved details; no fabricated schema data.

## Performance budgets (initial acceptance targets)

- Initial route response p75 TTFB ≤800 ms on primary geography after warmup; record cold and warm values separately. Database scale-to-zero can add cold wake latency; report rather than hiding it.
- LCP ≤2.5 s p75 on representative mobile network; CLS ≤0.1; INP ≤200 ms when data is available. Use web.dev Core Web Vitals definitions at implementation time.
- Initial JS ≤50 kB gzip for public route excluding third-party tooling; no third-party runtime analytics unless approved.
- Main portrait/cover responsive image ≤250 kB target; project gallery lazy-load beyond first image. Optimise width/format, include width/height or aspect ratio to reduce layout shifts.
- No localStorage upload or base64 media. Build and function bundles remain bounded.

## Accessibility acceptance baseline

Target WCAG 2.2 AA. Test keyboard-only navigation, focus order, Escape/outside-click menu behavior, visible focus not clipped, status announcements, text zoom/reflow, reduced motion, contrast, alt text and editor errors. Menu button exposes `aria-expanded` and `aria-controls`; gallery selection uses a button with accessible selected state. Do not auto-play animation; honor `prefers-reduced-motion`. Public list filters can use native links or buttons and preserve URLs/selection semantics. Use tables with caption/headers in wide admin layout and a semantic alternative on mobile.

Related system/API/cache policy: [03](03-system-architecture-and-decisions.md). UX/admin content rules: [02](02-product-scope-and-ux.md). Quality matrix: [11](11-testing-and-acceptance.md).

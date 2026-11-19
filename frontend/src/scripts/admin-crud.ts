type Choice = { value: string; label: string };
type FieldSpec = {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'email' | 'url' | 'select' | 'checkbox' | 'lines' | 'multi';
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  help?: string;
  choices?: Choice[];
};
type AdminRecord = Record<string, unknown> & { id?: string; status?: string; updated_at?: string; is_published?: boolean };
type PageResult = { data: AdminRecord[]; meta?: { total: number; limit: number; offset: number } };

const frame = document.querySelector<HTMLElement>('.admin-layout[data-section][data-api], .admin-frame[data-section][data-api]');
const kind = frame?.dataset.section ?? '';
const apiName = frame?.dataset.api ?? '';
const editor = document.querySelector<HTMLElement>('#admin-editor');
const listPanel = document.querySelector<HTMLElement>('#admin-list-panel');
const tableHead = document.querySelector<HTMLTableSectionElement>('#admin-table-head');
const tableBody = document.querySelector<HTMLTableSectionElement>('#admin-table-body');
const message = document.querySelector<HTMLElement>('#admin-message');
const pageSize = 20;
let offset = 0;
let csrfToken = '';
let searchTimer: number | undefined;
let currentRecord: AdminRecord | null = null;
let editorMode: 'create' | 'edit' = 'create';
let collectionMode: 'skills' | 'categories' = 'skills';
let currentFields: FieldSpec[] = [];
let baseline = '';
let categories: AdminRecord[] = [];
let skillChoices: Choice[] = [];
let experienceChoices: Choice[] = [];
let activeMediaUpload: XMLHttpRequest | null = null;

const specs: Record<string, FieldSpec[]> = {
  profile: [
    { name: 'name', label: 'Nama lengkap / nama tampilan', required: true, maxLength: 120 },
    { name: 'role', label: 'Jabatan / profesi', required: true, maxLength: 160, help: 'Contoh: Backend Developer, Software Engineer.' },
    { name: 'headline', label: 'Headline profesional', required: true, maxLength: 240, help: 'Ringkasan spesialisasi seperti headline LinkedIn.' },
    { name: 'intro', label: 'Ringkasan pengalaman', required: true, maxLength: 1200, type: 'textarea' },
    { name: 'about', label: 'Tentang dan perjalanan profesional', type: 'textarea', help: 'Ceritakan fokus, pengalaman, dan cara kerja. Teks biasa; HTML tidak dirender.' },
    { name: 'location', label: 'Lokasi', maxLength: 120 },
    { name: 'availability', label: 'Ketersediaan', maxLength: 160 },
    { name: 'public_email', label: 'Email publik', type: 'email', help: 'Email ini akan terlihat pengunjung ketika profil diterbitkan.' },
    { name: 'github_url', label: 'GitHub', type: 'url' },
    { name: 'linkedin_url', label: 'LinkedIn', type: 'url' },
    { name: 'cv_url', label: 'URL CV', type: 'url' },
  ],
  projects: [
    { name: 'title', label: 'Judul proyek', required: true, maxLength: 120 },
    { name: 'slug', label: 'Slug URL', required: true, maxLength: 140, help: 'Huruf kecil, angka, dan tanda hubung.' },
    { name: 'subtitle', label: 'Subjudul', maxLength: 180 },
    { name: 'project_type', label: 'Jenis proyek', type: 'select', required: true, choices: [{ value: 'web', label: 'Web' }, { value: 'mobile', label: 'Mobile' }, { value: 'desktop', label: 'Desktop' }, { value: 'api', label: 'API' }, { value: 'other', label: 'Lainnya' }] },
    { name: 'year', label: 'Tahun', type: 'number', required: true, min: 1900, max: 2200 },
    { name: 'role', label: 'Peran', required: true, maxLength: 240 },
    { name: 'summary', label: 'Ringkasan', type: 'textarea', required: true, maxLength: 600 },
    { name: 'challenge', label: 'Tantangan', type: 'textarea' },
    { name: 'solution', label: 'Solusi', type: 'textarea' },
    { name: 'outcome', label: 'Hasil', type: 'textarea' },
    { name: 'demo_url', label: 'URL demo', type: 'url' },
    { name: 'repository_url', label: 'URL repository', type: 'url' },
    { name: 'skill_ids', label: 'Tools & tech stack', type: 'multi', choices: skillChoices, help: 'Pilih tech stack yang digunakan pada proyek ini.' },
    { name: 'experience_ids', label: 'Dikerjakan dalam pengalaman / karier', type: 'multi', choices: experienceChoices, help: 'Pilih pekerjaan, freelance, atau karier yang berkaitan.' },
    { name: 'featured', label: 'Tampilkan sebagai proyek unggulan', type: 'checkbox', help: 'Maksimal satu proyek unggulan dapat diterbitkan.' },
    { name: 'sort_order', label: 'Urutan tampil', type: 'number', min: 0 },
  ],
  experiences: [
    { name: 'role', label: 'Jabatan / peran', required: true, maxLength: 180 },
    { name: 'organization', label: 'Perusahaan / organisasi', required: true, maxLength: 180 },
    { name: 'employment_type', label: 'Jenis pekerjaan', type: 'select', required: true, choices: [{ value: 'full_time', label: 'Penuh waktu' }, { value: 'part_time', label: 'Paruh waktu' }, { value: 'contract', label: 'Kontrak' }, { value: 'internship', label: 'Magang' }, { value: 'freelance', label: 'Freelance' }, { value: 'other', label: 'Lainnya' }] },
    { name: 'location', label: 'Lokasi', maxLength: 140 },
    { name: 'start_year', label: 'Tahun mulai', type: 'number', required: true, min: 1900, max: 2200 },
    { name: 'start_month', label: 'Bulan mulai', type: 'select', choices: monthChoices() },
    { name: 'end_year', label: 'Tahun selesai', type: 'number', min: 1900, max: 2200, help: 'Kosongkan tahun dan bulan jika masih berlangsung.' },
    { name: 'end_month', label: 'Bulan selesai', type: 'select', choices: monthChoices() },
    { name: 'is_current', label: 'Masih bekerja di sini', type: 'checkbox', help: 'Jika dicentang, tanggal selesai dikosongkan.' },
    { name: 'summary', label: 'Deskripsi pekerjaan', type: 'textarea', required: true, maxLength: 2000 },
    { name: 'highlights', label: 'Pencapaian / tanggung jawab', type: 'lines', help: 'Satu poin per baris; setiap baris disimpan sebagai teks biasa.' },
    { name: 'skill_ids', label: 'Tools & tech stack yang digunakan', type: 'multi', choices: skillChoices, help: 'Centang semua teknologi dan tools yang digunakan pada pekerjaan ini.' },
    { name: 'sort_order', label: 'Urutan tampil', type: 'number', min: 0 },
  ],
  education: [
    { name: 'kind', label: 'Jenis riwayat', type: 'select', required: true, choices: [{ value: 'formal', label: 'Pendidikan formal' }, { value: 'course', label: 'Course' }, { value: 'certification', label: 'Sertifikasi' }] },
    { name: 'title', label: 'Nama pendidikan / course / sertifikasi', required: true, maxLength: 180 },
    { name: 'institution', label: 'Institusi / penerbit', required: true, maxLength: 180 },
    { name: 'start_year', label: 'Tahun mulai', type: 'number', min: 1900, max: 2200 },
    { name: 'start_month', label: 'Bulan mulai', type: 'select', choices: monthChoices() },
    { name: 'end_year', label: 'Tahun selesai', type: 'number', min: 1900, max: 2200 },
    { name: 'end_month', label: 'Bulan selesai', type: 'select', choices: monthChoices() },
    { name: 'description', label: 'Deskripsi', type: 'textarea', maxLength: 2000 },
    { name: 'proof_url', label: 'URL bukti / sertifikat', type: 'url' },
    { name: 'credential_id', label: 'ID kredensial', maxLength: 180 },
    { name: 'sort_order', label: 'Urutan tampil', type: 'number', min: 0 },
  ],
  skills: [
    { name: 'category_id', label: 'Kategori', type: 'select', required: true, choices: [] },
    { name: 'name', label: 'Nama teknologi / tool', required: true, maxLength: 100 },
    { name: 'note', label: 'Catatan penggunaan', maxLength: 240, help: 'Contoh konteks pemakaian; bukan skor kemampuan.' },
    { name: 'sort_order', label: 'Urutan tampil', type: 'number', min: 0 },
  ],
  categories: [
    { name: 'label', label: 'Nama kategori', required: true, maxLength: 100 },
    { name: 'slug', label: 'Slug kategori', required: true, maxLength: 80 },
    { name: 'sort_order', label: 'Urutan tampil', type: 'number', min: 0 },
  ],
};

function monthChoices(): Choice[] {
  return [{ value: '', label: '—' }, ...Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(2020, index, 1)) }))];
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function apiUrl(path: string): string {
  return `/api/v1/admin/${path}`;
}

async function getSessionToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const response = await fetch('/api/v1/auth/session', { credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (response.status === 401) { window.location.replace(`/admin/login?returnTo=${encodeURIComponent(location.pathname)}&expired=1`); throw new Error('Sesi berakhir.'); }
  if (!response.ok) throw new Error('Sesi tidak dapat diverifikasi. Coba lagi.');
  const session = await response.json() as { csrf_token?: string };
  if (!session.csrf_token) throw new Error('Token sesi tidak tersedia. Muat ulang halaman.');
  csrfToken = session.csrf_token;
  return csrfToken;
}

async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.method && options.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
    headers.set('X-CSRF-Token', await getSessionToken());
  }
  const response = await fetch(apiUrl(path), { ...options, headers, credentials: 'same-origin', cache: 'no-store' });
  if (response.status === 401) {
    csrfToken = '';
    window.location.replace(`/admin/login?returnTo=${encodeURIComponent(location.pathname)}&expired=1`);
    throw new Error('Sesi berakhir. Silakan masuk kembali.');
  }
  if (!response.ok) {
    let errorMessage = 'Permintaan gagal. Periksa kembali data lalu coba lagi.';
    try {
      const body = await response.json() as { error?: { message?: string; fields?: Array<{ path?: string; message?: string }> }; detail?: string };
      errorMessage = body.error?.message ?? body.error?.fields?.map((item) => `${item.path || 'Isian'}: ${item.message}`).join(' ') ?? body.detail ?? errorMessage;
    } catch { /* Keep the local fallback. */ }
    throw new Error(response.status === 409 ? `${errorMessage} Muat ulang data sebelum menyimpan.` : errorMessage);
  }
  if (response.status === 204) return null;
  return response.json();
}

function setMessage(text: string, tone: 'success' | 'error' | 'info' = 'info'): void {
  if (!message) return;
  message.hidden = !text;
  if (text) message.dataset.message = text;
  else delete message.dataset.message;
  message.className = `admin-message is-${tone}`;
  message.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  message.setAttribute('aria-live', tone === 'error' ? 'assertive' : 'polite');
  message.setAttribute('aria-atomic', 'true');
  message.replaceChildren();
  if (!text) return;

  const mark = el('span', 'admin-message-mark', tone === 'success' ? '✓' : tone === 'error' ? '!' : 'i');
  mark.setAttribute('aria-hidden', 'true');
  const copy = el('div', 'admin-message-copy');
  const label = el('strong', 'admin-message-label', tone === 'success' ? 'Berhasil' : tone === 'error' ? 'Terjadi kendala' : 'Informasi');
  const detail = el('p', undefined, text);
  copy.append(label, detail);
  const close = el('button', 'admin-message-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Tutup notifikasi');
  close.addEventListener('click', () => { message.hidden = true; message.replaceChildren(); });
  message.append(mark, copy, close);
}

function fieldsForEditor(): FieldSpec[] {
  if (kind === 'skills' && collectionMode === 'categories') return specs.categories ?? [];
  if (kind === 'skills') {
    const choices = categories.map((item) => ({ value: String(item.id), label: String(item.label) }));
    return (specs.skills ?? []).map((field) => field.name === 'category_id' ? { ...field, choices } : field);
  }
  if (kind === 'projects') return (specs.projects ?? []).map((field) => field.name === 'skill_ids' ? { ...field, choices: skillChoices } : field.name === 'experience_ids' ? { ...field, choices: experienceChoices } : field);
  if (kind === 'experiences') return (specs.experiences ?? []).map((field) => field.name === 'skill_ids' ? { ...field, choices: skillChoices } : field);
  return specs[kind] ?? [];
}

function buildControl(field: FieldSpec, value: unknown): HTMLElement {
  const type = field.type ?? 'text';
  if (type === 'multi') {
    const group = el('div', 'admin-multi-choice-group');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', field.label);
    const selected = Array.isArray(value) ? value.map(String) : [];
    for (const [index, choice] of (field.choices ?? []).entries()) {
      const option = el('label', 'admin-multi-option');
      const checkbox = el('input') as HTMLInputElement;
      checkbox.type = 'checkbox';
      checkbox.name = field.name;
      checkbox.value = choice.value;
      checkbox.checked = selected.includes(choice.value);
      checkbox.id = `field-${field.name}-${index}`;
      checkbox.dataset.multiField = field.name;
      const label = el('span', undefined, choice.label);
      option.htmlFor = checkbox.id;
      option.append(checkbox, label);
      group.append(option);
    }
    return group;
  }
  let control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  if (type === 'textarea' || type === 'lines') {
    const textarea = el('textarea');
    textarea.rows = type === 'lines' ? 5 : 4;
    textarea.value = Array.isArray(value) ? value.join('\n') : String(value ?? '');
    control = textarea;
  } else if (type === 'select') {
    const select = el('select');
    const blank = el('option', undefined, 'Pilih…');
    blank.value = '';
    select.append(blank);
    for (const choice of field.choices ?? []) {
      const option = el('option', undefined, choice.label);
      option.value = choice.value;
      option.selected = String(value ?? '') === choice.value;
      select.append(option);
    }
    control = select;
  } else {
    const input = el('input');
    input.type = type === 'checkbox' ? 'checkbox' : type === 'number' ? 'number' : type === 'email' ? 'email' : type === 'url' ? 'url' : 'text';
    if (type === 'checkbox') input.checked = Boolean(value);
    else input.value = value === null || value === undefined ? '' : String(value);
    control = input;
  }
  control.name = field.name;
  control.id = `field-${field.name}`;
  control.required = Boolean(field.required);
  if (field.maxLength && control instanceof HTMLInputElement) control.maxLength = field.maxLength;
  if (field.maxLength && control instanceof HTMLTextAreaElement) control.maxLength = field.maxLength;
  if (field.min !== undefined && control instanceof HTMLInputElement) control.min = String(field.min);
  if (field.max !== undefined && control instanceof HTMLInputElement) control.max = String(field.max);
  if (control instanceof HTMLInputElement && control.type === 'number') control.step = '1';
  return control;
}

function readForm(form: HTMLFormElement): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of currentFields) {
    if (field.type === 'multi') {
      data[field.name] = Array.from(
        form.querySelectorAll<HTMLInputElement>(`input[data-multi-field="${field.name}"]:checked`),
        (input) => input.value,
      );
      continue;
    }
    const control = form.elements.namedItem(field.name);
    if (control instanceof HTMLInputElement && control.type === 'checkbox') data[field.name] = control.checked;
    else if (control instanceof HTMLSelectElement && control.multiple) data[field.name] = Array.from(control.selectedOptions, (item) => item.value);
    else if (control instanceof HTMLSelectElement) data[field.name] = control.value === '' ? null : Number.isNaN(Number(control.value)) ? control.value : Number(control.value);
    else if (control instanceof HTMLInputElement && control.type === 'number') data[field.name] = control.value === '' ? null : Number(control.value);
    else if (control instanceof HTMLTextAreaElement && field.type === 'lines') data[field.name] = control.value.split('\n').map((line) => line.trim()).filter(Boolean);
    else if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
      const text = control.value.trim();
      data[field.name] = text === '' ? null : text;
    }
  }
  const iconAsset = form.elements.namedItem('icon_asset_id');
  if (iconAsset instanceof HTMLInputElement) data.icon_asset_id = iconAsset.value || null;
  return data;
}

function updateDirtyState(form: HTMLFormElement): void {
  const dirty = JSON.stringify(readForm(form)) !== baseline;
  form.dataset.dirty = String(dirty);
  const saveButton = form.querySelector<HTMLButtonElement>('[type="submit"]');
  if (saveButton) saveButton.textContent = dirty ? 'Simpan perubahan' : 'Simpan';
}

function appendField(form: HTMLFormElement, field: FieldSpec, value: unknown): void {
  const wrapper = el(field.type === 'multi' ? 'div' : 'label', `admin-field${field.type === 'checkbox' ? ' admin-field-checkbox' : ''}`);
  if (wrapper instanceof HTMLLabelElement) wrapper.htmlFor = `field-${field.name}`;
  const title = el('span', 'admin-field-title', field.label);
  title.id = `field-label-${field.name}`;
  if (field.required) title.append(el('span', 'required-mark', ' *'));
  const control = buildControl(field, value);
  if (field.type === 'multi') control.setAttribute('aria-labelledby', title.id);
  wrapper.append(title, control);
  if (field.help) wrapper.append(el('small', 'admin-help', field.help));
  form.append(wrapper);
}

function currentEndpoint(): string {
  if (kind === 'skills' && collectionMode === 'categories') return 'skill-categories';
  if (kind === 'skills') return 'skills';
  return apiName;
}

function recordFields(): FieldSpec[] {
  return fieldsForEditor();
}

function showEditor(record: AdminRecord | null): void {
  if (!editor || !listPanel) return;
  currentRecord = record;
  editorMode = record?.id ? 'edit' : 'create';
  currentFields = recordFields();
  editor.replaceChildren();
  editor.hidden = false;
  listPanel.hidden = true;
  const top = el('div', 'editor-heading');
  const eyebrow = el('p', 'section-kicker', record?.id ? 'EDIT / KONTEN TERSIMPAN' : 'NEW / DRAFT BARU');
  const title = el('h2', undefined, record?.id ? String(record.title ?? record.name ?? record.label ?? record.role ?? 'Ubah entri') : kind === 'profile' ? 'Informasi profil' : 'Entri baru');
  top.append(eyebrow, title);
  if (kind !== 'profile') {
    const close = el('button', 'admin-button admin-button-quiet', 'Kembali ke daftar');
    close.type = 'button';
    close.addEventListener('click', closeEditor);
    top.append(close);
  }
  const form = el('form', 'admin-form');
  form.noValidate = false;
  if (kind === 'projects' && editorMode === 'create') {
    const note = el('p', 'admin-form-note', 'Gambar proyek opsional. Simpan draft terlebih dahulu, lalu unggah satu atau beberapa gambar pada bagian Gambar proyek.');
    form.append(note);
  }
  for (const field of currentFields) appendField(form, field, record?.[field.name]);
  if (kind === 'projects' && record?.id) form.append(buildProjectMediaManager(record));
  if (kind === 'skills' && collectionMode === 'skills' && record?.id) form.append(buildSkillImageManager(record));
  if (kind === 'profile') form.append(buildProfilePhotoManager(record));
  const footer = el('div', 'admin-form-actions');
  const status = String(record?.status ?? (record?.is_published ? 'published' : 'draft'));
  const statusText = el('span', 'admin-record-state', record ? `Status: ${status === 'published' || record.is_published ? 'Dipublikasikan' : 'Draft'}` : 'Entri baru akan tersimpan sebagai draft.');
  const controls = el('div', 'admin-form-buttons');
  const save = el('button', 'admin-button admin-button-primary', 'Simpan');
  save.type = 'submit';
  const cancel = el('button', 'admin-button admin-button-quiet', 'Batal');
  cancel.type = 'button';
  cancel.addEventListener('click', closeEditor);
  controls.append(save, cancel);
  if (record?.id && kind !== 'profile') {
    const publish = el('button', 'admin-button admin-button-state', status === 'published' || record.is_published ? 'Tarik dari publik' : 'Terbitkan');
    publish.type = 'button';
    publish.addEventListener('click', () => changePublication(record));
    controls.append(publish);
    const remove = el('button', 'admin-button admin-button-danger', 'Hapus');
    remove.type = 'button';
    remove.addEventListener('click', () => deleteRecord(record));
    controls.append(remove);
  } else if (record && kind === 'profile' && record.updated_at) {
    const publish = el('button', 'admin-button admin-button-state', status === 'published' ? 'Tarik dari publik' : 'Terbitkan profil');
    publish.type = 'button';
    publish.addEventListener('click', () => changePublication(record));
    controls.append(publish);
  }
  footer.append(statusText, controls);
  form.append(footer);
  form.addEventListener('input', () => updateDirtyState(form));
  form.addEventListener('change', () => updateDirtyState(form));
  if (kind === 'experiences') {
    const current = form.elements.namedItem('is_current');
    const endYear = form.elements.namedItem('end_year');
    const endMonth = form.elements.namedItem('end_month');
    const syncCurrent = () => {
      const checked = current instanceof HTMLInputElement && current.checked;
      if (endYear instanceof HTMLInputElement) { endYear.disabled = checked; if (checked) endYear.value = ''; }
      if (endMonth instanceof HTMLSelectElement) { endMonth.disabled = checked; if (checked) endMonth.value = ''; }
    };
    if (current instanceof HTMLInputElement) current.addEventListener('change', syncCurrent);
    syncCurrent();
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = readForm(form);
    const original = currentRecord;
    if (editorMode === 'edit' && original?.updated_at) data.expected_updated_at = original.updated_at;
    save.disabled = true;
    setMessage('Menyimpan perubahan…');
    try {
      const path = kind === 'profile' ? 'profile' : `${currentEndpoint()}${editorMode === 'edit' && original?.id ? `/${original.id}` : ''}`;
      const result = await request(path, { method: kind === 'profile' || editorMode === 'edit' ? 'PUT' : 'POST', body: JSON.stringify(data) }) as AdminRecord;
      currentRecord = result;
      setMessage(
        result.status === 'published' || result.is_published === true
          ? 'Perubahan tersimpan dan konten tetap tampil di publik.'
          : 'Perubahan berhasil disimpan sebagai draft.',
        'success',
      );
      await refreshList();
      if (kind === 'profile') showEditor(result);
      else showEditor(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Perubahan gagal disimpan.', 'error');
      save.disabled = false;
    }
  });
  baseline = JSON.stringify(readForm(form));
  editor.append(top, form);
  form.querySelector<HTMLElement>('input,textarea,select')?.focus();
}

function buildProfilePhotoManager(record: AdminRecord | null): HTMLElement {
  const section = el('section', 'media-manager');
  section.setAttribute('aria-labelledby', 'profile-photo-heading');
  const heading = el('h3', undefined, 'Foto profil');
  heading.id = 'profile-photo-heading';
  const copy = el('p', 'admin-help', 'JPEG, PNG, atau WebP · maksimal 8 MiB. Foto baru menggantikan foto profil saat ini.');
  const status = el('p', 'media-upload-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const image = el('img', 'media-preview') as HTMLImageElement;
  let assetId = String(record?.portrait_asset_id ?? '');
  image.alt = 'Pratinjau foto profil';
  image.hidden = !assetId;
  if (assetId) image.src = `/api/v1/admin/media/${encodeURIComponent(assetId)}/preview`;
  const alt = el('input') as HTMLInputElement;
  alt.type = 'text'; alt.maxLength = 180; alt.placeholder = 'Deskripsikan subjek foto';
  alt.setAttribute('aria-label', 'Teks alternatif foto profil');
  const caption = el('input') as HTMLInputElement;
  caption.type = 'text'; caption.maxLength = 240; caption.placeholder = 'Keterangan yang tampil di profil (opsional)';
  caption.setAttribute('aria-label', 'Keterangan foto profil');
  const altField = el('label', 'media-metadata-field');
  altField.htmlFor = 'profile-photo-alt';
  alt.id = 'profile-photo-alt';
  altField.append(el('span', 'admin-field-title', 'Teks alternatif'), alt, el('small', 'admin-help', 'Dibaca oleh pembaca layar untuk menjelaskan foto.'));
  const captionField = el('label', 'media-metadata-field');
  captionField.htmlFor = 'profile-photo-caption';
  caption.id = 'profile-photo-caption';
  captionField.append(el('span', 'admin-field-title', 'Keterangan foto'), caption, el('small', 'admin-help', 'Opsional; ditampilkan sebagai caption di halaman profil.'));
  const metadataFields = el('div', 'media-metadata-grid');
  metadataFields.append(altField, captionField);
  const saveText = el('button', 'admin-button admin-button-quiet', 'Simpan teks foto');
  saveText.type = 'button';
  saveText.disabled = !assetId;
  saveText.addEventListener('click', async () => {
    if (!assetId || !alt.value.trim()) { status.textContent = 'Teks alternatif perlu diisi.'; return; }
    saveText.disabled = true;
    try {
      await request(`media/${encodeURIComponent(assetId)}`, { method: 'PATCH', body: JSON.stringify({ alt_text: alt.value.trim(), caption: caption.value.trim() || null }) });
      status.textContent = 'Teks foto berhasil diperbarui.';
    } catch (error) { status.textContent = error instanceof Error ? error.message : 'Teks foto gagal disimpan.'; }
    finally { saveText.disabled = false; }
  });
  if (assetId) {
    void request(`media/${encodeURIComponent(assetId)}`).then((asset) => {
      const media = asset as AdminRecord;
      alt.value = String(media.alt_text ?? ''); caption.value = String(media.caption ?? '');
    }).catch(() => { status.textContent = 'Metadata foto belum dapat dimuat.'; });
  }
  const picker = el('input') as HTMLInputElement;
  picker.type = 'file';
  picker.accept = 'image/jpeg,image/png,image/webp';
  picker.multiple = false;
  picker.id = 'profile-photo-picker';
  picker.className = 'visually-hidden';
  picker.setAttribute('aria-label', 'Pilih foto profil');
  const browse = el('button', 'admin-button admin-button-secondary', assetId ? 'Ganti foto' : 'Pilih foto');
  browse.type = 'button';
  browse.addEventListener('click', () => picker.click());
  const cancelUpload = el('button', 'admin-button admin-button-quiet', 'Batalkan unggahan');
  cancelUpload.type = 'button'; cancelUpload.hidden = true;
  cancelUpload.addEventListener('click', () => activeMediaUpload?.abort());
  picker.addEventListener('change', async () => {
    const file = picker.files?.[0];
    if (!file) return;
    browse.disabled = true;
    cancelUpload.hidden = false;
    try {
      const uploaded = await uploadMediaFile(file, { target: 'profile', alt_text: alt.value.trim(), caption: caption.value.trim() || null }, (text) => { status.textContent = text; });
      image.src = `${String(uploaded.url)}?v=${Date.now()}`;
      image.hidden = false;
      status.textContent = 'Foto profil berhasil disimpan.';
      browse.textContent = 'Ganti foto';
      assetId = String(uploaded.id ?? '');
      alt.value = String(uploaded.alt_text ?? alt.value);
      saveText.disabled = false;
      currentRecord = await request('profile') as AdminRecord;
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Unggahan gagal. Pilih ulang untuk mencoba lagi.';
    } finally {
      browse.disabled = false;
      cancelUpload.hidden = true;
      picker.value = '';
    }
  });
  section.append(heading, copy, image, metadataFields, picker, browse, cancelUpload, saveText, status);
  return section;
}

function buildProjectMediaManager(record: AdminRecord): HTMLElement {
  const projectId = String(record.id);
  const section = el('section', 'media-manager');
  section.setAttribute('aria-labelledby', 'project-media-heading');
  const heading = el('h3', undefined, 'Gambar proyek');
  heading.id = 'project-media-heading';
  const copy = el('p', 'admin-help', 'Maksimal 12 gambar per proyek, 6 dalam satu batch. Draft tetap privat sampai proyek diterbitkan.');
  const toolbar = el('div', 'media-toolbar');
  const picker = el('input') as HTMLInputElement;
  picker.type = 'file';
  picker.accept = 'image/jpeg,image/png,image/webp';
  picker.multiple = true;
  picker.id = 'project-image-picker';
  picker.className = 'visually-hidden';
  const browse = el('button', 'admin-button admin-button-secondary', 'Pilih gambar');
  browse.type = 'button';
  browse.addEventListener('click', () => picker.click());
  const cancelUpload = el('button', 'admin-button admin-button-quiet', 'Batalkan unggahan');
  cancelUpload.type = 'button'; cancelUpload.hidden = true;
  cancelUpload.addEventListener('click', () => activeMediaUpload?.abort());
  const retryUpload = el('button', 'admin-button admin-button-quiet', 'Coba lagi');
  retryUpload.type = 'button'; retryUpload.hidden = true;
  let failedFiles: File[] = [];
  const status = el('p', 'media-upload-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const list = el('ol', 'media-list');
  list.setAttribute('aria-label', 'Gambar proyek tersimpan');
  const refresh = async () => {
    list.replaceChildren();
    try {
      const assets = await request(`projects/${encodeURIComponent(projectId)}/images`) as Array<AdminRecord & { url?: string }>;
      if (!assets.length) {
        list.append(el('li', 'media-empty', 'Belum ada gambar. Proyek dapat tetap disimpan sebagai draft tanpa gambar.'));
        return;
      }
      assets.forEach((asset, index) => {
        const item = el('li', 'media-item');
        const preview = el('img', 'media-preview') as HTMLImageElement;
        preview.src = String(asset.url ?? '');
        preview.alt = String(asset.alt_text ?? 'Pratinjau gambar proyek');
        preview.loading = 'lazy';
        const fields = el('div', 'media-item-fields');
        const alt = el('input') as HTMLInputElement;
        alt.type = 'text'; alt.maxLength = 180; alt.required = true;
        alt.value = String(asset.alt_text ?? '');
        alt.setAttribute('aria-label', `Teks alternatif gambar ${index + 1}`);
        const caption = el('input') as HTMLInputElement;
        caption.type = 'text'; caption.maxLength = 240;
        caption.value = String(asset.caption ?? '');
        caption.setAttribute('aria-label', `Keterangan gambar ${index + 1}`);
        const saveMetadata = el('button', 'admin-button admin-button-quiet', 'Simpan teks');
        saveMetadata.type = 'button';
        saveMetadata.addEventListener('click', async () => {
          saveMetadata.disabled = true;
          try {
            await request(`media/${encodeURIComponent(String(asset.id))}`, { method: 'PATCH', body: JSON.stringify({ alt_text: alt.value.trim(), caption: caption.value.trim() || null }) });
            status.textContent = 'Teks gambar berhasil diperbarui.';
          } catch (error) { status.textContent = error instanceof Error ? error.message : 'Teks gambar gagal disimpan.'; }
          finally { saveMetadata.disabled = false; }
        });
        fields.append(alt, caption, saveMetadata);
        const controls = el('div', 'media-item-controls');
        const up = el('button', 'admin-button admin-button-quiet', 'Naik') as HTMLButtonElement;
        up.type = 'button'; up.disabled = index === 0;
        up.setAttribute('aria-label', `Pindahkan gambar ${index + 1} ke atas`);
        const down = el('button', 'admin-button admin-button-quiet', 'Turun') as HTMLButtonElement;
        down.type = 'button'; down.disabled = index === assets.length - 1;
        down.setAttribute('aria-label', `Pindahkan gambar ${index + 1} ke bawah`);
        const cover = el('button', 'admin-button admin-button-quiet', asset.is_cover ? 'Sampul aktif' : 'Jadikan sampul');
        cover.type = 'button'; cover.setAttribute('aria-pressed', String(Boolean(asset.is_cover)));
        const remove = el('button', 'admin-button admin-button-danger', 'Hapus');
        remove.type = 'button';
        const reorder = async (to: number) => {
          const ids = assets.map((entry) => String(entry.id));
          const [moving] = ids.splice(index, 1);
          ids.splice(to, 0, moving!);
          const existingCover = assets.find((entry) => entry.is_cover);
          try {
            await request(`projects/${encodeURIComponent(projectId)}/images/order`, { method: 'PUT', body: JSON.stringify({ image_ids: ids, cover_id: String(existingCover?.id ?? moving) }) });
            await refresh();
          } catch (error) { status.textContent = error instanceof Error ? error.message : 'Urutan gambar gagal disimpan.'; }
        };
        up.addEventListener('click', () => { void reorder(index - 1); });
        down.addEventListener('click', () => { void reorder(index + 1); });
        cover.addEventListener('click', async () => {
          try {
            await request(`projects/${encodeURIComponent(projectId)}/images/order`, { method: 'PUT', body: JSON.stringify({ image_ids: assets.map((entry) => String(entry.id)), cover_id: String(asset.id) }) });
            await refresh();
          } catch (error) { status.textContent = error instanceof Error ? error.message : 'Sampul gagal diubah.'; }
        });
        remove.addEventListener('click', async () => {
          if (!window.confirm('Hapus gambar ini dari proyek?')) return;
          try {
            await request(`projects/${encodeURIComponent(projectId)}/images/${encodeURIComponent(String(asset.id))}`, { method: 'DELETE' });
            status.textContent = 'Gambar dihapus dari proyek.';
            await refresh();
          } catch (error) { status.textContent = error instanceof Error ? error.message : 'Gambar gagal dihapus.'; }
        });
        controls.append(up, down, cover, remove);
        item.append(preview, fields, controls);
        list.append(item);
      });
    } catch (error) { status.textContent = error instanceof Error ? error.message : 'Galeri belum dapat dimuat.'; }
  };
  const uploadSelectedFiles = async (files: File[]) => {
    if (!files.length) return;
    failedFiles = [];
    browse.disabled = true;
    cancelUpload.hidden = false;
    for (let index = 0; index < files.length; index += 1) {
      try {
        await uploadMediaFile(files[index]!, { target: 'project', project_id: projectId, sort_order: list.children.length }, (text) => { status.textContent = `${index + 1}/${files.length} · ${text}`; });
        status.textContent = `${index + 1}/${files.length} gambar berhasil diunggah.`;
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : 'Unggahan gagal. Pilih kembali untuk mencoba ulang.';
        failedFiles = files.slice(index);
        retryUpload.hidden = false;
        break;
      }
    }
    if (!failedFiles.length) retryUpload.hidden = true;
    browse.disabled = false;
    cancelUpload.hidden = true;
    await refresh();
  };
  retryUpload.addEventListener('click', () => { void uploadSelectedFiles(failedFiles); });
  picker.addEventListener('change', async () => {
    const files = Array.from(picker.files ?? []);
    if (!files.length) return;
    if (files.length > 6) { status.textContent = 'Pilih maksimal 6 gambar dalam satu batch.'; picker.value = ''; return; }
    if (files.reduce((total, file) => total + file.size, 0) > 32 * 1024 * 1024) { status.textContent = 'Total ukuran satu batch maksimal 32 MiB.'; picker.value = ''; return; }
    failedFiles = [];
    retryUpload.hidden = true;
    await uploadSelectedFiles(files);
    picker.value = '';
  });
  toolbar.append(picker, browse, cancelUpload, retryUpload);
  section.append(heading, copy, toolbar, status, list);
  void refresh();
  return section;
}

function buildSkillImageManager(record: AdminRecord): HTMLElement {
  const section = el('section', 'media-manager');
  const title = el('h3', undefined, 'Gambar atau ikon teknologi (opsional)');
  const copy = el('p', 'admin-help', 'JPEG, PNG, atau WebP · maksimal 8 MiB. Gambar tidak wajib untuk menerbitkan tech stack.');
  const status = el('p', 'media-upload-status');
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const hiddenId = el('input') as HTMLInputElement;
  hiddenId.type = 'hidden'; hiddenId.name = 'icon_asset_id';
  hiddenId.value = String(record.icon_asset_id ?? '');
  const preview = el('img', 'media-preview') as HTMLImageElement;
  preview.alt = `Gambar ${String(record.name ?? 'tech stack')}`;
  preview.hidden = !hiddenId.value;
  if (hiddenId.value) preview.src = `/api/v1/admin/media/${encodeURIComponent(hiddenId.value)}/preview`;
  const picker = el('input') as HTMLInputElement;
  picker.type = 'file'; picker.accept = 'image/jpeg,image/png,image/webp'; picker.className = 'visually-hidden';
  const choose = el('button', 'admin-button admin-button-secondary', hiddenId.value ? 'Ganti gambar' : 'Pilih gambar');
  choose.type = 'button'; choose.addEventListener('click', () => picker.click());
  const cancel = el('button', 'admin-button admin-button-quiet', 'Batalkan unggahan');
  cancel.type = 'button'; cancel.hidden = true; cancel.addEventListener('click', () => activeMediaUpload?.abort());
  picker.addEventListener('change', async () => {
    const file = picker.files?.[0]; if (!file) return;
    choose.disabled = true; cancel.hidden = false;
    try {
      const uploaded = await uploadMediaFile(file, { target: 'skill', skill_id: record.id, alt_text: `Ikon ${String(record.name ?? 'teknologi')}` }, (message) => { status.textContent = message; });
      hiddenId.value = String(uploaded.id ?? ''); preview.src = `${String(uploaded.url)}?v=${Date.now()}`; preview.hidden = false;
      choose.textContent = 'Ganti gambar'; status.textContent = 'Gambar tech stack tersimpan.';
      currentRecord = await request(`skills/${encodeURIComponent(String(record.id))}`) as AdminRecord;
      const form = section.closest('form');
      if (form instanceof HTMLFormElement) { baseline = JSON.stringify(readForm(form)); form.dataset.dirty = 'false'; }
    } catch (error) { status.textContent = error instanceof Error ? error.message : 'Unggahan gambar gagal.'; }
    finally { choose.disabled = false; cancel.hidden = true; picker.value = ''; }
  });
  section.append(title, copy, hiddenId, preview, picker, choose, cancel, status);
  return section;
}

async function uploadMediaFile(
  file: File,
  metadata: Record<string, unknown>,
  report: (message: string) => void,
): Promise<AdminRecord & { url?: string }> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Pilih berkas JPEG, PNG, atau WebP.');
  if (file.size <= 0 || file.size > 8 * 1024 * 1024) throw new Error('Ukuran gambar maksimal 8 MiB.');
  const intent = await request('media/intents', {
    method: 'POST',
    body: JSON.stringify({
      target: metadata.target,
      project_id: metadata.project_id,
      skill_id: metadata.skill_id,
      alt_text: metadata.alt_text,
      caption: metadata.caption,
      filename: file.name,
      content_type: file.type,
      byte_size: file.size,
    }),
  }) as { asset_id: string; upload_url: string; fields: Record<string, string> };
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    activeMediaUpload = xhr;
    xhr.open('POST', intent.upload_url);
    const formData = new FormData();
    for (const [name, value] of Object.entries(intent.fields)) formData.append(name, value);
    formData.append('file', file);
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) report(`Mengunggah ${Math.round(event.loaded / event.total * 100)}%`); };
    xhr.onload = () => { activeMediaUpload = null; xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Server penyimpanan menolak gambar. Pilih ulang untuk mencoba lagi.')); };
    xhr.onerror = () => { activeMediaUpload = null; reject(new Error('Koneksi unggah terputus. Pilih kembali gambar untuk mencoba lagi.')); };
    xhr.onabort = () => { activeMediaUpload = null; reject(new Error('Unggahan dibatalkan. Pilih kembali gambar untuk mencoba lagi.')); };
    xhr.send(formData);
  });
  return await request(`media/${encodeURIComponent(intent.asset_id)}/complete`, {
    method: 'POST',
    body: JSON.stringify({ project_id: metadata.project_id ?? null, skill_id: metadata.skill_id ?? null, sort_order: metadata.sort_order ?? 0, is_cover: false }),
  }) as AdminRecord & { url?: string };
}

function closeEditor(): void {
  if (editor?.querySelector<HTMLFormElement>('form')?.dataset.dirty === 'true') {
    const accepted = window.confirm('Perubahan belum disimpan. Tutup editor dan buang perubahan?');
    if (!accepted) return;
  }
  if (kind === 'profile') {
    setMessage('Profil belum berubah. Gunakan tombol simpan untuk menyimpan edit.', 'info');
    const profile = currentRecord;
    showEditor(profile);
    return;
  }
  if (!editor || !listPanel) return;
  editor.hidden = true;
  listPanel.hidden = false;
  currentRecord = null;
  setMessage('');
}

async function changePublication(record: AdminRecord): Promise<void> {
  if (editor?.querySelector<HTMLFormElement>('form')?.dataset.dirty === 'true') {
    setMessage('Simpan atau batalkan perubahan editor sebelum mengubah status publikasi.', 'info');
    return;
  }
  if (!record.updated_at) { setMessage('Versi entri tidak tersedia. Muat ulang halaman.', 'error'); return; }
  const isPublished = record.status === 'published' || record.is_published === true;
  const action = isPublished ? 'unpublish' : 'publish';
  const confirmed = await confirmPublication(isPublished);
  if (!confirmed) return;
  try {
    const id = kind === 'profile' ? 'profile' : `${currentEndpoint()}/${record.id}`;
    const updated = await request(`${id}/${action}`, { method: 'POST', body: JSON.stringify({ expected_updated_at: record.updated_at }) }) as AdminRecord;
    setMessage(action === 'publish' ? 'Konten berhasil dipublikasikan dan sekarang tampil di halaman publik.' : 'Konten ditarik dari halaman publik dan kembali menjadi draft.', 'success');
    await refreshList();
    if (kind === 'profile') showEditor(updated);
    else if (editor && !editor.hidden) showEditor(updated);
  } catch (error) { setMessage(error instanceof Error ? error.message : 'Status publikasi gagal diubah.', 'error'); }
}

function confirmPublication(isPublished: boolean): Promise<boolean> {
  const dialog = el('dialog', 'admin-confirm-dialog') as HTMLDialogElement;
  const content = el('div', 'admin-confirm-content');
  const eyebrow = el('p', 'section-kicker', kind === 'profile' ? 'PROFILE / VISIBILITY' : 'CONTENT / VISIBILITY');
  const title = el('h2', undefined, isPublished ? 'Tarik konten dari publik?' : 'Terbitkan ke publik?');
  title.id = 'publication-confirm-title';
  const description = el(
    'p',
    'admin-confirm-description',
    isPublished
      ? 'Konten ini tidak lagi tampil di halaman publik dan statusnya kembali menjadi Draft. Kamu bisa menerbitkannya lagi kapan saja.'
      : kind === 'profile'
        ? 'Profil akan tampil di website publik. Pastikan nama, jabatan, ringkasan, dan informasi kontak sudah sesuai.'
        : 'Konten ini akan tampil di website publik setelah diterbitkan.',
  );
  description.id = 'publication-confirm-description';
  const actions = el('div', 'admin-confirm-actions');
  const cancel = el('button', 'admin-button admin-button-quiet', 'Batal');
  cancel.type = 'button';
  cancel.addEventListener('click', () => dialog.close('cancel'));
  const confirm = el(
    'button',
    isPublished ? 'admin-button admin-button-secondary' : 'admin-button admin-button-primary',
    isPublished ? 'Tarik dari publik' : kind === 'profile' ? 'Terbitkan profil' : 'Terbitkan konten',
  );
  confirm.type = 'button';
  confirm.addEventListener('click', () => dialog.close('confirm'));
  actions.append(cancel, confirm);
  content.append(eyebrow, title, description, actions);
  dialog.setAttribute('aria-labelledby', title.id);
  dialog.setAttribute('aria-describedby', description.id);
  dialog.append(content);
  document.body.append(dialog);
  const result = new Promise<boolean>((resolve) => {
    dialog.addEventListener('close', () => {
      resolve(dialog.returnValue === 'confirm');
      dialog.remove();
    }, { once: true });
  });
  dialog.showModal();
  cancel.focus();
  return result;
}

async function deleteRecord(record: AdminRecord): Promise<void> {
  const name = String(record.title ?? record.name ?? record.label ?? record.role ?? 'entri ini');
  const dirty = editor?.querySelector<HTMLFormElement>('form')?.dataset.dirty === 'true';
  const impact = [
    record.status === 'published' || record.is_published === true
      ? 'Konten yang dipublikasikan akan langsung hilang dari halaman publik.'
      : '',
    dirty ? 'Edit yang belum disimpan akan dibuang.' : '',
  ].filter(Boolean).join(' ');
  const warning = impact ? `${impact} ` : '';
  if (!window.confirm(`${warning}Hapus “${name}” secara permanen? Tindakan ini tidak dapat dibatalkan.`)) return;
  try {
    await request(`${currentEndpoint()}/${record.id}`, {
      method: 'DELETE',
      body: JSON.stringify({ expected_updated_at: record.updated_at }),
    });
    setMessage('Entri telah dihapus.', 'success');
    editor!.hidden = true;
    listPanel!.hidden = false;
    await refreshList();
  } catch (error) { setMessage(error instanceof Error ? error.message : 'Entri gagal dihapus.', 'error'); }
}

function columnsForRows(): Array<{ label: string; value: (row: AdminRecord) => string }> {
  if (kind === 'projects') return [{ label: 'Proyek', value: (row) => String(row.title ?? '—') }, { label: 'Slug', value: (row) => String(row.slug ?? '—') }, { label: 'Jenis / tahun', value: (row) => `${row.project_type ?? '—'} · ${row.year ?? '—'}` }, { label: 'Status', value: statusOf }];
  if (kind === 'experiences') return [{ label: 'Peran', value: (row) => String(row.role ?? '—') }, { label: 'Organisasi', value: (row) => String(row.organization ?? '—') }, { label: 'Periode', value: careerPeriod }, { label: 'Status', value: statusOf }];
  if (kind === 'education') return [{ label: 'Riwayat', value: (row) => String(row.title ?? '—') }, { label: 'Institusi', value: (row) => String(row.institution ?? '—') }, { label: 'Jenis', value: (row) => String(row.kind ?? '—') }, { label: 'Status', value: statusOf }];
  if (collectionMode === 'categories') return [{ label: 'Kategori', value: (row) => String(row.label ?? '—') }, { label: 'Slug', value: (row) => String(row.slug ?? '—') }, { label: 'Jumlah entri', value: (row) => String(row.skill_count ?? 0) }, { label: 'Status', value: statusOf }];
  return [{ label: 'Tech stack', value: (row) => String(row.name ?? '—') }, { label: 'Kategori', value: (row) => String(row.category_label ?? '—') }, { label: 'Catatan', value: (row) => String(row.note ?? '—') }, { label: 'Status', value: statusOf }];
}

function careerPeriod(row: AdminRecord): string {
  const format = (year: unknown, month: unknown): string => {
    if (year == null || year === '') return '—';
    const monthNumber = Number(month);
    const monthLabel = Number.isInteger(monthNumber) && monthNumber >= 1 && monthNumber <= 12
      ? `${new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(2020, monthNumber - 1, 1))} `
      : '';
    return `${monthLabel}${String(year)}`;
  };
  const start = format(row.start_year, row.start_month);
  const end = row.end_year == null ? 'Sekarang' : format(row.end_year, row.end_month);
  return `${start} – ${end}`;
}

function experienceChoiceLabel(item: AdminRecord): string {
  const employmentTypes: Record<string, string> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    contract: 'Kontrak',
    internship: 'Magang',
    freelance: 'Freelance',
    other: 'Lainnya',
  };
  const employmentType = employmentTypes[String(item.employment_type)] ?? String(item.employment_type ?? '');
  const details = [employmentType, careerPeriod(item), String(item.organization ?? '')].filter(Boolean);
  return [String(item.role ?? 'Peran tanpa nama'), ...details].join(' · ');
}

function statusOf(row: AdminRecord): string {
  return row.status === 'published' || row.is_published === true ? 'Dipublikasikan' : 'Draft';
}

async function loadAuxiliaryChoices(): Promise<void> {
  if (kind === 'skills' || kind === 'projects' || kind === 'experiences') {
    const categoryResult = await request('skill-categories') as AdminRecord[];
    categories = categoryResult;
    const skillResult = await request('skills?limit=50') as PageResult;
    skillChoices = skillResult.data.map((item) => ({ value: String(item.id), label: `${String(item.name)} · ${String(item.category_label)}` }));
  }
  if (kind === 'projects') {
    const experienceResult = await request('experiences?limit=50') as PageResult;
    experienceChoices = experienceResult.data.map((item) => ({ value: String(item.id), label: experienceChoiceLabel(item) }));
  }
}

async function loadRows(): Promise<{ rows: AdminRecord[]; total: number }> {
  if (kind === 'skills' && collectionMode === 'categories') {
    const result = await request('skill-categories') as AdminRecord[];
    return { rows: result, total: result.length };
  }
  const endpoint = currentEndpoint();
  const filter = document.querySelector<HTMLSelectElement>('#admin-status')?.value ?? '';
  const search = document.querySelector<HTMLInputElement>('#admin-search')?.value.trim() ?? '';
  const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
  if (filter) params.set('status', filter);
  if (search) params.set('search', search);
  const result = await request(`${endpoint}?${params}`) as PageResult;
  return { rows: result.data, total: result.meta?.total ?? result.data.length };
}

function renderRows(rows: AdminRecord[], total: number): void {
  if (!tableHead || !tableBody) return;
  tableHead.replaceChildren();
  tableBody.replaceChildren();
  const columns = columnsForRows();
  const header = el('tr');
  for (const column of columns) header.append(el('th', undefined, column.label));
  header.append(el('th', undefined, 'Aksi'));
  tableHead.append(header);
  const empty = document.querySelector<HTMLElement>('#admin-empty');
  const tableWrap = document.querySelector<HTMLElement>('#admin-table-wrap');
  if (empty) empty.hidden = rows.length > 0;
  if (tableWrap) tableWrap.hidden = rows.length === 0;
  const title = document.querySelector<HTMLElement>('#admin-empty-title');
  const copy = document.querySelector<HTMLElement>('#admin-empty-copy');
  if (title) title.textContent = total === 0 ? 'Belum ada entri di bagian ini.' : 'Tidak ada hasil untuk pencarian ini.';
  if (copy) copy.textContent = total === 0 ? 'Tambahkan konten baru. Entri baru akan tersimpan sebagai draft.' : 'Ubah kata pencarian atau tampilkan semua status.';
  rows.forEach((row) => {
    const tr = el('tr');
    for (const [cellIndex, column] of columns.entries()) {
      const td = el('td');
      const text = column.value(row);
      if (column.label === 'Status') {
        const badge = el('span', `admin-status-badge ${text === 'Dipublikasikan' ? 'is-published' : 'is-draft'}`, text);
        td.append(badge);
      } else {
        const main = el('span', cellIndex === 0 ? 'table-primary-text' : 'table-secondary-text', text);
        td.append(main);
      }
      tr.append(td);
    }
    const actions = el('td', 'admin-table-actions');
    const edit = el('button', 'admin-row-action is-edit', 'Ubah');
    edit.type = 'button';
    edit.setAttribute('aria-label', `Ubah ${String(row.title ?? row.name ?? row.label ?? row.role ?? 'entri')}`);
    edit.addEventListener('click', () => showEditor(row));
    actions.append(edit);
    const isPublished = row.status === 'published' || row.is_published;
    const publish = el('button', `admin-row-action ${isPublished ? 'is-unpublish' : 'is-publish'}`, isPublished ? 'Tarik dari publik' : 'Terbitkan');
    publish.type = 'button';
    publish.addEventListener('click', () => changePublication(row));
    actions.append(publish);
    tr.append(actions);
    tableBody!.append(tr);
  });
  const pageLabel = document.querySelector<HTMLElement>('#admin-page-status');
  const prev = document.querySelector<HTMLButtonElement>('#admin-previous');
  const next = document.querySelector<HTMLButtonElement>('#admin-next');
  if (pageLabel) pageLabel.textContent = total ? `${offset + 1}–${Math.min(offset + rows.length, total)} dari ${total} entri` : '0 entri';
  if (prev) prev.disabled = offset === 0;
  if (next) next.disabled = offset + rows.length >= total;
}

async function refreshList(): Promise<void> {
  if (kind === 'profile') return;
  const isEditorHidden = editor?.hidden ?? true;
  if (isEditorHidden && message?.hidden) setMessage('Memuat daftar konten…', 'info');
  try {
    await loadAuxiliaryChoices();
    const result = await loadRows();
    renderRows(result.rows, result.total);
    if (message?.dataset.message === 'Memuat daftar konten…') setMessage('');
  } catch (error) {
    setMessage(error instanceof Error ? error.message : 'Data belum dapat dimuat.', 'error');
  }
}

function setupFilters(): void {
  document.querySelector<HTMLSelectElement>('#admin-status')?.addEventListener('change', () => { offset = 0; void refreshList(); });
  document.querySelector<HTMLInputElement>('#admin-search')?.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => { offset = 0; void refreshList(); }, 250);
  });
  document.querySelector<HTMLButtonElement>('#admin-previous')?.addEventListener('click', () => { offset = Math.max(0, offset - pageSize); void refreshList(); });
  document.querySelector<HTMLButtonElement>('#admin-next')?.addEventListener('click', () => { offset += pageSize; void refreshList(); });
}

function setupTabs(): void {
  document.querySelector<HTMLButtonElement>('#tab-skills')?.addEventListener('click', () => { collectionMode = 'skills'; offset = 0; setTabs(); void refreshList(); });
  document.querySelector<HTMLButtonElement>('#tab-categories')?.addEventListener('click', () => { collectionMode = 'categories'; offset = 0; setTabs(); void refreshList(); });
}

function setTabs(): void {
  const skillsTab = document.querySelector<HTMLButtonElement>('#tab-skills');
  const categoriesTab = document.querySelector<HTMLButtonElement>('#tab-categories');
  if (skillsTab) skillsTab.setAttribute('aria-pressed', String(collectionMode === 'skills'));
  if (categoriesTab) categoriesTab.setAttribute('aria-pressed', String(collectionMode === 'categories'));
  const search = document.querySelector<HTMLElement>('#admin-filters');
  if (search) search.hidden = collectionMode === 'categories';
  const create = document.querySelector<HTMLButtonElement>('#admin-create');
  if (create) create.textContent = collectionMode === 'categories' ? 'Tambah kategori' : 'Tambah entri';
}

function showProfile(): void {
  if (!editor || !listPanel) return;
  listPanel.hidden = true;
  const load = async () => {
    try {
      const row = await request('profile') as AdminRecord;
      currentRecord = row;
      showEditor(row);
      editor?.querySelector('.editor-heading h2')?.replaceChildren(document.createTextNode('Informasi profil'));
      const portraitNote = row.portrait_asset_id
        ? 'Foto profil sudah terhubung. Pilih gambar lain di bawah untuk menggantinya.'
        : 'Pilih atau unggah foto profil di bawah. Foto bersifat opsional sampai profil diterbitkan.';
      editor?.querySelector('form')?.prepend(el('p', 'admin-form-note', portraitNote));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Profil belum dapat dimuat.', 'error'); }
  };
  void load();
}

function setupLogout(): void {
  document.querySelector<HTMLButtonElement>('#logout-button')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    if (!(button instanceof HTMLButtonElement)) return;
    button.disabled = true;
    try {
      const token = await getSessionToken();
      const response = await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }, body: '{}' });
      if (response.ok) { window.location.replace('/admin/login'); return; }
      if (response.status === 401) { window.location.replace('/admin/login?expired=1'); return; }
      throw new Error('Logout belum berhasil. Coba lagi.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Logout belum berhasil.', 'error'); button.disabled = false; }
  });
}

document.querySelector<HTMLButtonElement>('#admin-create')?.addEventListener('click', () => {
  if (kind === 'profile') return;
  showEditor(null);
});
if (!kind || !apiName) {
  setMessage('Konfigurasi bagian admin tidak lengkap. Muat ulang halaman atau hubungi administrator.', 'error');
} else if (kind === 'profile') showProfile();
else {
  setupFilters();
  setupTabs();
  void refreshList();
}
setupLogout();

window.addEventListener('beforeunload', (event) => {
  if (editor?.querySelector<HTMLFormElement>('form')?.dataset.dirty === 'true') {
    event.preventDefault();
  }
});

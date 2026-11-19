const form = document.querySelector<HTMLFormElement>('#login-form');
const statusText = document.querySelector<HTMLElement>('#login-status');
const submitButton = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
const returnTo = document.querySelector<HTMLElement>('.auth-page')?.dataset.returnTo ?? '/admin';

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity() || !submitButton || !statusText) return;

  const fields = new FormData(form);
  submitButton.disabled = true;
  statusText.textContent = 'Memeriksa kredensial…';
  try {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username: fields.get('username'), password: fields.get('password') }),
    });
    if (response.ok) {
      window.location.replace(returnTo);
      return;
    }
    if (response.status === 401) statusText.textContent = 'Nama pengguna atau kata sandi tidak valid.';
    else if (response.status === 429) statusText.textContent = 'Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.';
    else if (response.status === 503) statusText.textContent = 'Layanan autentikasi sementara tidak tersedia. Coba lagi nanti.';
    else statusText.textContent = 'Login belum dapat diproses. Periksa isian lalu coba lagi.';
  } catch {
    statusText.textContent = 'Tidak dapat terhubung ke layanan login. Coba lagi nanti.';
  } finally {
    submitButton.disabled = false;
  }
});

fetch('/api/v1/auth/session', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
  .then((response) => {
    if (response.ok) window.location.replace(returnTo);
  })
  .catch(() => undefined);

const button = document.querySelector<HTMLButtonElement>('#logout-button');

button?.addEventListener('click', async () => {
  button.disabled = true;
  try {
    const sessionResponse = await fetch('/api/v1/auth/session', { credentials: 'same-origin' });
    if (sessionResponse.status === 401) {
      window.location.replace('/admin/login?expired=1');
      return;
    }
    if (!sessionResponse.ok) throw new Error('session');

    const session = await sessionResponse.json();
    const response = await fetch('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrf_token },
      body: '{}',
    });
    if (response.ok) window.location.replace('/admin/login');
    else throw new Error('logout');
  } catch {
    window.alert('Logout belum berhasil. Coba lagi.');
    button.disabled = false;
  }
});

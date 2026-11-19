const form = document.querySelector<HTMLFormElement>('#contact-form');
const message = document.querySelector<HTMLElement>('#form-message');

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity() || !message) return;

  const recipient = form.dataset.recipient;
  if (!recipient) {
    message.textContent = 'Alamat penerima belum dikonfigurasi.';
    return;
  }

  const data = new FormData(form);
  const name = String(data.get('name') ?? '').trim();
  const email = String(data.get('email') ?? '').trim();
  const body = `${String(data.get('message') ?? '').trim()}\n\n—\n${name}\n${email}`;
  message.textContent = 'Aplikasi email akan terbuka. Pesan belum dikirim.';
  window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(`Pesan portofolio dari ${name}`)}&body=${encodeURIComponent(body)}`;
});

document.querySelectorAll<HTMLImageElement>('.detail-gallery img').forEach((image) => {
  image.addEventListener('error', () => {
    const fallback = document.createElement('div');
    fallback.className = 'media-fallback';
    fallback.setAttribute('role', 'img');
    fallback.setAttribute('aria-label', `${image.alt}. Gambar belum dapat dimuat.`);
    fallback.textContent = 'Gambar belum dapat dimuat';
    image.closest('a')?.removeAttribute('href');
    image.replaceWith(fallback);
  }, { once: true });
});

document.querySelectorAll<HTMLButtonElement>('.thumb-btn').forEach((button) => {
  button.addEventListener('click', () => {
    const preview = document.querySelector<HTMLImageElement>('.gallery-active-image');
    if (!preview || !button.dataset.img) return;
    preview.src = button.dataset.img;
    preview.alt = button.dataset.alt ?? '';
    document.querySelectorAll<HTMLButtonElement>('.thumb-btn').forEach((item) => {
      const selected = item === button;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
  });
});

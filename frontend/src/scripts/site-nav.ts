const menu = document.getElementById('mobile-menu-toggle');
const nav = document.getElementById('main-nav');

menu?.addEventListener('click', () => {
  const opened = menu.getAttribute('aria-expanded') === 'true';
  menu.setAttribute('aria-expanded', String(!opened));
  nav?.classList.toggle('nav-open', !opened);
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menu?.setAttribute('aria-expanded', 'false');
    nav.classList.remove('nav-open');
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  menu?.setAttribute('aria-expanded', 'false');
  nav?.classList.remove('nav-open');
  menu?.focus();
});

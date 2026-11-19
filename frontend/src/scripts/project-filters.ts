const buttons = document.querySelectorAll<HTMLButtonElement>('.filter-btn');

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    buttons.forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });

    let visible = 0;
    document.querySelectorAll<HTMLElement>('.project-tile').forEach((tile) => {
      const matches = button.dataset.filter === 'all' || tile.dataset.type === button.dataset.filter;
      tile.hidden = !matches;
      if (matches) visible++;
    });

    const empty = document.getElementById('filter-empty');
    if (empty) empty.hidden = visible > 0;
  });
});

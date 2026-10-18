(function () {
  'use strict';
  const mobileCTA = document.querySelector('.library-mobile-cta');
  const signup = document.getElementById('library-signup');
  if (mobileCTA && signup && typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver(function (entries) {
      mobileCTA.hidden = entries[0].isIntersecting;
    }, { threshold: 0.1 });
    observer.observe(signup);
  }
  const filters = document.querySelector('.library-filters');
  if (!filters) return;
  const buttons = Array.from(filters.querySelectorAll('[data-resource-filter]'));
  const cards = Array.from(document.querySelectorAll('.library-card'));
  if (buttons.length < 3) return; // All plus at least two types.
  filters.hidden = false;
  filters.addEventListener('click', function (event) {
    const button = event.target.closest('[data-resource-filter]');
    if (!button || !filters.contains(button)) return;
    const type = button.dataset.resourceFilter;
    let visible = 0;
    cards.forEach(function (card) {
      card.hidden = type !== 'all' && card.dataset.resourceType !== type;
      if (!card.hidden) visible++;
    });
    buttons.forEach(function (item) { item.setAttribute('aria-pressed', String(item === button)); });
    document.getElementById('library-filter-status').textContent = visible + (visible === 1 ? ' resource shown.' : ' resources shown.');
  });
})();

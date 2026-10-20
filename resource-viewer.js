(function () {
  'use strict';
  const access = document.getElementById('resource-access');
  const frame = document.querySelector('[data-resource-frame]');
  if (!access) return;
  let active = false;
  function sync() {
    if (access.hidden) {
      if (active && frame) frame.removeAttribute('src');
      active = false;
      return;
    }
    if (active) return;
    active = true;
    // Load the resource immediately. This never waits for the signup service.
    if (frame) frame.src = frame.dataset.src;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    access.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
  }
  new MutationObserver(sync).observe(access, { attributes: true, attributeFilter: ['hidden'] });
  sync();
})();

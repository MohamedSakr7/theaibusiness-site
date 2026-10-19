(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.ResourceGate = api;
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', function () { api.init(root); }, { once: true });
    else api.init(root);
  }
})(typeof window === 'object' ? window : null, function () {
  'use strict';
  const IDENTITY_KEY = 'aib.resource-visitor.v1';
  const RETURNS_KEY = 'aib.resource-returns.v2.';
  const PENDING_KEY = 'aib.resource-pending.v1.';
  const BROWSER_KEY = 'aib.resource-browser.v1';
  const CHANNEL_KEY = 'aib.resource-channel.v1';
  const channels = ['LinkedIn', 'Google', 'AI search', 'Direct', 'Other'];
  const states = new WeakMap();

  function hostMatches(host, domain) { return host === domain || host.endsWith('.' + domain); }

  function classifySource(value) {
    const source = value.trim().toLowerCase();
    if (!source) return 'Other';
    if (['ai search', 'chatgpt', 'openai', 'perplexity', 'gemini', 'claude', 'copilot', 'bing-chat'].includes(source)) return 'AI search';
    if (['linkedin', 'linkedin-ads', 'lnkd', 'lnkd.in'].includes(source)) return 'LinkedIn';
    if (['google', 'google-ads', 'google_ads', 'adwords'].includes(source)) return 'Google';
    if (source === 'direct') return 'Direct';
    let url;
    try { url = new URL(/^https?:\/\//.test(source) ? source : 'https://' + source); }
    catch (_) { return 'Other'; }
    const host = url.hostname;
    if (['chatgpt.com', 'chat.openai.com', 'perplexity.ai', 'gemini.google.com', 'claude.ai', 'copilot.microsoft.com', 'copilot.com'].some(function (domain) { return hostMatches(host, domain); })) return 'AI search';
    if (hostMatches(host, 'bing.com') && /^\/(chat|copilot)(\/|$)/.test(url.pathname)) return 'AI search';
    if (hostMatches(host, 'linkedin.com') || hostMatches(host, 'lnkd.in')) return 'LinkedIn';
    if (/^(?:[a-z0-9-]+\.)*google\.[a-z]{2,}(?:\.[a-z]{2})?$/.test(host)) return 'Google';
    return 'Other';
  }

  function detectChannel(search, referrer) {
    const utm = new URLSearchParams(search || '').get('utm_source');
    if (utm && utm.trim()) return classifySource(utm);
    return referrer ? classifySource(referrer) : 'Direct';
  }

  function captureChannel(root) {
    // First page of this tab's visit wins, including a direct arrival.
    try {
      const saved = root.sessionStorage.getItem(CHANNEL_KEY);
      if (channels.includes(saved)) return saved;
    } catch (_) { /* Attribution is optional when storage is blocked. */ }
    let referrer = root.document.referrer || '';
    try {
      const ref = new URL(referrer), own = new URL(root.location.href);
      if (ref.hostname.replace(/^www\./, '') === own.hostname.replace(/^www\./, '')) referrer = '';
    } catch (_) { /* Empty referrers are direct arrivals. */ }
    const channel = detectChannel(root.location.search, referrer);
    try { root.sessionStorage.setItem(CHANNEL_KEY, channel); } catch (_) { /* Still allow signup. */ }
    return channel;
  }

  // Identical to validateSignup_ in Apps Script, including Notion's 200-character limit.
  function validEmail(value) {
    if (typeof value !== 'string' || value.length > 200 || /[\u0000-\u001f\u007f]/.test(value)) return false;
    const parts = value.trim().toLowerCase().split('@');
    const local = parts[0], domain = parts[1] || '';
    return parts.length === 2 && !!local && local.length <= 64 &&
      /^[a-z0-9!#$%&'*+\-/=?^_`{|}~]+(?:\.[a-z0-9!#$%&'*+\-/=?^_`{|}~]+)*$/.test(local) &&
      domain.length <= 253 && domain.split('.').length >= 2 && domain.split('.').every(function (label) {
        return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label);
      });
  }

  function readIdentity(root) {
    try {
      const value = JSON.parse(root.localStorage.getItem(IDENTITY_KEY));
      if (!value || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 200 || !validEmail(value.email)) return null;
      return { name: value.name.trim(), email: value.email.trim().toLowerCase() };
    } catch (_) { return null; }
  }

  function rememberIdentity(root, identity) {
    try { root.localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity)); return true; }
    catch (_) { return false; }
  }

  function uuid(root) {
    if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const n = Math.floor(Math.random() * 16); return (c === 'x' ? n : (n & 3) | 8).toString(16);
    });
  }

  function state(root) {
    if (!states.has(root)) states.set(root, { memory: new Map(), attempted: new Set(), running: null, browserId: uuid(root) });
    return states.get(root);
  }

  function browserId(root) {
    const current = state(root);
    try {
      let id = root.localStorage.getItem(BROWSER_KEY);
      if (!/^[a-f0-9-]{36}$/.test(id || '')) { id = current.browserId; root.localStorage.setItem(BROWSER_KEY, id); }
      return id;
    } catch (_) { return current.browserId; }
  }

  function returnKey(email, slug) { return RETURNS_KEY + encodeURIComponent(email) + '.' + slug; }
  function pendingKey(payload) { return PENDING_KEY + encodeURIComponent(payload.email) + '.' + payload.requestId; }

  function pending(root) {
    const items = new Map(state(root).memory);
    try {
      for (let i = 0; i < root.localStorage.length; i++) {
        const key = root.localStorage.key(i);
        if (!key || !key.startsWith(PENDING_KEY)) continue;
        try {
          const item = JSON.parse(root.localStorage.getItem(key));
          if (item && item.payload && item.payload.requestId && validEmail(item.payload.email)) items.set(key, item);
        } catch (_) { /* Ignore corrupt entries without deleting unrelated storage. */ }
      }
    } catch (_) { /* An in-memory send still works without storage. */ }
    // An offline signup must keep its name/source before a later return is processed.
    return Array.from(items.entries()).sort(function (a, b) {
      const kind = (a[1].payload.type === 'return') - (b[1].payload.type === 'return');
      return kind || a[1].queuedAt - b[1].queuedAt;
    });
  }

  function queue(root, payload) {
    const key = pendingKey(payload), item = { payload: payload, queuedAt: Date.now() };
    // Independent keys avoid one tab overwriting another tab's pending requests.
    if (!pending(root).some(function (entry) { return entry[0] === key; })) {
      state(root).memory.set(key, item);
      try { root.localStorage.setItem(key, JSON.stringify(item)); } catch (_) { /* Best effort if blocked/full. */ }
    }
  }

  function flushPending(root) {
    const current = state(root);
    if (current.running) return current.running;
    current.running = Promise.resolve().then(async function () {
      while (true) {
        const next = pending(root).find(function (entry) { return !current.attempted.has(entry[0]); });
        if (!next) break;
        const key = next[0], payload = next[1].payload;
        current.attempted.add(key); // Retry on a later page load, not a timer loop.
        try {
          const endpoint = root.RESOURCE_SIGNUP_CONFIG && root.RESOURCE_SIGNUP_CONFIG.endpoint;
          if (!endpoint) throw new Error('The signup endpoint is not configured.');
          const response = await root.fetch(endpoint, {
            method: 'POST', mode: 'cors', credentials: 'omit', redirect: 'follow', keepalive: true,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload)
          });
          if (!response.ok) throw new Error('The signup service returned HTTP ' + response.status + '.');
          const result = await response.json();
          if (!result || result.ok !== true) throw new Error(result && result.error || 'The signup service could not save this request.');
          // The ID and the count are saved together in Notion; a lost response is safe to retry.
          if (payload.type === 'return') {
            try { root.localStorage.setItem(returnKey(payload.email, payload.resource), '1'); } catch (_) { /* Server deduplication still applies. */ }
          }
          current.memory.delete(key);
          try { root.localStorage.removeItem(key); } catch (_) { /* A later retry remains harmless. */ }
        } catch (error) {
          root.console.error('[Resource signups] Background request failed; saved for a later page:', error.message);
        }
      }
    }).finally(function () { current.running = null; });
    return current.running;
  }

  function sendBackground(root, payload) {
    queue(root, Object.assign({}, payload, { requestId: payload.requestId || uuid(root) }));
    return flushPending(root);
  }

  function sendReturn(root, email, slug) {
    try { if (root.localStorage.getItem(returnKey(email, slug)) === '1') return; }
    catch (_) { return; }
    // Stable across reloads/tabs, scoped to this email in the queue and Notion row.
    return sendBackground(root, { type: 'return', email: email, resource: slug, requestId: 'return-' + browserId(root) + '-' + slug });
  }

  function init(root) {
    const doc = root.document, channel = captureChannel(root);
    browserId(root);
    flushPending(root); // Run on every site page, even pages without a form.
    const page = doc.querySelector('[data-resource-slug]');
    if (!page) return;
    const form = doc.getElementById('resource-signup'), access = doc.getElementById('resource-access');
    const link = doc.getElementById('resource-link'), forget = doc.getElementById('resource-forget');
    const slug = page.dataset.resourceSlug, isLibrary = page.dataset.resourceKind === 'library';
    const libraryPanel = doc.getElementById('library-access-panel'), signupPanel = doc.getElementById('resource-signup-panel');

    function unlock(focus) {
      if (link) link.href = page.dataset.gatedUrl;
      access.hidden = false; form.hidden = true;
      if (libraryPanel) libraryPanel.hidden = true;
      if (signupPanel) signupPanel.hidden = true;
      if (focus && isLibrary && page.scrollIntoView) page.scrollIntoView({ block: 'start', behavior: 'instant' });
      const target = link || doc.getElementById('resource-access-status');
      if (focus && target) target.focus({ preventScroll: true });
    }

    let identity = readIdentity(root);
    if (isLibrary) page.querySelectorAll('[data-library-resource]').forEach(function (button) {
      button.addEventListener('click', function () { if (identity) sendReturn(root, identity.email, button.dataset.libraryResource); });
    });
    if (identity) {
      let writable = true;
      try { root.localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity)); } catch (_) { writable = false; }
      if (writable) { unlock(false); if (!isLibrary) sendReturn(root, identity.email, slug); }
    }

    ['name', 'email'].forEach(function (name) {
      const field = form.elements.namedItem(name);
      field.addEventListener('input', function () { field.setCustomValidity(''); });
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const value = function (name) { return form.elements.namedItem(name).value; };
      const name = value('name').trim(), email = value('email').trim().toLowerCase();
      const invalid = !name ? 'name' : (!validEmail(value('email')) ? 'email' : '');
      if (invalid) {
        const field = form.elements.namedItem(invalid);
        field.setCustomValidity(invalid === 'name' ? 'Please enter your full name.' : 'Please enter a valid email address, such as name@example.com.');
        field.reportValidity();
        return;
      }
      const website = value('website');
      unlock(true); // Never wait for storage, retries or the backend.
      if (website === '') { identity = { name: name, email: email }; rememberIdentity(root, identity); }
      sendBackground(root, {
        type: 'signup', name: name, email: email, role: value('role').trim(), company: value('company').trim(),
        source: slug, resource: isLibrary ? '' : slug, channel: channel, website: website
      });
    });
    forget.addEventListener('click', function () {
      identity = null;
      try { root.localStorage.removeItem(IDENTITY_KEY); } catch (_) { /* Storage is optional. */ }
      access.hidden = true; form.hidden = false;
      if (libraryPanel) { libraryPanel.hidden = false; libraryPanel.open = true; }
      if (signupPanel) signupPanel.hidden = false;
      form.reset();
      ['name', 'email'].forEach(function (name) { form.elements.namedItem(name).setCustomValidity(''); });
      form.elements.namedItem('name').focus();
    });
  }

  return { init: init, detectChannel: detectChannel, classifySource: classifySource, captureChannel: captureChannel,
    validEmail: validEmail, readIdentity: readIdentity, rememberIdentity: rememberIdentity, sendReturn: sendReturn,
    sendBackground: sendBackground, flushPending: flushPending,
    IDENTITY_KEY: IDENTITY_KEY, RETURNS_KEY: RETURNS_KEY, PENDING_KEY: PENDING_KEY, BROWSER_KEY: BROWSER_KEY, CHANNEL_KEY: CHANNEL_KEY };
});

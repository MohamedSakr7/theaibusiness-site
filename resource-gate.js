(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', function () { api.init(root); }, { once: true });
    else api.init(root);
  }
})(typeof window === 'object' ? window : null, function () {
  'use strict';
  const IDENTITY_KEY = 'aib.resource-visitor.v1';
  const RETURNS_KEY = 'aib.resource-returns.v1';

  function hostMatches(host, domain) {
    return host === domain || host.endsWith('.' + domain);
  }

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
    if (!referrer) return 'Direct';
    return classifySource(referrer);
  }

  function readIdentity(root) {
    try {
      const value = JSON.parse(root.localStorage.getItem(IDENTITY_KEY));
      if (!value || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 200 ||
          typeof value.email !== 'string' || value.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) return null;
      return { name: value.name.trim(), email: value.email.trim().toLowerCase() };
    } catch (_) { return null; }
  }

  function rememberIdentity(root, identity) {
    try { root.localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity)); return true; }
    catch (_) { return false; }
  }

  function claimReturn(root, slug) {
    try {
      let slugs = JSON.parse(root.localStorage.getItem(RETURNS_KEY) || '[]');
      if (!Array.isArray(slugs) || !slugs.every(function (value) { return typeof value === 'string'; })) slugs = [];
      if (slugs.includes(slug)) return false;
      // Persist before sending: one automatic return attempt per resource per browser.
      root.localStorage.setItem(RETURNS_KEY, JSON.stringify(slugs.concat(slug)));
      return true;
    } catch (_) { return null; }
  }

  function sendBackground(root, payload) {
    // No part of the UI awaits this promise. No network failures revoke access.
    return Promise.resolve().then(function () {
      const endpoint = root.RESOURCE_SIGNUP_CONFIG && root.RESOURCE_SIGNUP_CONFIG.endpoint;
      if (!endpoint) throw new Error('The signup endpoint is not configured.');
      return root.fetch(endpoint, {
        method: 'POST', mode: 'cors', credentials: 'omit', redirect: 'follow', keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload)
      });
    }).then(function (response) {
      if (!response.ok) throw new Error('The signup service returned HTTP ' + response.status + '.');
      return response.json();
    }).then(function (result) {
      if (!result || result.ok !== true) throw new Error(result && result.error || 'The signup service could not save this request.');
    }).catch(function (error) {
      root.console.error('[Resource signups] Background request failed:', error.message);
    });
  }

  function init(root) {
    const doc = root.document;
    const page = doc.querySelector('[data-resource-slug]');
    if (!page) return;
    const form = doc.getElementById('resource-signup');
    const access = doc.getElementById('resource-access');
    const link = doc.getElementById('resource-link');
    const forget = doc.getElementById('resource-forget');
    const slug = page.dataset.resourceSlug;
    const isLibrary = page.dataset.resourceKind === 'library';
    const libraryPanel = doc.getElementById('library-access-panel');
    // Snapshot attribution on page arrival, not after the visitor has filled the form.
    const channel = detectChannel(root.location.search, doc.referrer);

    function unlock(focus) {
      if (link) link.href = page.dataset.gatedUrl;
      access.hidden = false;
      form.hidden = true;
      if (libraryPanel) libraryPanel.hidden = true;
      const focusTarget = link || doc.getElementById('resource-access-status');
      if (focus && focusTarget) focusTarget.focus({ preventScroll: true });
    }

    const identity = readIdentity(root);
    if (identity) {
      const sendReturn = isLibrary ? false : claimReturn(root, slug);
      if (sendReturn !== null) {
        unlock(false);
        if (sendReturn) sendBackground(root, { type: 'return', email: identity.email, resource: slug });
      }
      // If storage becomes unwritable, keep the form available instead of throwing.
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const value = function (name) { return form.elements.namedItem(name).value; };
      const name = value('name').trim();
      const email = value('email').trim().toLowerCase();
      if (!name) {
        const field = form.elements.namedItem('name');
        field.setCustomValidity('Please enter your full name.');
        field.reportValidity();
        field.setCustomValidity('');
        return;
      }
      const website = value('website');
      // Unlock synchronously, before storage or any network work.
      unlock(true);
      if (website === '') rememberIdentity(root, { name: name, email: email });
      sendBackground(root, {
        type: 'signup', name: name, email: email, role: value('role').trim(), company: value('company').trim(),
        source: slug, resource: isLibrary ? '' : slug, channel: channel, website: website
      });
    });

    forget.addEventListener('click', function () {
      try { root.localStorage.removeItem(IDENTITY_KEY); } catch (_) { /* Storage is optional. */ }
      access.hidden = true;
      form.hidden = false;
      if (libraryPanel) { libraryPanel.hidden = false; libraryPanel.open = true; }
      form.reset();
      form.elements.namedItem('name').focus();
    });
  }

  return { init: init, detectChannel: detectChannel, classifySource: classifySource,
    readIdentity: readIdentity, rememberIdentity: rememberIdentity, claimReturn: claimReturn,
    sendBackground: sendBackground, IDENTITY_KEY: IDENTITY_KEY, RETURNS_KEY: RETURNS_KEY };
});

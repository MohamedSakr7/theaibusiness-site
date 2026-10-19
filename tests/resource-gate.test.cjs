const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const gate = require('../resource-gate.js');
const rootPath = path.resolve(__dirname, '..');
const tick = () => new Promise(resolve => setImmediate(resolve));
const { environment: backendEnvironment } = require('../apps-script/resource-signups.local.test.cjs');
function storage() {
  const values = new Map();
  return { get length() { return values.size; }, key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
function page(options = {}) {
  const events = {};
  const fields = {};
  for (const [key, value] of Object.entries({ name: 'Test Person', email: ' Test+Step3@TheAIBusiness.NET ', role: 'Founder', company: 'Test Company', website: '' })) {
    fields[key] = { value, focus() {}, addEventListener() {}, setCustomValidity(message) { this.error = message; }, reportValidity() {} };
  }
  const form = { hidden: false, reportValidity: () => options.valid !== false,
    elements: { namedItem: key => fields[key] }, addEventListener: (name, task) => { events[name] = task; },
    reset() { Object.values(fields).forEach(field => { field.value = ''; }); }
  };
  const access = { hidden: true };
  const link = { focus() { this.focused = true; } };
  const forget = { addEventListener: (_, task) => { events.forget = task; } };
  const panel = { hidden: false, open: false };
  const resourceClicks = {};
  const elements = { 'resource-signup': form, 'resource-access': access, 'resource-link': link, 'resource-forget': forget };
  if (options.kind === 'library') {
    delete elements['resource-link'];
    elements['library-access-panel'] = panel;
    elements['resource-access-status'] = { focus() {} };
  }
  const requests = [], errors = [];
  const win = {
    document: { referrer: options.referrer || '', querySelector: () => options.noForm ? null : ({ dataset: { resourceSlug: options.slug || 'score-your-gtm', resourceKind: options.kind, gatedUrl: '/score-your-gtm/' }, querySelectorAll: () => ['score-your-gtm', 'example-guide'].map(slug => ({ dataset: { libraryResource: slug }, addEventListener: (_, fn) => { resourceClicks[slug] = fn; } })) }),
      getElementById: id => elements[id] },
    location: { href: 'https://theaibusiness.net/', search: options.search ?? '?utm_source=linkedin' },
    localStorage: options.storage || storage(), sessionStorage: options.sessionStorage || storage(),
    RESOURCE_SIGNUP_CONFIG: { endpoint: 'https://script.google.com/macros/s/example/exec' },
    fetch: (...args) => { requests.push(args); return options.fetch ? options.fetch(...args) : Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, status: 'created' }) }); },
    console: { error: (...args) => errors.push(args) }
  };
  return { win, form, access, link, panel, fields, requests, errors,
    openResource(slug) { resourceClicks[slug](); },
    submit() { events.submit({ preventDefault() {} }); }, forget() { events.forget(); } };
}

test('Channel captures UTM first, then referrer, including all five AI sources', () => {
  assert.equal(gate.detectChannel('', ''), 'Direct');
  assert.equal(gate.detectChannel('?utm_source=linkedin', 'https://www.google.com/search'), 'LinkedIn');
  assert.equal(gate.detectChannel('?utm_source=unknown', 'https://www.linkedin.com/feed'), 'Other');
  assert.equal(gate.detectChannel('', 'https://www.google.co.uk/search'), 'Google');
  assert.equal(gate.detectChannel('', 'https://lnkd.in/a'), 'LinkedIn');
  for (const name of ['chatgpt', 'perplexity', 'gemini', 'claude', 'copilot']) assert.equal(gate.detectChannel('?utm_source=' + name, ''), 'AI search');
  for (const referrer of ['https://chatgpt.com/', 'https://chat.openai.com/', 'https://perplexity.ai/', 'https://gemini.google.com/', 'https://claude.ai/', 'https://copilot.microsoft.com/']) assert.equal(gate.detectChannel('', referrer), 'AI search');
  assert.equal(gate.detectChannel('', 'https://google.com.example.org/'), 'Other');
  assert.equal(gate.detectChannel('', 'https://linkedin.com.evil.example/'), 'Other');
});

test('Library access buttons record each resource once without waiting or repeating on reload', async () => {
  const saved = storage();
  const env = page({ kind: 'library', slug: 'library', storage: saved }); gate.init(env.win);
  env.submit(); await tick();
  env.openResource('example-guide'); env.openResource('example-guide'); await tick();
  assert.deepEqual(env.requests.map(request => JSON.parse(request[1].body).type), ['signup', 'return']);
  assert.equal(JSON.parse(env.requests[1][1].body).resource, 'example-guide');
  const back = page({ kind: 'library', slug: 'library', storage: saved }); gate.init(back.win);
  back.openResource('example-guide'); back.openResource('score-your-gtm'); await tick();
  assert.equal(back.requests.length, 1);
  assert.equal(JSON.parse(back.requests[0][1].body).resource, 'score-your-gtm');
  back.forget(); back.openResource('score-your-gtm'); await tick();
  assert.equal(back.requests.length, 1);
});

test('Valid submit unlocks synchronously, without waiting even for a never-ending fetch', async () => {
  const env = page({ fetch: () => new Promise(() => {}) }); gate.init(env.win);
  assert.equal(env.access.hidden, true);
  env.submit();
  assert.equal(env.access.hidden, false);
  assert.equal(env.form.hidden, true);
  assert.equal(env.link.href, '/score-your-gtm/');
  assert.equal(env.requests.length, 0, 'Network must only start after synchronous unlock');
  await tick();
  assert.equal(env.requests.length, 1);
  const [url, options] = env.requests[0];
  assert.equal(url, env.win.RESOURCE_SIGNUP_CONFIG.endpoint);
  assert.deepEqual(options.headers, { 'Content-Type': 'text/plain;charset=utf-8' });
  assert.equal(options.credentials, 'omit'); assert.equal(options.mode, 'cors'); assert.equal(options.redirect, 'follow');
  const { requestId, ...payload } = JSON.parse(options.body);
  assert.match(requestId, /^[a-f0-9-]{36}$/);
  assert.deepEqual(payload, { type: 'signup', name: 'Test Person', email: 'test+step3@theaibusiness.net',
    role: 'Founder', company: 'Test Company', source: 'score-your-gtm', resource: 'score-your-gtm', channel: 'LinkedIn', website: '' });
  assert.deepEqual(gate.readIdentity(env.win), { name: 'Test Person', email: 'test+step3@theaibusiness.net' });
});

test('Attribution remains the channel captured at landing, even if URL changes before submit', async () => {
  const env = page(); gate.init(env.win);
  env.win.location.search = '?utm_source=google'; env.submit(); await tick();
  assert.equal(JSON.parse(env.requests[0][1].body).channel, 'LinkedIn');
});

test('Company website stays in company, passes server validation and does not fill the honeypot', async () => {
  const server = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(rootPath, 'apps-script/resource-signups.gs'), 'utf8'), server);
  for (const website of ['example.com', 'https://example.com/about?from=library']) {
    const env = page(); gate.init(env.win); env.fields.company.value = website; env.submit(); await tick();
    const payload = JSON.parse(env.requests[0][1].body);
    assert.equal(payload.company, website);
    assert.equal(payload.website, '');
    assert.equal(server.validateSignup_(payload).company, website);
  }
});

test('Network, HTTP, unreadable JSON, and backend errors only log; access stays unlocked', async () => {
  for (const fetch of [
    () => Promise.reject(new Error('Network unavailable')),
    () => Promise.resolve({ ok: false, status: 503 }),
    () => Promise.resolve({ ok: true, json: () => Promise.reject(new Error('Invalid JSON')) }),
    () => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: false, error: 'Notion unavailable' }) })
  ]) {
    const env = page({ fetch }); gate.init(env.win); env.submit(); await tick();
    assert.equal(env.access.hidden, false); assert.equal(env.form.hidden, true); assert.equal(env.errors.length, 1);
    assert.equal(env.requests.length, 1, 'No blind retry');
  }
});

test('Saved visitor unlocks, sends one minimal return per resource, and subsequent reloads send none', async () => {
  const shared = storage();
  gate.rememberIdentity({ localStorage: shared }, { name: 'Test', email: 'test+step3@theaibusiness.net' });
  for (let index = 0; index < 3; index++) {
    const env = page({ storage: shared }); gate.init(env.win); await tick();
    assert.equal(env.form.hidden, true); assert.equal(env.access.hidden, false);
    assert.equal(env.requests.length, index === 0 ? 1 : 0);
    if (!index) {
      const { requestId, ...payload } = JSON.parse(env.requests[0][1].body);
      assert.match(requestId, /^return-[a-f0-9-]{36}-score-your-gtm$/);
      assert.deepEqual(payload, { type: 'return', email: 'test+step3@theaibusiness.net', resource: 'score-your-gtm' });
    }
  }
  const other = page({ storage: shared, slug: 'a-future-resource' }); gate.init(other.win); await tick();
  assert.equal(other.requests.length, 1);
});

test('Storage denied, malformed, or unwritable falls back to the form; submission still unlocks', async () => {
  const denied = page(); Object.defineProperty(denied.win, 'localStorage', { get() { throw Error('Denied'); } });
  gate.init(denied.win); assert.equal(denied.form.hidden, false); denied.submit(); await tick();
  assert.equal(denied.access.hidden, false); assert.equal(denied.requests.length, 1);
  const corruptStorage = storage(); corruptStorage.setItem(gate.IDENTITY_KEY, '{bad');
  const corrupt = page({ storage: corruptStorage }); gate.init(corrupt.win); assert.equal(corrupt.form.hidden, false);
  const full = page({ storage: { getItem: () => JSON.stringify({ name: 'Test', email: 'test@example.com' }), setItem() { throw Error('Quota exceeded'); } } });
  gate.init(full.win); assert.equal(full.form.hidden, false); assert.equal(full.requests.length, 0);
});

test('Invalid form does not unlock or send; honeypot is sent but never remembered', async () => {
  const invalid = page({ valid: false }); gate.init(invalid.win); invalid.submit(); await tick();
  assert.equal(invalid.access.hidden, true); assert.equal(invalid.requests.length, 0);
  const bot = page(); gate.init(bot.win); bot.fields.website.value = 'spam'; bot.submit(); await tick();
  assert.equal(JSON.parse(bot.requests[0][1].body).website, 'spam'); assert.equal(gate.readIdentity(bot.win), null);
});

test('Use different details shows form again and the same email can be submitted again', async () => {
  const env = page(); gate.init(env.win); env.submit(); await tick(); env.forget();
  assert.equal(env.form.hidden, false); assert.equal(env.access.hidden, true); assert.equal(gate.readIdentity(env.win), null);
  env.fields.name.value = 'Test Person'; env.fields.email.value = 'test+step3@theaibusiness.net';
  env.submit(); await tick(); assert.equal(env.requests.length, 2);
});

test('Generated page has static public content, unique metadata, matching JSON-LD and sitemap', () => {
  const resource = JSON.parse(fs.readFileSync(path.join(rootPath, 'resources/catalogue.json'))).find(item => item.slug === 'score-your-gtm');
  const html = fs.readFileSync(path.join(rootPath, 'resources/score-your-gtm/index.html'), 'utf8');
  assert.match(html, /<h1 id="resource-title">Score your go-to-market<\/h1>/);
  for (const text of [...resource.longDescription, ...resource.faq.map(item => item.question)]) assert.ok(html.includes(text.replace(/'/g, '&#39;')));
  assert.ok(html.includes('<title>' + resource.seoTitle + '</title>'));
  assert.match(html, /rel="canonical" href="https:\/\/theaibusiness.net\/resources\/score-your-gtm\/"/);
  assert.match(html, /property="og:url" content="https:\/\/theaibusiness.net\/resources\/score-your-gtm\/"/);
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  assert.ok(graph.some(item => [].concat(item['@type']).includes('CreativeWork')));
  assert.equal(graph.find(item => item['@type'] === 'FAQPage').mainEntity.length, resource.faq.length);
  assert.match(html, /name="website"[^>]*value=""[^>]*tabindex="-1"/);
  assert.match(html, /subscribing to <strong>The AI Business newsletter/);
  assert.match(html, /id="resource-access" hidden/);
  const sitemap = fs.readFileSync(path.join(rootPath, 'sitemap.xml'), 'utf8');
  assert.equal(sitemap.split('<loc>https://theaibusiness.net/resources/score-your-gtm/</loc>').length - 1, 1);
});

test('Shared CSS and application code remain unchanged; embedded assessment preserves scoring', () => {
  for (const file of ['styles.css', 'app.js']) {
    const base = execFileSync('git', ['show', '6efe75adff6884b0e887e2fa72fa1a837b5b2c2c:' + file], { cwd: rootPath });
    assert.equal(fs.readFileSync(path.join(rootPath, file), 'utf8').replace(/\r\n/g, '\n'), base.toString('utf8').replace(/\r\n/g, '\n'), file + ' changed outside scope');
  }
  const before = execFileSync('git', ['show', '6efe75adff6884b0e887e2fa72fa1a837b5b2c2c:score-your-gtm/index.html'], { cwd: rootPath, encoding: 'utf8' });
  const after = fs.readFileSync(path.join(rootPath, 'score-your-gtm/index.html'), 'utf8');
  for (const name of ['AREAS', 'BANDS']) {
    const pattern = new RegExp('var ' + name + ' = ([\\s\\S]*?);');
    assert.equal(after.match(pattern)[1].replace(/\r\n/g, '\n'), before.match(pattern)[1].replace(/\r\n/g, '\n'), name + ' scoring definition changed');
  }
  const scoreMath = html => html.match(/var scores = \{\}, total = 0;[\s\S]*?var v = VERDICT\[cKey\];/)[0].replace(/\r\n/g, '\n');
  assert.equal(scoreMath(after), scoreMath(before));
  assert.ok(!/formsubmit|NOTIFY_EMAIL|id:"name"|id:"email"/.test(after));
  assert.match(after, /window\.location\.replace/);
  assert.match(after, /name="robots" content="noindex,follow"/);
});

test('Library form reuses signup logic, source library, empty resource, and immediate remembering', async () => {
  const env = page({ kind: 'library', slug: 'library', fetch: () => new Promise(() => {}) });
  gate.init(env.win); env.submit();
  assert.equal(env.access.hidden, false); assert.equal(env.form.hidden, true); assert.equal(env.panel.hidden, true);
  await tick();
  const payload = JSON.parse(env.requests[0][1].body);
  assert.equal(payload.type, 'signup'); assert.equal(payload.source, 'library'); assert.equal(payload.resource, '');
  const next = page({ storage: env.win.localStorage }); gate.init(next.win); await tick();
  assert.equal(next.form.hidden, true); assert.equal(next.access.hidden, false);
  assert.deepEqual(next.requests.map(request => JSON.parse(request[1].body).type), ['signup', 'return']);
  const returned = JSON.parse(next.requests[1][1].body);
  assert.equal(returned.email, payload.email); assert.equal(returned.resource, 'score-your-gtm');
  assert.equal(JSON.parse(next.requests[0][1].body).requestId, payload.requestId, 'Offline signup keeps its original ID');
});

test('Remembered library visitor sees access confirmation without sending a return or requiring writable storage', async () => {
  const env = page({ kind: 'library', slug: 'library' });
  gate.rememberIdentity(env.win, { name: 'Test Person', email: 'test@example.com' });
  gate.init(env.win); await tick();
  assert.equal(env.access.hidden, false); assert.equal(env.form.hidden, true); assert.equal(env.panel.hidden, true);
  assert.equal(env.requests.length, 0);
  env.forget(); assert.equal(env.panel.hidden, false); assert.equal(env.panel.open, true);
});

test('First homepage attribution survives internal navigation and later UTM parameters', async () => {
  const session = storage();
  const home = page({ noForm: true, sessionStorage: session }); gate.init(home.win); await tick();
  const library = page({ kind: 'library', slug: 'library', search: '', referrer: 'https://theaibusiness.net/', sessionStorage: session });
  gate.init(library.win); library.submit(); await tick();
  assert.equal(JSON.parse(library.requests[0][1].body).channel, 'LinkedIn');
  const later = page({ noForm: true, search: '?utm_source=google', sessionStorage: session });
  assert.equal(gate.captureChannel(later.win), 'LinkedIn');
  assert.equal(gate.captureChannel(page({ search: '', referrer: 'https://www.theaibusiness.net/about/' }).win), 'Direct');
});

test('Browser email validation matches actual Apps Script rules; invalid addresses never unlock', async () => {
  const server = backendEnvironment();
  const emails = ['normal@example.com', ' Test+Person@Example.COM ', "a!#$%&'*+-/=?^_`{|}~@example.com",
    'a..b@example.com', '.a@example.com', 'a.@example.com', 'a@localhost', 'a@-example.com',
    'a@example-.com', 'a@exam_ple.com', 'a@@example.com', 'a b@example.com', 'a\n@example.com',
    'a'.repeat(64) + '@example.com', 'a'.repeat(65) + '@example.com',
    'a@' + 'b'.repeat(63) + '.' + 'c'.repeat(63) + '.' + 'd'.repeat(63) + '.com',
    'a@' + 'b'.repeat(63) + '.' + 'c'.repeat(63) + '.' + 'd'.repeat(64) + '.com'];
  for (const email of emails) {
    let accepted = true;
    try { server.context.validateSignup_({ type: 'signup', name: 'E2E TEST', email, source: 'library', resource: '' }); }
    catch (_) { accepted = false; }
    assert.equal(gate.validEmail(email), accepted, email);
    if (!accepted) {
      const env = page(); gate.init(env.win); env.fields.email.value = email; env.submit(); await tick();
      assert.equal(env.access.hidden, true); assert.equal(gate.readIdentity(env.win), null);
      assert.equal(env.requests.length, 0); assert.match(env.fields.email.error, /valid email address/);
    }
  }
});

test('Lost signup response retries on the next ordinary page with the same ID and counts once', async () => {
  const backend = backendEnvironment(), saved = storage();
  const lost = page({ storage: saved, kind: 'library', slug: 'library', fetch: (_, options) => {
    assert.equal(backend.post(JSON.parse(options.body)).ok, true);
    return Promise.reject(new Error('Reply lost after successful save'));
  } });
  gate.init(lost.win); lost.submit(); await tick();
  const first = JSON.parse(lost.requests[0][1].body);
  assert.equal(lost.access.hidden, false); assert.equal(backend.state.rows[0].properties.Signups.number, 1);
  assert.ok([...Array(saved.length)].map((_, i) => saved.key(i)).some(key => key.startsWith(gate.PENDING_KEY)));
  const next = page({ storage: saved, noForm: true, fetch: (_, options) => Promise.resolve({ ok: true,
    json: () => Promise.resolve(backend.post(JSON.parse(options.body))) }) });
  gate.init(next.win); await tick();
  assert.equal(JSON.parse(next.requests[0][1].body).requestId, first.requestId);
  assert.equal(backend.state.rows.length, 1); assert.equal(backend.state.rows[0].properties.Signups.number, 1);
  assert.equal([...Array(saved.length)].map((_, i) => saved.key(i)).some(key => key.startsWith(gate.PENDING_KEY)), false);
});

test('Failed return is acknowledged only on success; retries count once and markers belong to each email', async () => {
  const backend = backendEnvironment(), saved = storage();
  const goodFetch = (_, options) => Promise.resolve({ ok: true, json: () => Promise.resolve(backend.post(JSON.parse(options.body))) });
  gate.rememberIdentity({ localStorage: saved }, { name: 'E2E TEST A', email: 'e2e-test+a@example.com' });
  const lost = page({ storage: saved, fetch: (_, options) => {
    backend.post(JSON.parse(options.body)); return Promise.reject(new Error('Lost return reply'));
  } });
  gate.init(lost.win); await tick();
  const aKey = gate.RETURNS_KEY + encodeURIComponent('e2e-test+a@example.com') + '.score-your-gtm';
  assert.equal(saved.getItem(aKey), null);
  const retry = page({ storage: saved, fetch: goodFetch }); gate.init(retry.win); await tick();
  assert.equal(saved.getItem(aKey), '1'); assert.equal(backend.state.rows[0].properties.Signups.number, 1);
  const again = page({ storage: saved, fetch: goodFetch }); gate.init(again.win); await tick(); assert.equal(again.requests.length, 0);
  gate.rememberIdentity({ localStorage: saved }, { name: 'E2E TEST B', email: 'e2e-test+b@example.com' });
  const personB = page({ storage: saved, fetch: goodFetch }); gate.init(personB.win); await tick();
  assert.equal(personB.requests.length, 1); assert.equal(backend.state.rows.length, 2);
  assert.equal(backend.state.rows[1].properties.Signups.number, 1);
  assert.equal(saved.getItem(gate.RETURNS_KEY + encodeURIComponent('e2e-test+b@example.com') + '.score-your-gtm'), '1');
});

test('Simultaneous tabs use the same return ID; server replays remain harmless after later writes', async () => {
  const backend = backendEnvironment(), saved = storage();
  gate.rememberIdentity({ localStorage: saved }, { name: 'E2E TEST', email: 'e2e-test+tabs@example.com' });
  const fetch = (_, options) => Promise.resolve({ ok: true, json: () => Promise.resolve(backend.post(JSON.parse(options.body))) });
  const a = page({ storage: saved, fetch }), b = page({ storage: saved, fetch });
  gate.init(a.win); gate.init(b.win); await tick();
  assert.equal(JSON.parse(a.requests[0][1].body).requestId, JSON.parse(b.requests[0][1].body).requestId);
  assert.equal(backend.state.rows.length, 1); assert.equal(backend.state.rows[0].properties.Signups.number, 1);
  const replay = JSON.parse(a.requests[0][1].body);
  backend.post({ ...replay, resource: 'another-guide', requestId: 'later-request' });
  backend.post(replay);
  assert.equal(backend.state.rows[0].properties.Signups.number, 2);
});

test('Embedded tool does not compete with its parent to send the shared pending queue', async () => {
  const saved = storage();
  const offline = page({ storage: saved, kind: 'library', slug: 'library', fetch: () => Promise.reject(new Error('Offline')) });
  gate.init(offline.win); offline.submit(); await tick();
  const embedded = page({ storage: saved, noForm: true }); embedded.win.top = {};
  gate.init(embedded.win); await tick(); assert.equal(embedded.requests.length, 0);
  const main = page({ storage: saved, noForm: true }); gate.init(main.win); await tick();
  assert.equal(main.requests.length, 1);
});

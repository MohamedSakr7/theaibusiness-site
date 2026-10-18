const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const gate = require('../resource-gate.js');
const rootPath = path.resolve(__dirname, '..');
const tick = () => new Promise(resolve => setImmediate(resolve));
function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
function page(options = {}) {
  const events = {};
  const fields = {};
  for (const [key, value] of Object.entries({ name: 'Test Person', email: ' Test+Step3@TheAIBusiness.NET ', role: 'Founder', company: 'Test Company', website: '' })) {
    fields[key] = { value, focus() {}, setCustomValidity() {}, reportValidity() {} };
  }
  const form = { hidden: false, reportValidity: () => options.valid !== false,
    elements: { namedItem: key => fields[key] }, addEventListener: (name, task) => { events[name] = task; },
    reset() { Object.values(fields).forEach(field => { field.value = ''; }); }
  };
  const access = { hidden: true };
  const link = { focus() { this.focused = true; } };
  const forget = { addEventListener: (_, task) => { events.forget = task; } };
  const elements = { 'resource-signup': form, 'resource-access': access, 'resource-link': link, 'resource-forget': forget };
  const requests = [], errors = [];
  const win = {
    document: { referrer: options.referrer || '', querySelector: () => ({ dataset: { resourceSlug: options.slug || 'score-your-gtm', gatedUrl: '/score-your-gtm/' } }),
      getElementById: id => elements[id] },
    location: { search: options.search || '?utm_source=linkedin' }, localStorage: options.storage || storage(),
    RESOURCE_SIGNUP_CONFIG: { endpoint: 'https://script.google.com/macros/s/example/exec' },
    fetch: (...args) => { requests.push(args); return options.fetch ? options.fetch(...args) : Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, status: 'created' }) }); },
    console: { error: (...args) => errors.push(args) }
  };
  return { win, form, access, link, fields, requests, errors,
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
  assert.deepEqual(JSON.parse(options.body), { type: 'signup', name: 'Test Person', email: 'test+step3@theaibusiness.net',
    role: 'Founder', company: 'Test Company', source: 'score-your-gtm', resource: 'score-your-gtm', channel: 'LinkedIn', website: '' });
  assert.deepEqual(gate.readIdentity(env.win), { name: 'Test Person', email: 'test+step3@theaibusiness.net' });
});

test('Attribution remains the channel captured at landing, even if URL changes before submit', async () => {
  const env = page(); gate.init(env.win);
  env.win.location.search = '?utm_source=google'; env.submit(); await tick();
  assert.equal(JSON.parse(env.requests[0][1].body).channel, 'LinkedIn');
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
    if (!index) assert.deepEqual(JSON.parse(env.requests[0][1].body), { type: 'return', email: 'test+step3@theaibusiness.net', resource: 'score-your-gtm' });
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
  assert.ok(graph.some(item => item['@type'] === 'CreativeWork'));
  assert.equal(graph.find(item => item['@type'] === 'FAQPage').mainEntity.length, resource.faq.length);
  assert.match(html, /name="website"[^>]*value=""[^>]*tabindex="-1"/);
  assert.match(html, /subscribing to <strong>The AI Business newsletter/);
  assert.match(html, /id="resource-access" hidden/);
  const sitemap = fs.readFileSync(path.join(rootPath, 'sitemap.xml'), 'utf8');
  assert.equal(sitemap.split('<loc>https://theaibusiness.net/resources/score-your-gtm/</loc>').length - 1, 1);
});

test('Homepage, library, existing assessment, and shared CSS/JS remain unchanged (Git line endings normalized)', () => {
  for (const file of ['index.html', 'resources/index.html', 'score-your-gtm/index.html', 'styles.css', 'app.js']) {
    const base = execFileSync('git', ['show', 'origin/main:' + file], { cwd: rootPath });
    assert.equal(fs.readFileSync(path.join(rootPath, file), 'utf8').replace(/\r\n/g, '\n'), base.toString('utf8').replace(/\r\n/g, '\n'), file + ' changed outside scope');
  }
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const catalogue = JSON.parse(read('resources/catalogue.json'));
const escape = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

test('Viewer loads only after unlock, scrolls once, unloads on reset and supports reduced motion', () => {
  for (const reduced of [false, true]) {
    let observer;
    const scrolls = [];
    const access = { hidden: true, scrollIntoView: options => scrolls.push(options) };
    const frame = { dataset: { src: 'https://example.com/preview' }, removeAttribute(key) { delete this[key]; } };
    function MutationObserver(callback) { observer = callback; this.observe = () => {}; }
    vm.runInNewContext(read('resource-viewer.js'), {
      MutationObserver, window: { matchMedia: () => ({ matches: reduced }) },
      document: { getElementById: () => access, querySelector: () => frame }
    });
    assert.equal(frame.src, undefined);
    access.hidden = false; observer(); observer();
    assert.equal(frame.src, frame.dataset.src);
    assert.equal(scrolls.length, 1);
    assert.equal(scrolls[0].behavior, reduced ? 'instant' : 'smooth');
    access.hidden = true; observer(); assert.equal(frame.src, undefined);
    access.hidden = false; observer(); assert.equal(scrolls.length, 2);
  }
});

test('Nine complete pages have unique metadata, matching FAQs, internal related links and sitemap entries', () => {
  assert.equal(catalogue.length, 9);
  assert.equal(new Set(catalogue.map(r => r.seoTitle)).size, 9);
  assert.equal(new Set(catalogue.map(r => r.metaDescription)).size, 9);
  const sitemap = read('sitemap.xml');
  for (const r of catalogue) {
    const html = read('resources/' + r.slug + '/index.html');
    assert.ok(html.includes('<title>' + escape(r.seoTitle) + '</title>'));
    assert.ok(html.includes('name="description" content="' + escape(r.metaDescription) + '"'));
    assert.ok(!html.includes('{{'));
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.ok(r.faq.length >= 3 && r.faq.length <= 5);
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
    assert.deepEqual(graph.find(n => n['@type'] === 'FAQPage').mainEntity.map(n => n.name), r.faq.map(n => n.question));
    for (const slug of r.related) assert.ok(html.includes('href="/resources/' + slug + '/"'));
    assert.equal(sitemap.split('<loc>https://theaibusiness.net' + r.pageUrl + '</loc>').length - 1, 1);
    assert.match(html, /class="resource-honeypot" hidden inert aria-hidden="true"/);
  }
});

test('Public assessment exposes the twelve real questions without answer options or result definitions', () => {
  const source = read('score-your-gtm/index.html');
  const literal = source.match(/var AREAS = ([\s\S]*?);\s*if \(RESOURCE_EMBED\)/)[1];
  const areas = vm.runInNewContext('(' + literal + ')');
  const html = read('resources/score-your-gtm/index.html');
  const publicQuestions = html.match(/<section class="resource-public-questions"[\s\S]*?<\/section>/)[0];
  assert.equal((publicQuestions.match(/<li>/g) || []).length, 12);
  for (const area of areas) for (const q of area.questions) {
    assert.ok(publicQuestions.includes(escape(q.q)));
    for (const option of q.opts) assert.ok(!publicQuestions.includes(escape(option[0])));
  }
  assert.ok(!html.includes('var VERDICT'));
});

test('Existing slugs are preserved and every PDF uses consistent Google Drive delivery', () => {
  const previous = JSON.parse(execFileSync('git', ['show', 'HEAD:resources/catalogue.json'], {cwd:root,encoding:'utf8'}));
  for (const r of previous) assert.ok(catalogue.some(current => current.slug === r.slug));
  for (const r of catalogue.filter(r => r.delivery === 'pdf')) {
    const id = r.accessUrl.match(/\/file\/d\/([^/]+)\/view$/)[1];
    assert.equal(r.viewerUrl, 'https://drive.google.com/file/d/' + id + '/preview');
    assert.equal(r.gatedUrl, 'https://drive.google.com/uc?export=download&id=' + id);
    assert.ok(fs.existsSync(path.join(root, r.thumbnail)));
  }
});

test('Every signup form has simple required markers and an optional website mapped to company', () => {
  for (const file of ['resources/index.html', ...catalogue.map(r => 'resources/' + r.slug + '/index.html')]) {
    const html = read(file);
    const form = html.match(/<form id="resource-signup"[\s\S]*?<\/form>/)[0];
    assert.ok(!form.includes('(required)') && !form.includes('(optional)'));
    assert.match(form, /Full name <span aria-hidden="true">\*<\/span>/);
    assert.match(form, /Email <span aria-hidden="true">\*<\/span>/);
    const company = form.match(/<input id="signup-company"[^>]*>/)[0];
    assert.match(company, /name="company"/);
    assert.match(company, /inputmode="url"/);
    assert.match(company, /maxlength="200"/);
    assert.ok(!company.includes('required'));
    const publicText = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    assert.ok(!/\bresource\b/i.test(publicText), file + ' uses an internal term in public copy');
  }
});

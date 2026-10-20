const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { simplifyNavigation } = require('../scripts/update-navigation.cjs');
const root = path.resolve(__dirname, '..');
const baseline = '6efe75adff6884b0e887e2fa72fa1a837b5b2c2c';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const original = file => execFileSync('git', ['show', baseline + ':' + file], { cwd: root, encoding: 'utf8' });
const normalize = text => text.replace(/\r\n/g, '\n');
const escapeHtml = text => text.replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const catalogue = JSON.parse(read('resources/catalogue.json')).sort((a, b) => (a.order ?? 1000) - (b.order ?? 1000) || a.title.localeCompare(b.title));
const navPages = ['index.html', 'about/index.html', 'methodology/index.html', 'newsletter/index.html', '404.html', 'guides/check-ai-visibility/index.html', 'guides/ai-go-to-market-roi/index.html', 'resources/index.html', 'resources/score-your-gtm/index.html'];

test('Every catalogue entry generates a correctly ordered card, image, description, and destination', () => {
  const html = read('resources/index.html');
  const cards = [...html.matchAll(/<article class="library-card"[\s\S]*?<\/article>/g)].map(match => match[0]);
  assert.equal(cards.length, catalogue.length);
  catalogue.forEach((resource, index) => {
    assert.ok(cards[index].includes(escapeHtml(resource.title)));
    assert.ok(cards[index].includes(escapeHtml(resource.shortDescription)));
    assert.ok(cards[index].includes('src="' + (resource.libraryThumbnail || resource.thumbnail) + '"'));
    assert.ok(cards[index].includes('href="' + resource.accessUrl + '"'));
    assert.ok(cards[index].includes('>' + resource.format + '</span>'));
    if (resource.accessUrl.startsWith('/')) assert.ok(!cards[index].includes('target="_blank"'));
    else assert.ok(cards[index].includes('rel="noopener noreferrer"'));
  });
});

test('Library has canonical, Open Graph, CollectionPage and the catalogue ItemList', () => {
  const html = read('resources/index.html');
  assert.match(html, /<title>Free B2B Go-to-Market Guides, Templates &amp; Tools \| The AI Business<\/title>/);
  assert.match(html, /rel="canonical" href="https:\/\/theaibusiness.net\/resources\/"/);
  assert.match(html, /property="og:url" content="https:\/\/theaibusiness.net\/resources\/"/);
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  const page = graph.find(item => item['@type'] === 'CollectionPage');
  const list = graph.find(item => item['@type'] === 'ItemList');
  assert.equal(page.mainEntity['@id'], list['@id']);
  assert.equal(list.numberOfItems, catalogue.length);
  assert.deepEqual(list.itemListElement.map(entry => entry.item.url), catalogue.map(resource => new URL(resource.pageUrl.startsWith('/resources/') ? resource.pageUrl : '/resources/#' + resource.slug, 'https://theaibusiness.net').href));
  assert.equal(read('sitemap.xml').split('<loc>https://theaibusiness.net/resources/</loc>').length - 1, 1);
});

test('Public landing content, answers and resource count are generated before JavaScript runs', () => {
  const html = read('resources/index.html');
  const publicView = html.slice(html.indexOf('<div id="library-access-panel">'), html.indexOf('<section id="resource-access"'));
  assert.match(publicView, /<h1>Your free B2B/);
  assert.match(publicView, /go-to-market library/);
  assert.ok(publicView.includes('<strong>' + catalogue.length + '</strong> free guides, templates &amp; tools'));
  const copy = JSON.parse(read('resources/library.json'));
  for (const resource of catalogue) assert.ok(publicView.includes(escapeHtml(resource.title)));
  for (const faq of copy.faq) {
    assert.ok(publicView.includes(faq.question));
    assert.ok(publicView.includes(faq.answer));
  }
  assert.equal((publicView.match(/<ol class="library-preview-list">[\s\S]*?<\/ol>/) || [''])[0].match(/<li\b/g).length, catalogue.length);
  assert.ok(publicView.includes('href="#library-signup"'));
  assert.ok(publicView.includes('href="#inside-library"'));
  assert.ok(!publicView.includes('data-library-resource='));
  assert.match(html, /<section id="resource-access"[^>]* hidden/);
  assert.match(read('robots.txt'), /Allow: \//);
});

test('All existing navigation becomes a direct Resources link; other page content remains intact', () => {
  for (const file of navPages) {
    const html = read(file);
    assert.ok(!html.includes('resources-dropdown'), file);
    assert.equal((html.match(/class="resources-nav-link" href="\/resources\/"/g) || []).length, 2, file);
    const old = original(file);
    assert.equal(html.match(/<footer\b[\s\S]*?<\/footer>/)[0], old.match(/<footer\b[\s\S]*?<\/footer>/)[0], file + ' footer changed');
    const newsletterLinks = source => [...source.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>Newsletter[\s\S]*?<\/a>/g)].map(match => match[1]);
    assert.deepEqual(newsletterLinks(html), newsletterLinks(old), file + ' newsletter links changed');
    if (!file.startsWith('resources/')) {
      const withoutTracking = html.replace('<script src="/resource-config.js?v=1" defer></script><script src="/resource-gate.js?v=6" defer></script>', '');
      assert.equal(normalize(withoutTracking), normalize(simplifyNavigation(old)), file + ' changed beyond nav/tracking');
      assert.equal((html.match(/src="\/resource-gate\.js\?v=6"/g) || []).length, 1);
    }
  }
});

test('All resource pages reuse the library form and provide public content and gated viewers', () => {
  const form = html => html.match(/<form id="resource-signup"[\s\S]*?<\/form>/)[0].replace(/\s+/g, ' ');
  assert.equal(form(read('resources/index.html')).replace('Unlock the library', 'Get free access'), form(read('resources/score-your-gtm/index.html')));
  for (const resource of catalogue) {
    const html = read('resources/' + resource.slug + '/index.html');
    assert.equal(form(html), form(read('resources/score-your-gtm/index.html')));
    assert.match(html, /id="resource-outcomes"/);
    assert.match(html, /id="resource-related-heading"/);
    if (resource.delivery === 'template') {
      assert.ok(!html.includes('<iframe'), 'Templates open in Notion for duplication');
      assert.match(html, /Make it yours in Notion/);
    } else {
      assert.match(html, /data-resource-frame/);
      const frame = html.match(/<iframe\b[^>]+>/)[0];
      assert.ok(!/\ssrc=/.test(frame), 'Do not load gated files before unlock');
    }
    assert.match(html, /class="resource-honeypot" hidden inert aria-hidden="true"/);
  }
  assert.ok(read('templates/resource-page.html').includes('{{SIGNUP_FORM}}'));
  assert.ok(read('templates/resource-library.html').includes('{{SIGNUP_FORM}}'));
  assert.match(read('resources/index.html'), /All the guides\. All the templates\. All the tools\./);
  assert.equal(fs.readdirSync(path.join(root, 'resources'), { withFileTypes: true }).filter(entry => entry.isDirectory()).length, catalogue.filter(resource => resource.pageUrl === '/resources/' + resource.slug + '/').length);
});

test('Filters show the selected type, reset to All, and announce the visible count', () => {
  const buttons = ['all', 'guide', 'tool list'].map(type => ({ dataset: { resourceFilter: type }, setAttribute(key, value) { this[key] = value; } }));
  const cards = ['guide', 'guide', 'tool list'].map(type => ({ dataset: { resourceType: type }, hidden: false }));
  const status = {};
  let handler;
  const filters = { hidden: true, querySelectorAll: () => buttons, addEventListener: (_, fn) => { handler = fn; }, contains: () => true };
  vm.runInNewContext(read('resource-library.js'), { document: { querySelector: () => filters, querySelectorAll: () => cards, getElementById: () => status } });
  assert.equal(filters.hidden, false);
  handler({ target: { closest: () => buttons[1] } });
  assert.deepEqual(cards.map(card => card.hidden), [false, false, true]);
  assert.equal(status.textContent, '2 items shown.');
  handler({ target: { closest: () => buttons[0] } });
  assert.deepEqual(cards.map(card => card.hidden), [false, false, false]);
  assert.equal(buttons[0]['aria-pressed'], 'true');
});

test('Mobile access CTA hides when the signup form is visible and reappears away from it', () => {
  const cta = { hidden: false }, form = {};
  let callback, observed;
  function IntersectionObserver(fn) { callback = fn; this.observe = element => { observed = element; }; }
  vm.runInNewContext(read('resource-library.js'), { IntersectionObserver, document: {
    querySelector: selector => selector === '.library-mobile-cta' ? cta : null,
    getElementById: () => form
  } });
  assert.equal(observed, form);
  callback([{ isIntersecting: true }]); assert.equal(cta.hidden, true);
  callback([{ isIntersecting: false }]); assert.equal(cta.hidden, false);
});

test('Adding one minimal catalogue entry automatically adds its card and does not create a resource page', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'resource-catalogue-test-'));
  try {
    for (const directory of ['scripts', 'templates', 'resources', 'score-your-gtm']) fs.mkdirSync(path.join(temp, directory));
    fs.copyFileSync(path.join(root, 'score-your-gtm/index.html'), path.join(temp, 'score-your-gtm/index.html'));
    fs.copyFileSync(path.join(root, 'scripts/build-resources.cjs'), path.join(temp, 'scripts/build-resources.cjs'));
    for (const file of fs.readdirSync(path.join(root, 'templates'))) fs.copyFileSync(path.join(root, 'templates', file), path.join(temp, 'templates', file));
    fs.copyFileSync(path.join(root, 'sitemap.xml'), path.join(temp, 'sitemap.xml'));
    fs.copyFileSync(path.join(root, 'resources/library.json'), path.join(temp, 'resources/library.json'));
    const resources = [...catalogue, { slug: 'future-example', title: 'Future example', shortDescription: 'A future card', type: 'template', order: 100, pageUrl: 'https://example.com/resource', accessUrl: 'https://example.com/direct.pdf', thumbnail: '/assets/social-preview.jpg' }];
    fs.writeFileSync(path.join(temp, 'resources/catalogue.json'), JSON.stringify(resources));
    execFileSync(process.execPath, [path.join(temp, 'scripts/build-resources.cjs')], { cwd: temp });
    assert.match(fs.readFileSync(path.join(temp, 'resources/index.html'), 'utf8'), /Future example/);
    assert.ok(fs.readFileSync(path.join(temp, 'resources/index.html'), 'utf8').includes('<strong>' + resources.length + '</strong> free guides, templates &amp; tools'));
    assert.equal(fs.existsSync(path.join(temp, 'resources/future-example')), false);
  } finally {
    const resolved = fs.realpathSync(temp);
    assert.equal(path.dirname(resolved).toLowerCase(), fs.realpathSync(os.tmpdir()).toLowerCase());
    assert.ok(path.basename(resolved).startsWith('resource-catalogue-test-'));
    fs.rmSync(resolved, { recursive: true });
  }
});

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
const catalogue = JSON.parse(read('resources/catalogue.json')).sort((a, b) => (a.order ?? 1000) - (b.order ?? 1000) || a.title.localeCompare(b.title));
const navPages = ['index.html', 'about/index.html', 'methodology/index.html', 'newsletter/index.html', '404.html', 'guides/check-ai-visibility/index.html', 'guides/ai-go-to-market-roi/index.html', 'resources/index.html', 'resources/score-your-gtm/index.html'];

test('Every catalogue entry generates a correctly ordered card, image, description, and destination', () => {
  const html = read('resources/index.html');
  const cards = [...html.matchAll(/<article class="library-card"[\s\S]*?<\/article>/g)].map(match => match[0]);
  assert.equal(cards.length, catalogue.length);
  catalogue.forEach((resource, index) => {
    assert.ok(cards[index].includes(resource.title));
    assert.ok(cards[index].includes(resource.shortDescription));
    assert.ok(cards[index].includes('src="' + resource.thumbnail + '"'));
    assert.ok(cards[index].includes('href="' + resource.pageUrl + '"'));
    assert.ok(cards[index].includes('>' + resource.type + '</span>'));
    if (resource.pageUrl.startsWith('/')) assert.ok(!cards[index].includes('target="_blank"'));
    else assert.ok(cards[index].includes('rel="noopener noreferrer"'));
  });
});

test('Library has canonical, Open Graph, CollectionPage and the catalogue ItemList', () => {
  const html = read('resources/index.html');
  assert.match(html, /<title>Free B2B Go-to-Market Guides &amp; Tools \| The AI Business<\/title>/);
  assert.match(html, /rel="canonical" href="https:\/\/theaibusiness.net\/resources\/"/);
  assert.match(html, /property="og:url" content="https:\/\/theaibusiness.net\/resources\/"/);
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  const page = graph.find(item => item['@type'] === 'CollectionPage');
  const list = graph.find(item => item['@type'] === 'ItemList');
  assert.equal(page.mainEntity['@id'], list['@id']);
  assert.equal(list.numberOfItems, catalogue.length);
  assert.deepEqual(list.itemListElement.map(entry => entry.item.url), catalogue.map(resource => new URL(resource.pageUrl, 'https://theaibusiness.net').href));
  assert.equal(read('sitemap.xml').split('<loc>https://theaibusiness.net/resources/</loc>').length - 1, 1);
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
    if (!file.startsWith('resources/')) assert.equal(normalize(html), normalize(simplifyNavigation(old)), file + ' changed beyond nav');
  }
});

test('Resource detail content remains unchanged and both pages use the same form partial', () => {
  const main = html => html.match(/<main\b[\s\S]*?<\/main>/)[0].replace(/\s+/g, ' ');
  assert.equal(main(read('resources/score-your-gtm/index.html')), main(original('resources/score-your-gtm/index.html')));
  const form = html => html.match(/<form id="resource-signup"[\s\S]*?<\/form>/)[0].replace(/\s+/g, ' ');
  assert.equal(form(read('resources/index.html')), form(read('resources/score-your-gtm/index.html')));
  assert.ok(read('templates/resource-page.html').includes('{{SIGNUP_FORM}}'));
  assert.ok(read('templates/resource-library.html').includes('{{SIGNUP_FORM}}'));
  assert.match(read('resources/index.html'), /You have access to everything\./);
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
  assert.equal(status.textContent, '2 resources shown.');
  handler({ target: { closest: () => buttons[0] } });
  assert.deepEqual(cards.map(card => card.hidden), [false, false, false]);
  assert.equal(buttons[0]['aria-pressed'], 'true');
});

test('Adding one minimal catalogue entry automatically adds its card and does not create a resource page', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'resource-catalogue-test-'));
  try {
    for (const directory of ['scripts', 'templates', 'resources']) fs.mkdirSync(path.join(temp, directory));
    fs.copyFileSync(path.join(root, 'scripts/build-resources.cjs'), path.join(temp, 'scripts/build-resources.cjs'));
    for (const file of fs.readdirSync(path.join(root, 'templates'))) fs.copyFileSync(path.join(root, 'templates', file), path.join(temp, 'templates', file));
    fs.copyFileSync(path.join(root, 'sitemap.xml'), path.join(temp, 'sitemap.xml'));
    const resources = [...catalogue, { slug: 'future-example', title: 'Future example', shortDescription: 'A future card', type: 'template', order: 100, pageUrl: 'https://example.com/resource', thumbnail: '/assets/social-preview.jpg' }];
    fs.writeFileSync(path.join(temp, 'resources/catalogue.json'), JSON.stringify(resources));
    execFileSync(process.execPath, [path.join(temp, 'scripts/build-resources.cjs')], { cwd: temp });
    assert.match(fs.readFileSync(path.join(temp, 'resources/index.html'), 'utf8'), /Future example/);
    assert.equal(fs.existsSync(path.join(temp, 'resources/future-example')), false);
  } finally {
    const resolved = fs.realpathSync(temp);
    assert.equal(path.dirname(resolved).toLowerCase(), fs.realpathSync(os.tmpdir()).toLowerCase());
    assert.ok(path.basename(resolved).startsWith('resource-catalogue-test-'));
    fs.rmSync(resolved, { recursive: true });
  }
});

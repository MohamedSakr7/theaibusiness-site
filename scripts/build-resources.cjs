#!/usr/bin/env node
'use strict';
// Build the catalogue library and only those detail pages explicitly enabled by pageUrl.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const siteUrl = 'https://theaibusiness.net';
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'resources/catalogue.json'), 'utf8'));
const template = fs.readFileSync(path.join(root, 'templates/resource-page.html'), 'utf8');
const libraryTemplate = fs.readFileSync(path.join(root, 'templates/resource-library.html'), 'utf8');
const header = fs.readFileSync(path.join(root, 'templates/site-header.html'), 'utf8');
const footer = fs.readFileSync(path.join(root, 'templates/site-footer.html'), 'utf8');
const signupForm = fs.readFileSync(path.join(root, 'templates/resource-form.html'), 'utf8');
assert.ok(header && footer, 'Could not read the existing site header and footer.');
assert.ok(Array.isArray(catalogue) && catalogue.length, 'Catalogue must contain resource entries.');
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const render = (source, values) => source.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
  assert.ok(Object.prototype.hasOwnProperty.call(values, key), 'Unknown template field: ' + key);
  return values[key];
});
catalogue.sort((a, b) => (a.order ?? 1000) - (b.order ?? 1000) || a.title.localeCompare(b.title));
const seen = new Set();
const locations = [];
for (const resource of catalogue) {
  for (const key of ['slug', 'title', 'shortDescription', 'type', 'pageUrl', 'thumbnail']) {
    assert.ok(typeof resource[key] === 'string' && resource[key].trim(), 'Missing resource field: ' + key);
  }
  assert.match(resource.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Resource slug must be a safe URL segment.');
  assert.ok(!seen.has(resource.slug), 'Duplicate resource slug: ' + resource.slug);
  seen.add(resource.slug);
  for (const key of ['pageUrl', 'thumbnail']) {
    assert.match(resource[key], /^(?:\/(?!\/)|https:\/\/)/, key + ' must be a root-relative or HTTPS URL.');
  }
  if (resource.thumbnail.startsWith('/assets/resource-covers/')) {
    assert.equal(resource.thumbnail, '/assets/resource-covers/' + resource.slug + '.svg', 'Cover paths must match their resource slug.');
    const lines = [];
    for (const word of resource.title.split(' ')) {
      if (!lines.length || (lines[lines.length - 1] + ' ' + word).length > 29) lines.push(word);
      else lines[lines.length - 1] += ' ' + word;
    }
    const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400" role="img" aria-label="${esc(resource.title)}"><rect width="640" height="400" fill="#0c0c0e"/><rect x="24" y="24" width="592" height="352" rx="10" fill="#151517" stroke="#ffffff16"/><g font-family="Arial,Helvetica,sans-serif"><text x="54" y="61" font-size="12" letter-spacing="2" fill="#ff8a43">THE AI BUSINESS / ${esc(resource.type.toUpperCase())}</text>${lines.map((line, i) => `<text x="54" y="${112 + i * 35}" font-size="28" font-weight="600" fill="#f4f4f5">${esc(line)}</text>`).join('')}<path d="M84 301h472" stroke="#ff600044" stroke-width="2"/><rect x="54" y="273" width="148" height="56" rx="8" fill="#1c1c1f" stroke="#ff600066"/><rect x="246" y="273" width="148" height="56" rx="8" fill="#1c1c1f" stroke="#ffffff22"/><rect x="438" y="273" width="148" height="56" rx="8" fill="#1c1c1f" stroke="#ffffff22"/><circle cx="82" cy="301" r="6" fill="#ff6000"/><path d="M103 301h68m104 0h90m104 0h90" stroke="#b0b0ba" stroke-width="3"/><text x="54" y="354" font-size="11" letter-spacing="1.5" fill="#aaaab2">A PRACTICAL RESOURCE FOR YOUR GO-TO-MARKET</text></g></svg>`;
    const coverPath = path.join(root, resource.thumbnail.slice(1));
    fs.mkdirSync(path.dirname(coverPath), { recursive: true });
    fs.writeFileSync(coverPath, cover + '\n');
  }
  // A single pageUrl change switches a card from its old destination to its website page.
  // Card-only entries require no body or metadata and do not create placeholder pages.
  if (resource.pageUrl !== '/resources/' + resource.slug + '/') continue;
  for (const key of ['buttonLabel', 'gatedUrl', 'dateAdded', 'seoTitle', 'metaDescription']) {
    assert.ok(typeof resource[key] === 'string' && resource[key].trim(), 'Missing detail-page field: ' + key);
  }
  assert.match(resource.gatedUrl, /^(?:\/(?!\/)|https:\/\/)/, 'gatedUrl must be root-relative or HTTPS.');
  assert.match(resource.dateAdded, /^\d{4}-\d{2}-\d{2}$/, 'Use an ISO dateAdded.');
  assert.ok(Array.isArray(resource.longDescription) && resource.longDescription.length, 'longDescription must contain paragraphs.');
  assert.ok(Array.isArray(resource.whatsInside) && resource.whatsInside.length, 'whatsInside is required.');
  assert.ok(Array.isArray(resource.whoItsFor) && resource.whoItsFor.length, 'whoItsFor is required.');
  assert.ok(Array.isArray(resource.faq) && resource.faq.length, 'faq is required.');
  const canonical = siteUrl + '/resources/' + resource.slug + '/';
  locations.push(canonical);
  const structuredData = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Organization', '@id': siteUrl + '/#organization', name: 'The AI Business', url: siteUrl + '/' },
      { '@type': 'CreativeWork', '@id': canonical + '#resource', name: resource.title, description: resource.shortDescription,
        url: canonical, image: new URL(resource.thumbnail, siteUrl).href, genre: resource.type, inLanguage: 'en',
        isAccessibleForFree: true, publisher: { '@id': siteUrl + '/#organization' } },
      { '@type': 'FAQPage', '@id': canonical + '#faq', url: canonical, mainEntity: resource.faq.map(item => ({
        '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer }
      })) },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Resources', item: siteUrl + '/resources/' },
        { '@type': 'ListItem', position: 2, name: resource.title, item: canonical }
      ] }
    ]
  };
  const values = {
    HEADER: header, FOOTER: footer, SIGNUP_FORM: signupForm,
    STRUCTURED_DATA: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
    LONG_DESCRIPTION: resource.longDescription.map(paragraph => '<p>' + esc(paragraph) + '</p>').join('\n'),
    WHATS_INSIDE: resource.whatsInside.map(item => '<li><h3>' + esc(item.title) + '</h3><p>' + esc(item.description) + '</p></li>').join('\n'),
    WHO_ITS_FOR: resource.whoItsFor.map(item => '<li>' + esc(item) + '</li>').join('\n'),
    FAQ: resource.faq.map(item => '<details><summary>' + esc(item.question) + '</summary><p>' + esc(item.answer) + '</p></details>').join('\n'),
    SEO_TITLE: esc(resource.seoTitle), META_DESCRIPTION: esc(resource.metaDescription), CANONICAL: esc(canonical),
    SLUG: esc(resource.slug), GATED_URL: esc(resource.gatedUrl), TITLE: esc(resource.title), TYPE: esc(resource.type),
    DURATION: esc(resource.duration || 'Free resource'), SHORT_DESCRIPTION: esc(resource.shortDescription),
    THUMBNAIL: esc(resource.thumbnail), THUMBNAIL_ALT: esc(resource.thumbnailAlt || resource.title),
    BUTTON_LABEL: esc(resource.buttonLabel), OVERVIEW_HEADING: esc(resource.overviewHeading || 'About this resource'),
    AUDIENCE_HEADING: esc(resource.audienceHeading || "Who it's for"),
    THUMBNAIL_CAPTION: esc(resource.thumbnailCaption || 'A look inside the resource.')
  };
  const html = render(template, values);
  const destination = path.join(root, 'resources', resource.slug, 'index.html');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, html);
  console.log('Built /resources/' + resource.slug + '/');
}
const cards = catalogue.map(resource => {
  const external = resource.pageUrl.startsWith('https://');
  const link = esc(resource.pageUrl);
  const extra = external ? ' target="_blank" rel="noopener noreferrer"' : '';
  const coverAlt = esc(resource.thumbnailAlt || resource.title + ' resource cover');
  return `<article class="library-card" data-resource-type="${esc(resource.type)}"><a class="library-card-cover" href="${link}"${extra} tabindex="-1" aria-hidden="true"><img src="${esc(resource.thumbnail)}" alt="${coverAlt}" width="640" height="400" loading="lazy"></a><div class="library-card-body"><span class="library-card-type">${esc(resource.type)}</span><h2><a href="${link}"${extra}>${esc(resource.title)}</a></h2><p>${esc(resource.shortDescription)}</p><a class="library-card-button" href="${link}"${extra} aria-label="${esc((resource.cardButtonLabel || 'View resource') + ': ' + resource.title + (external ? ' (opens in a new tab)' : ''))}">${esc(resource.cardButtonLabel || 'View resource')} <span aria-hidden="true">↗</span></a><span class="library-card-location">${external ? 'Opens on Beehiiv · new tab' : 'On this website'}</span></div></article>`;
}).join('\n');
const types = Array.from(new Set(catalogue.map(resource => resource.type)));
const typeLabels = { assessment: 'Assessments', guide: 'Guides', template: 'Templates', tool: 'Tools', 'tool list': 'Tools' };
const filters = types.length < 2 ? '' : '<button type="button" data-resource-filter="all" aria-pressed="true">All</button>' + types.map(type => `<button type="button" data-resource-filter="${esc(type)}" aria-pressed="false">${esc(typeLabels[type] || type)}</button>`).join('');
const itemListId = siteUrl + '/resources/#items';
const libraryData = { '@context': 'https://schema.org', '@graph': [
  { '@type': 'CollectionPage', '@id': siteUrl + '/resources/#page', url: siteUrl + '/resources/', name: 'Free B2B Go-to-Market Guides & Tools | The AI Business', description: 'Practical B2B go-to-market guides, AI workflows, a tool stack and a free assessment.', mainEntity: { '@id': itemListId } },
  { '@type': 'ItemList', '@id': itemListId, numberOfItems: catalogue.length, itemListOrder: 'https://schema.org/ItemListOrderAscending', itemListElement: catalogue.map((resource, index) => ({ '@type': 'ListItem', position: index + 1, item: { '@type': 'CreativeWork', name: resource.title, description: resource.shortDescription, url: new URL(resource.pageUrl, siteUrl).href, image: new URL(resource.thumbnail, siteUrl).href } })) }
] };
fs.writeFileSync(path.join(root, 'resources/index.html'), render(libraryTemplate, {
  HEADER: header, FOOTER: footer, SIGNUP_FORM: signupForm, CARDS: cards, FILTERS: filters,
  RESOURCE_COUNT: String(catalogue.length), STRUCTURED_DATA: JSON.stringify(libraryData).replace(/</g, '\\u003c')
}));
console.log('Built /resources/ with ' + catalogue.length + ' catalogue cards.');
const sitemapPath = path.join(root, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf8');
assert.ok(sitemap.includes('</urlset>'), 'Invalid sitemap.');
// Keep the library and only enabled detail pages in the sitemap.
for (const location of [siteUrl + '/resources/', ...locations]) {
  if (!sitemap.includes('<loc>' + location + '</loc>')) {
    sitemap = sitemap.replace('</urlset>', '<url><loc>' + location + '</loc></url>\n</urlset>');
  }
}
fs.writeFileSync(sitemapPath, sitemap);

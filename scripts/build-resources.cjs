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
const libraryCopy = JSON.parse(fs.readFileSync(path.join(root, 'resources/library.json'), 'utf8'));
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
const cards = catalogue.map((resource, index) => {
  const destination = resource.accessUrl || resource.gatedUrl;
  assert.ok(destination, 'Add a direct accessUrl for ' + resource.slug);
  assert.match(destination, /^(?:\/(?!\/)|https:\/\/)/, 'accessUrl must be root-relative or HTTPS');
  const external = destination.startsWith('https://');
  const extra = external ? ' target="_blank" rel="noopener noreferrer"' : '';
  return '<article class="library-card" data-resource-type="' + esc(resource.type) + '"><div class="library-card-cover ' + (resource.coverStyle === 'publication' ? 'is-publication' : 'is-assessment') + '"><img src="' + esc(resource.libraryThumbnail || resource.thumbnail) + '" alt="' + esc(resource.libraryThumbnailAlt || resource.thumbnailAlt || resource.title) + '" width="640" height="400" loading="lazy"><span class="library-card-number">0' + (index + 1) + '</span></div><div class="library-card-body"><span class="library-card-type">' + esc(resource.format || resource.type) + '</span><h2>' + esc(resource.title) + '</h2><p>' + esc(resource.shortDescription) + '</p><a class="library-card-button" data-library-resource="' + esc(resource.slug) + '" href="' + esc(destination) + '"' + extra + '>' + esc(resource.accessLabel || 'Open resource') + ' <span aria-hidden="true">↗</span></a><span class="library-card-location">' + (external ? 'Opens in a new tab' : 'Interactive tool · about 3 minutes') + '</span></div></article>';
}).join('\n');
const previews = catalogue.map((resource, index) => '<li id="' + esc(resource.slug) + '"><span class="preview-number">' + String(index+1).padStart(2,'0') + '</span><div><h3>' + esc(resource.title) + '</h3><span class="preview-format">' + esc(resource.format || resource.type) + '</span></div><span class="preview-included" aria-label="Included">✓</span></li>').join('\n');
const libraryFAQ = libraryCopy.faq.map(item => '<details><summary>' + esc(item.question) + '</summary><p>' + esc(item.answer) + '</p></details>').join('\n');
const types = Array.from(new Set(catalogue.map(resource => resource.type)));
const typeLabels = { assessment: 'Assessments', guide: 'Guides', template: 'Templates', tool: 'Tools', 'tool list': 'Tools' };
const filters = types.length < 2 ? '' : '<button type="button" data-resource-filter="all" aria-pressed="true">All</button>' + types.map(type => `<button type="button" data-resource-filter="${esc(type)}" aria-pressed="false">${esc(typeLabels[type] || type)}</button>`).join('');
const itemListId = siteUrl + '/resources/#items';
const libraryData = { '@context': 'https://schema.org', '@graph': [
  { '@type': 'Organization', '@id': siteUrl + '/#organization', name: 'The AI Business', url: siteUrl + '/' },
  { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl + '/' }, { '@type': 'ListItem', position: 2, name: 'Resources', item: siteUrl + '/resources/' }] },
  { '@type': 'CollectionPage', '@id': siteUrl + '/resources/#page', url: siteUrl + '/resources/', name: libraryCopy.seoTitle, description: libraryCopy.metaDescription, inLanguage: 'en', isAccessibleForFree: true, publisher: { '@id': siteUrl + '/#organization' }, about: ['B2B go-to-market', 'AI workflows', 'Sales preparation', 'AI search visibility'], mainEntity: { '@id': itemListId } },
  { '@type': 'ItemList', '@id': itemListId, numberOfItems: catalogue.length, itemListOrder: 'https://schema.org/ItemListOrderAscending', itemListElement: catalogue.map((resource, index) => ({ '@type': 'ListItem', position: index + 1, item: { '@type': 'CreativeWork', name: resource.title, description: resource.shortDescription, url: new URL(resource.pageUrl.startsWith('/resources/') ? resource.pageUrl : '/resources/#' + resource.slug, siteUrl).href, image: new URL(resource.thumbnail, siteUrl).href } })) }
] };
fs.writeFileSync(path.join(root, 'resources/index.html'), render(libraryTemplate, {
  LIBRARY_FAQ: libraryFAQ, LIBRARY_SEO_TITLE: esc(libraryCopy.seoTitle), LIBRARY_META_DESCRIPTION: esc(libraryCopy.metaDescription),
  HEADER: header, FOOTER: footer, SIGNUP_FORM: signupForm.replace('Get free access', 'Unlock the library'), CARDS: cards, PREVIEWS: previews, FILTERS: filters,
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

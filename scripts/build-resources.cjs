#!/usr/bin/env node
'use strict';
// Build static, crawler-readable detail pages from the catalogue. No runtime framework.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const siteUrl = 'https://theaibusiness.net';
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'resources/catalogue.json'), 'utf8'));
const template = fs.readFileSync(path.join(root, 'templates/resource-page.html'), 'utf8');
const library = fs.readFileSync(path.join(root, 'resources/index.html'), 'utf8');
const header = library.match(/<header\b[\s\S]*?<\/header><nav\b[\s\S]*?<\/nav>/)?.[0];
const footer = library.match(/<footer\b[\s\S]*?<\/footer>/)?.[0];
assert.ok(header && footer, 'Could not read the existing site header and footer.');
assert.ok(Array.isArray(catalogue) && catalogue.length, 'Catalogue must contain resource entries.');
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const seen = new Set();
const locations = [];
for (const resource of catalogue) {
  for (const key of ['slug', 'title', 'shortDescription', 'type', 'buttonLabel', 'gatedUrl', 'thumbnail', 'dateAdded', 'seoTitle', 'metaDescription']) {
    assert.ok(typeof resource[key] === 'string' && resource[key].trim(), 'Missing resource field: ' + key);
  }
  assert.match(resource.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Resource slug must be a safe URL segment.');
  assert.ok(!seen.has(resource.slug), 'Duplicate resource slug: ' + resource.slug);
  seen.add(resource.slug);
  assert.match(resource.dateAdded, /^\d{4}-\d{2}-\d{2}$/, 'Use an ISO dateAdded.');
  for (const key of ['gatedUrl', 'thumbnail']) {
    assert.match(resource[key], /^(?:\/(?!\/)|https:\/\/)/, key + ' must be a root-relative or HTTPS URL.');
  }
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
    HEADER: header, FOOTER: footer,
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
  const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    assert.ok(Object.prototype.hasOwnProperty.call(values, key), 'Unknown template field: ' + key);
    return values[key];
  });
  const destination = path.join(root, 'resources', resource.slug, 'index.html');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, html);
  console.log('Built /resources/' + resource.slug + '/');
}
const sitemapPath = path.join(root, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf8');
assert.ok(sitemap.includes('</urlset>'), 'Invalid sitemap.');
// Preserve all existing routes and add only missing catalogue routes; no library edits.
for (const location of locations) {
  if (!sitemap.includes('<loc>' + location + '</loc>')) {
    sitemap = sitemap.replace('</urlset>', '<url><loc>' + location + '</loc></url>\n</urlset>');
  }
}
fs.writeFileSync(sitemapPath, sitemap);

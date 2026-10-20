#!/usr/bin/env node
'use strict';
// Build the catalogue library and only those detail pages explicitly enabled by pageUrl.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
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
const bySlug = new Map(catalogue.map(resource => [resource.slug, resource]));
const assessmentSource = fs.readFileSync(path.join(root, 'score-your-gtm/index.html'), 'utf8');
const areaLiteral = assessmentSource.match(/var AREAS = ([\s\S]*?);\s*(?:if \(RESOURCE_EMBED\)|var VERDICT)/);
assert.ok(areaLiteral, 'Could not read the original assessment questions.');
const assessmentQuestions = vm.runInNewContext('(' + areaLiteral[1] + ')').flatMap(area => area.questions.map(question => question.q));
assert.equal(assessmentQuestions.length, 12, 'The assessment must expose exactly twelve scored questions.');
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
  assert.ok(Array.isArray(resource.outcomes) && resource.outcomes.length, 'outcomes is required.');
  assert.ok(Array.isArray(resource.related) && resource.related.length >= 2 && resource.related.length <= 3, 'Use two or three related resources.');
  assert.match(resource.viewerUrl, /^(?:\/(?!\/)|https:\/\/)/, 'viewerUrl must be root-relative or HTTPS.');
  const isTool = resource.delivery === 'tool';
  const isTemplate = resource.delivery === 'template';
  const itemLabel = isTemplate ? 'template' : isTool ? 'assessment' : 'guide';
  const publicQuestions = isTool ? '<section class="resource-public-questions" aria-labelledby="assessment-questions-heading"><span class="eyebrow">Before you start</span><h2 id="assessment-questions-heading">The twelve assessment questions</h2><p>These are the scored questions, exactly as they appear in the tool. Scoring, results and next steps are inside the unlocked assessment.</p><ol>' + assessmentQuestions.map(question => '<li>' + esc(question) + '</li>').join('') + '</ol></section>' : '';
  const related = resource.related.map(slug => {
    const match = bySlug.get(slug);
    assert.ok(match && slug !== resource.slug, 'Invalid related resource: ' + slug);
    return '<a href="' + esc(match.pageUrl) + '"><span class="eyebrow">' + esc(match.format) + '</span><h3>' + esc(match.title) + '</h3><p>' + esc(match.shortDescription) + '</p><span aria-hidden="true">↗</span></a>';
  }).join('\n');
  const canonical = siteUrl + '/resources/' + resource.slug + '/';
  locations.push(canonical);
  const structuredData = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Organization', '@id': siteUrl + '/#organization', name: 'The AI Business', url: siteUrl + '/' },
      { '@type': isTool ? ['CreativeWork', 'SoftwareApplication'] : 'CreativeWork', '@id': canonical + '#resource', name: resource.title, description: resource.shortDescription,
        url: canonical, image: new URL(resource.thumbnail, siteUrl).href, genre: resource.type, inLanguage: 'en',
        isAccessibleForFree: true, learningResourceType: isTemplate ? 'Template' : isTool ? 'Assessment' : 'Guide',
        ...(isTool ? { applicationCategory: 'BusinessApplication', operatingSystem: 'Web browser', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } } : { encodingFormat: isTemplate ? 'text/html' : 'application/pdf' }),
        publisher: { '@id': siteUrl + '/#organization' } },
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
    INTRO: esc(resource.longDescription[0]),
    LONG_DESCRIPTION: resource.longDescription.slice(1).map(paragraph => '<p>' + esc(paragraph) + '</p>').join('\n'),
    WHATS_INSIDE: resource.whatsInside.map(item => '<li><h3>' + esc(item.title) + '</h3><p>' + esc(item.description) + '</p></li>').join('\n'),
    WHO_ITS_FOR: resource.whoItsFor.map(item => '<li>' + esc(item) + '</li>').join('\n'),
    OUTCOMES: resource.outcomes.map(item => '<li>' + esc(item) + '</li>').join('\n'),
    PUBLIC_QUESTIONS: publicQuestions, RELATED_RESOURCES: related,
    DELIVERY: esc(resource.delivery), VIEWER_URL: esc(resource.viewerUrl),
    ITEM_LABEL: itemLabel,
    GATE_DESCRIPTION: 'Enter your details once to ' + (isTemplate ? 'get this Notion template' : isTool ? 'use this assessment' : 'read this guide') + '. You can then open every guide, template and tool in this browser.',
    UNLOCKED_MESSAGE: isTemplate ? 'Your template is ready. Open it in Notion, then duplicate it into your own workspace.' : isTool ? 'Your assessment is ready. Start below.' : 'Your guide is ready. Read it below or download the PDF.',
    VIEWER_HEADING: isTemplate ? 'Your Notion template' : isTool ? 'Your assessment' : 'Read the guide',
    HERO_NOTE: isTemplate ? 'Unlock the template link here. Copy it in Notion. No email to wait for.' : 'Opens here after signup. No email to wait for.',
    GATE_HEADING: isTemplate ? 'Get the template.' : 'Open it here.',
    VIEWER_CONTENT: isTemplate ? '<div class="resource-template-steps"><h3>Make it yours in Notion</h3><ol><li>Open the template with the button above. The guide and example databases are public to read.</li><li>Click Duplicate at the top right in Notion, then sign in and choose your own workspace.</li><li>Open Start here in your copy. Connect Notion to Claude, paste the project instructions, and fill in the four marked Playbook sections.</li><li>Try the invented examples before adding your contacts. Keep your real data in your own copy.</li></ol><p>A Notion account is needed to save a copy. Running the CRM with Claude needs a Claude account and the Notion connector. Nothing is sent automatically.</p></div>' : '<iframe class="resource-frame ' + esc(resource.delivery) + '" data-resource-frame data-src="' + esc(resource.viewerUrl) + '" title="' + esc((isTool ? 'Use the assessment: ' : 'Read the PDF: ') + resource.title) + '" allow="fullscreen" allowfullscreen></iframe>',
    VIEWER_TITLE: esc((isTool ? 'Use the assessment: ' : 'Read the PDF: ') + resource.title),
    RESOURCE_URL: esc(resource.resourceUrl || resource.gatedUrl),
    FALLBACK_LABEL: isTemplate ? 'Open the original Notion template' : isTool ? 'Open assessment in a new tab' : 'Open PDF in a new tab',
    ATTACHMENTS: (resource.attachments || []).map(file => '<p class="resource-extra-download"><a href="' + esc(file.url) + '" target="_blank" rel="noopener noreferrer">' + esc(file.label) + ' ↗</a></p>').join('\n'),
    SOCIAL_IMAGE: esc(new URL(resource.thumbnail, siteUrl).href),
    IMAGE_WIDTH: String(resource.thumbnailWidth || 640), IMAGE_HEIGHT: String(resource.thumbnailHeight || 500),
    COVER_STYLE: esc(resource.coverStyle || ''),
    FAQ: resource.faq.map(item => '<details><summary>' + esc(item.question) + '</summary><p>' + esc(item.answer) + '</p></details>').join('\n'),
    SEO_TITLE: esc(resource.seoTitle), META_DESCRIPTION: esc(resource.metaDescription), CANONICAL: esc(canonical),
    SLUG: esc(resource.slug), GATED_URL: esc(resource.gatedUrl), TITLE: esc(resource.title), TYPE: esc(resource.type),
    DURATION: esc(resource.duration || 'Free ' + itemLabel), SHORT_DESCRIPTION: esc(resource.shortDescription),
    THUMBNAIL: esc(resource.thumbnail), THUMBNAIL_ALT: esc(resource.thumbnailAlt || resource.title),
    BUTTON_LABEL: esc(resource.buttonLabel), OVERVIEW_HEADING: esc(resource.overviewHeading || 'About this ' + itemLabel),
    AUDIENCE_HEADING: esc(resource.audienceHeading || "Who it's for"),
    THUMBNAIL_CAPTION: esc(resource.thumbnailCaption || 'A look inside the ' + itemLabel + '.')
  };
  const html = render(template, values).replace(/[ \t]+$/gm, '');
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
  return '<article class="library-card" data-resource-type="' + esc(resource.type) + '"><div class="library-card-cover ' + (resource.coverStyle === 'publication' ? 'is-publication' : 'is-assessment') + '"><img src="' + esc(resource.libraryThumbnail || resource.thumbnail) + '" alt="' + esc(resource.libraryThumbnailAlt || resource.thumbnailAlt || resource.title) + '" width="640" height="400" loading="lazy"><span class="library-card-number">' + String(index + 1).padStart(2, '0') + '</span></div><div class="library-card-body"><span class="library-card-type">' + esc(resource.format || resource.type) + '</span><h2>' + esc(resource.title) + '</h2><p>' + esc(resource.shortDescription) + '</p><a class="library-card-button" data-library-resource="' + esc(resource.slug) + '" href="' + esc(destination) + '"' + extra + '>' + esc(resource.accessLabel || 'Open resource') + ' <span aria-hidden="true">↗</span></a><span class="library-card-location">' + (external ? resource.delivery === 'template' ? 'Opens in Notion · duplicate to your workspace' : 'Opens in a new tab' : 'Interactive tool · about 3 minutes') + '</span></div></article>';
}).join('\n');
const previews = catalogue.map((resource, index) => '<li id="' + esc(resource.slug) + '"><span class="preview-number">' + String(index+1).padStart(2,'0') + '</span><div><h3><a href="' + esc(resource.pageUrl) + '">' + esc(resource.title) + '</a></h3><span class="preview-format">' + esc(resource.format || resource.type) + '</span></div><span class="preview-included" aria-label="Included">✓</span></li>').join('\n');
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

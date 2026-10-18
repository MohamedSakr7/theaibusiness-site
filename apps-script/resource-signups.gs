/** Resource Signups — Google Apps Script V8 web app. No Sheets, tokens, or PII logs. */
const NOTION_API_VERSION_ = '2026-03-11';
const NOTION_API_ROOT_ = 'https://api.notion.com/v1';
const SIGNUP_LIMITS_ = Object.freeze({
  type: 6, email: 254, name: 200, role: 200, company: 200,
  source: 100, resource: 100, channel: 50, website: 200
});
const SIGNUP_SCHEMA_ = Object.freeze({
  'Name': 'title', 'Email': 'email', 'Role': 'rich_text', 'Company': 'rich_text',
  'First source': 'select', 'Resources taken': 'multi_select', 'Channel': 'select',
  'First seen': 'date', 'Last seen': 'date', 'Signups': 'number',
  'Promote to CRM': 'checkbox', 'Notes': 'rich_text'
});

function doPost(e) {
  let result;
  try {
    const raw = e && e.postData && e.postData.contents;
    if (typeof raw !== 'string' || !raw.trim()) fail_('A JSON request body is required.');
    if (raw.length > 8192) fail_('Request body exceeds 8192 characters.');
    let body;
    try { body = JSON.parse(raw); } catch (_) { fail_('Request body must contain valid JSON.'); }
    result = processSignup_(body);
  } catch (error) {
    // Never echo request bodies, upstream response bodies, or credentials.
    result = { ok: false, error: error.publicMessage || 'An unexpected server error occurred.' };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    ok: false, error: 'Use POST with a plain-text body containing JSON.'
  })).setMimeType(ContentService.MimeType.JSON);
}

function processSignup_(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail_('JSON body must be an object.');
  // Intentional synthetic success for honeypots: no settings, lock, read, or write.
  if (Object.prototype.hasOwnProperty.call(body, 'website') &&
      body.website !== '' && body.website !== null && body.website !== undefined) {
    return { ok: true, status: 'created' };
  }
  const input = validateSignup_(body);
  const config = signupConfig_();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) fail_('The signup service is busy. Please try again shortly.');
  try {
    const matches = findSignups_(config, input.email);
    if (matches.length > 1) fail_('Duplicate email records already exist in Notion. Manual review is required.');
    const now = new Date().toISOString();
    if (!matches.length) {
      // A new return is allowed, but has no name: a later signup can fill it.
      const properties = {
        'Name': { title: richText_(input.name) },
        'Email': { email: input.email },
        'Role': { rich_text: richText_(input.role) },
        'Company': { rich_text: richText_(input.company) },
        'First source': { select: { name: input.source } },
        'Resources taken': { multi_select: input.resource ? [{ name: input.resource }] : [] },
        'Channel': { select: { name: input.channel } },
        'First seen': { date: { start: now } },
        'Last seen': { date: { start: now } },
        'Signups': { number: 1 }
      };
      notionRequest_(config, '/pages', 'post', {
        parent: { type: 'data_source_id', data_source_id: config.dataSourceId }, properties: properties
      });
      return { ok: true, status: 'created' };
    }
    const page = matches[0];
    const saved = page.properties;
    if (!saved) fail_('Notion returned an incomplete signup record. No changes were made.');
    const tags = saved['Resources taken'] && saved['Resources taken'].multi_select;
    if (!Array.isArray(tags)) fail_('Resources taken must be a Notion multi-select property.');
    // Use IDs for existing tags; never replace the array with just the new slug.
    const resources = tags.map(function (tag) { return tag.id ? { id: tag.id } : { name: tag.name }; });
    if (input.resource && !tags.some(function (tag) { return tag.name === input.resource; })) {
      resources.push({ name: input.resource });
    }
    // Notion accepts at most 100 elements in these request arrays. Fail without losing old tags.
    if (resources.length > 100) fail_('This record has reached the Notion resource limit. Manual review is required.');
    const previousCount = saved['Signups'] && saved['Signups'].number;
    if (previousCount !== null && previousCount !== undefined &&
        (!Number.isSafeInteger(previousCount) || previousCount < 0 || previousCount >= Number.MAX_SAFE_INTEGER)) {
      fail_('The existing Signups count is invalid. Manual review is required.');
    }
    const changes = {
      'Resources taken': { multi_select: resources },
      'Signups': { number: (previousCount || 0) + 1 },
      'Last seen': { date: { start: now } }
    };
    if (input.name && !savedText_(saved['Name'], 'title')) changes['Name'] = { title: richText_(input.name) };
    if (input.role && !savedText_(saved['Role'], 'rich_text')) changes['Role'] = { rich_text: richText_(input.role) };
    if (input.company && !savedText_(saved['Company'], 'rich_text')) changes['Company'] = { rich_text: richText_(input.company) };
    // First source, First seen, Channel, Promote to CRM, Notes, and Email are deliberately omitted.
    notionRequest_(config, '/pages/' + page.id, 'patch', { properties: changes });
    return { ok: true, status: 'updated' };
  } finally {
    lock.releaseLock();
  }
}

function validateSignup_(body) {
  const input = {};
  Object.keys(body).forEach(function (key) {
    if (!Object.prototype.hasOwnProperty.call(SIGNUP_LIMITS_, key)) fail_('Request contains an unsupported field.');
  });
  Object.keys(SIGNUP_LIMITS_).forEach(function (key) {
    const value = body[key] === undefined || body[key] === null ? '' : body[key];
    if (typeof value !== 'string') fail_(key + ' must be a string.');
    if (value.length > SIGNUP_LIMITS_[key]) fail_(key + ' exceeds ' + SIGNUP_LIMITS_[key] + ' characters.');
    if (/[\u0000-\u001f\u007f]/.test(value)) fail_(key + ' contains unsupported control characters.');
    input[key] = value.trim();
  });
  if (input.type !== 'signup' && input.type !== 'return') fail_('type must be signup or return.');
  input.email = input.email.toLowerCase();
  // Conventional public email syntax; plus-addresses are preserved, never stripped.
  const emailParts = input.email.split('@');
  const local = emailParts[0];
  const domain = emailParts[1] || '';
  if (emailParts.length !== 2 || !local || local.length > 64 ||
      !/^[a-z0-9!#$%&'*+\-/=?^_`{|}~]+(?:\.[a-z0-9!#$%&'*+\-/=?^_`{|}~]+)*$/.test(local) ||
      domain.length > 253 || domain.split('.').length < 2 ||
      !domain.split('.').every(function (label) {
        return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label);
      })) fail_('A valid email address is required.');
  if (input.type === 'signup' && !input.name) fail_('Name is required for signup requests.');
  if (input.type === 'return') {
    input.name = ''; // Never accept a name from a silent return request.
    if (!input.resource) fail_('resource is required for return requests.');
    if (!input.source) input.source = input.resource;
  }
  if (!input.source) fail_('source is required for signup requests.');
  ['source', 'resource'].forEach(function (key) {
    if (input[key] && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input[key])) {
      fail_(key + ' must be a lowercase slug containing letters, numbers, and hyphens.');
    }
  });
  const channels = ['LinkedIn', 'Google', 'AI search', 'Direct', 'Other'];
  if (channels.indexOf(input.channel) === -1) input.channel = 'Other';
  return input;
}

function signupConfig_() {
  const properties = PropertiesService.getScriptProperties();
  const token = (properties.getProperty('NOTION_TOKEN') || '').trim();
  const dataSourceId = (properties.getProperty('NOTION_DATA_SOURCE_ID') || '').trim();
  if (!token || !dataSourceId) fail_('Signup service is not configured. Set NOTION_TOKEN and NOTION_DATA_SOURCE_ID in Script Properties.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dataSourceId)) {
    fail_('NOTION_DATA_SOURCE_ID must be a hyphenated Notion data source UUID.');
  }
  return { token: token, dataSourceId: dataSourceId };
}

function findSignups_(config, email) {
  const response = notionRequest_(config, '/data_sources/' + config.dataSourceId + '/query', 'post', {
    filter: { property: 'Email', email: { equals: email } }, page_size: 2
  });
  if (!Array.isArray(response.results)) fail_('Notion returned an invalid lookup response.');
  if (response.has_more || response.results.length > 1) {
    fail_('Duplicate email records already exist in Notion. Manual review is required.');
  }
  return response.results;
}

function notionRequest_(config, path, method, payload) {
  const readOnly = method === 'get' || /\/query$/.test(path);
  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try {
      const options = {
        method: method, muteHttpExceptions: true,
        headers: { Authorization: 'Bearer ' + config.token, 'Notion-Version': NOTION_API_VERSION_ },
        contentType: 'application/json'
      };
      if (payload !== undefined) options.payload = JSON.stringify(payload);
      response = UrlFetchApp.fetch(NOTION_API_ROOT_ + path, options);
    } catch (_) {
      // Writes may have committed even if the response was lost. Never blindly replay them.
      fail_(readOnly ? 'Could not reach Notion. Please try again later.' :
        'Notion write outcome is uncertain. Check the record before submitting again.');
    }
    const status = response.getResponseCode();
    if (status >= 200 && status < 300) {
      try { return JSON.parse(response.getContentText()); }
      catch (_) { fail_('Notion returned an unreadable response. Check the record before submitting again.'); }
    }
    if (status === 429 && attempt < 2) {
      const headers = response.getAllHeaders();
      const headerName = Object.keys(headers).find(function (key) { return key.toLowerCase() === 'retry-after'; });
      const seconds = headerName ? Number(headers[headerName]) : 1;
      // Respect Retry-After; do not retry early if the wait exceeds our bounded budget.
      if (Number.isFinite(seconds) && seconds >= 0 && seconds <= 5) {
        Utilities.sleep(Math.max(1000, Math.ceil(seconds * 1000)));
        continue;
      }
    }
    if (readOnly && status >= 500 && attempt < 2) {
      Utilities.sleep(500 * Math.pow(2, attempt));
      continue;
    }
    if (status === 401) fail_('Notion authentication failed. Check NOTION_TOKEN in Script Properties.');
    if (status === 403) fail_('Notion permission denied. Enable Read, Update, and Insert content and database access.');
    if (status === 404) fail_('Notion target was not found. Check the data source ID and connection access.');
    if (status === 429) fail_('Notion is rate limiting requests. Please try again later.');
    if (!readOnly && status >= 500) fail_('Notion write outcome is uncertain. Check the record before submitting again.');
    fail_('Notion rejected the request (HTTP ' + status + '). Check property names, types, and permission to create options.');
  }
  fail_('Notion could not complete the request.');
}

function savedText_(property, type) {
  if (!property || !Array.isArray(property[type])) fail_('Notion has a missing or incorrectly typed text property.');
  return property[type].map(function (part) {
    return part.plain_text || (part.text && part.text.content) || '';
  }).join('').trim();
}

function richText_(text) {
  return text ? [{ type: 'text', text: { content: text } }] : [];
}

function fail_(message) {
  const error = new Error(message);
  error.publicMessage = message;
  throw error;
}

/** Run manually in the editor before deploying. Checks settings, access, and exact schema. */
function checkConfiguration() {
  const config = signupConfig_();
  const source = notionRequest_(config, '/data_sources/' + config.dataSourceId, 'get');
  const properties = source.properties || {};
  Object.keys(SIGNUP_SCHEMA_).forEach(function (name) {
    if (!properties[name] || properties[name].type !== SIGNUP_SCHEMA_[name]) {
      fail_('Schema mismatch for ' + name + ': expected ' + SIGNUP_SCHEMA_[name] + '.');
    }
  });
  console.log('Configuration and all 12 property types verified. No records were written.');
}

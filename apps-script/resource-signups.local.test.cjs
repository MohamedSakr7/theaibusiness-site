// Offline contract tests. No network, Notion credentials, or Google account required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'resource-signups.gs'), 'utf8');
const liveTests = fs.readFileSync(path.join(__dirname, 'resource-signups-tests.gs'), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));
const dataSourceId = '8e4c0e6f-d7c6-40ff-9989-3359cc546daf';

function environment() {
  const state = { rows: [], calls: [], locked: false, releases: 0, sleeps: [], replies: [],
    settings: { NOTION_TOKEN: 'offline-test-placeholder', NOTION_DATA_SOURCE_ID: dataSourceId },
    logs: [], canLock: true };
  const response = (status, data, headers = {}) => ({
    getResponseCode: () => status, getContentText: () => JSON.stringify(data), getAllHeaders: () => headers
  });
  function properties(input) {
    const output = clone(input);
    for (const value of Object.values(output)) {
      if (value.multi_select) value.multi_select = value.multi_select.map(tag => {
        if (tag.id) {
          for (const row of state.rows) {
            const found = row.properties['Resources taken'].multi_select.find(item => item.id === tag.id);
            if (found) return clone(found);
          }
          throw Error('Unknown tag ID');
        }
        return { name: tag.name, id: 'tag-' + tag.name };
      });
    }
    return output;
  }
  const context = vm.createContext({
    console: { log: value => state.logs.push(value) },
    ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput: text => ({
      text, setMimeType() { return this; }
    }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => state.settings[key] }) },
    LockService: { getScriptLock: () => ({
      tryLock: () => { if (!state.canLock) return false; assert.equal(state.locked, false); state.locked = true; return true; },
      releaseLock: () => { assert.equal(state.locked, true); state.locked = false; state.releases++; }
    }) },
    Utilities: { sleep: ms => state.sleeps.push(ms) },
    UrlFetchApp: { fetch: (url, options) => {
      // Run the exact supplied live-test suite through the same doPost handler, offline.
      if (url === 'https://script.google.com/macros/s/OFFLINE/exec') {
        assert.equal(options.contentType, 'text/plain;charset=utf-8');
        return response(200, JSON.parse(context.doPost({ postData: { contents: options.payload } }).text));
      }
      assert.equal(options.headers['Notion-Version'], '2026-03-11');
      assert.equal(options.headers.Authorization, 'Bearer offline-test-placeholder');
      const requestPath = url.replace('https://api.notion.com/v1', '');
      if (options.method !== 'get') assert.equal(state.locked, true, 'lookup and write must stay inside lock');
      const payload = options.payload ? JSON.parse(options.payload) : undefined;
      state.calls.push({ path: requestPath, method: options.method, payload });
      if (state.replies.length) {
        const reply = state.replies.shift();
        if (reply.throw) throw Error('Do not leak: offline-test-placeholder');
        return response(reply.status, reply.body || {}, reply.headers);
      }
      if (options.method === 'get' && requestPath === '/data_sources/' + dataSourceId) {
        const schema = {};
        for (const [name, type] of Object.entries(JSON.parse(vm.runInContext('JSON.stringify(SIGNUP_SCHEMA_)', context)))) {
          schema[name] = { type };
        }
        return response(200, { properties: schema });
      }
      if (requestPath === '/data_sources/' + dataSourceId + '/query') {
        assert.equal(options.method, 'post');
        const email = payload.filter.email.equals;
        const found = state.rows.filter(row => row.properties.Email.email === email);
        return response(200, { results: clone(found.slice(0, 2)), has_more: found.length > 2 });
      }
      if (requestPath === '/pages') {
        assert.deepEqual(payload.parent, { type: 'data_source_id', data_source_id: dataSourceId });
        const row = { id: 'page-' + (state.rows.length + 1), properties: properties(payload.properties) };
        row.properties['Promote to CRM'] = { checkbox: false };
        row.properties.Notes = { rich_text: [] };
        state.rows.push(row);
        if (state.failAfterWrite) { state.failAfterWrite = false; throw Error('Simulated reply lost after create'); }
        return response(200, clone(row));
      }
      if (requestPath.startsWith('/pages/')) {
        assert.equal(options.method, 'patch');
        const row = state.rows.find(item => '/pages/' + item.id === requestPath);
        assert.ok(row);
        Object.assign(row.properties, properties(payload.properties));
        if (state.failAfterWrite) { state.failAfterWrite = false; throw Error('Simulated reply lost after update'); }
        return response(200, clone(row));
      }
      throw Error('Unexpected API path: ' + requestPath);
    } }
  });
  vm.runInContext(source, context);
  return { state, context, post: body => JSON.parse(context.doPost({ postData: { contents: JSON.stringify(body) } }).text) };
}
if (require.main === module) {
const signup = (extra = {}) => ({ type: 'signup', email: 'test+1@theaibusiness.net', name: 'Original Name',
  source: 'score-your-gtm', resource: 'score-your-gtm', channel: 'LinkedIn', ...extra });
let passed = 0;
function test(name, task) { task(); passed++; console.log('PASS ' + name); }

test('1. New email creates exactly one row and count 1', () => {
  const env = environment();
  assert.deepEqual(env.post(signup()), { ok: true, status: 'created' });
  assert.equal(env.state.rows.length, 1);
  assert.equal(env.state.rows[0].properties.Signups.number, 1);
  assert.equal(env.state.releases, 1);
});
test('2. Returning signup merges resources and preserves first/manual fields', () => {
  const env = environment(); env.post(signup());
  const row = env.state.rows[0];
  row.properties.Notes = { rich_text: [{ text: { content: 'Manual note' } }] };
  row.properties['Promote to CRM'] = { checkbox: true };
  const initial = clone(row.properties);
  assert.equal(env.post(signup({ resource: 'another-resource', source: 'another-resource',
    name: 'Replacement', role: 'Founder', company: 'Company', channel: 'Google' })).status, 'updated');
  assert.equal(env.state.rows.length, 1);
  assert.equal(row.properties.Signups.number, 2);
  assert.deepEqual(row.properties['Resources taken'].multi_select.map(tag => tag.name), ['score-your-gtm', 'another-resource']);
  for (const field of ['Name', 'First source', 'First seen', 'Channel', 'Notes', 'Promote to CRM']) {
    assert.deepEqual(row.properties[field], initial[field], field + ' must be preserved');
  }
  assert.equal(row.properties.Role.rich_text[0].text.content, 'Founder');
  assert.equal(row.properties.Company.rich_text[0].text.content, 'Company');
  env.post(signup({ role: 'Replacement role', company: 'Replacement company' }));
  assert.equal(row.properties.Role.rich_text[0].text.content, 'Founder');
  assert.equal(row.properties.Company.rich_text[0].text.content, 'Company');
});
test('3. Email case and whitespace normalize; plus-addressing remains intact', () => {
  const env = environment(); env.post(signup({ email: ' Test+1@TheAIBusiness.NET ' }));
  env.post(signup());
  assert.equal(env.state.rows.length, 1);
  assert.equal(env.state.rows[0].properties.Email.email, 'test+1@theaibusiness.net');
  assert.equal(env.state.rows[0].properties.Signups.number, 2);
});
test('4. Minimal return works and ignores supplied names', () => {
  const env = environment(); env.post(signup());
  assert.equal(env.post({ type: 'return', email: signup().email, resource: 'return-resource' }).status, 'updated');
  env.post({ type: 'return', email: signup().email, resource: 'return-resource', name: 'Ignored' });
  const row = env.state.rows[0];
  assert.equal(row.properties.Signups.number, 3);
  assert.equal(row.properties.Name.title[0].text.content, 'Original Name');
  assert.equal(row.properties['Resources taken'].multi_select.length, 2);
});
test('5. Missing signup name rejects before any Notion call', () => {
  const env = environment();
  assert.match(env.post(signup({ name: '' })).error, /Name is required/);
  assert.equal(env.state.calls.length, 0);
});
test('6. Honeypot succeeds without config, lock, read, create, or update', () => {
  const env = environment(); env.state.settings = {};
  for (const value of ['spam', ' ', false, 0, {}]) assert.equal(env.post({ website: value }).ok, true);
  assert.equal(env.state.calls.length, 0);
  assert.equal(env.state.releases, 0);
});
test('Validation rejects bad JSON, body shapes, email, types, controls, slugs, and field limits', () => {
  const env = environment();
  for (const body of [null, [], signup({ type: 'other' }), signup({ email: 'bad' }),
    signup({ email: 'a..b@example.com' }), signup({ email: 'a@-bad.com' }), signup({ role: {} }),
    signup({ name: 'x'.repeat(201) }), signup({ company: 'a\nb' }), signup({ resource: 'bad,option' }),
    signup({ source: '' }), signup({ unexpected: 'value' }), { type: 'return', email: signup().email }]) {
    assert.equal(env.post(body).ok, false, JSON.stringify(body));
  }
  for (const [field, limit] of Object.entries(vm.runInContext('SIGNUP_LIMITS_', env.context))) {
    if (field !== 'website') assert.equal(env.post(signup({ [field]: 'x'.repeat(limit + 1) })).ok, false);
  }
  assert.equal(JSON.parse(env.context.doPost({ postData: { contents: '{bad' } }).text).ok, false);
  assert.equal(JSON.parse(env.context.doPost({ postData: { contents: ' '.repeat(8200) } }).text).ok, false);
  assert.equal(env.state.calls.length, 0);
});
test('Library has no resource; invalid channel becomes Other; return can precede signup', () => {
  const env = environment(); env.post(signup({ source: 'library', resource: '', channel: 'unknown' }));
  assert.deepEqual(env.state.rows[0].properties['Resources taken'].multi_select, []);
  assert.equal(env.state.rows[0].properties.Channel.select.name, 'Other');
  const second = environment();
  assert.equal(second.post({ type: 'return', email: signup().email, resource: 'new-resource' }).status, 'created');
  assert.deepEqual(second.state.rows[0].properties.Name.title, []);
  second.post(signup());
  assert.equal(second.state.rows[0].properties.Name.title[0].text.content, 'Original Name');
  assert.equal(second.state.rows[0].properties['First source'].select.name, 'new-resource');
});
test('Busy lock, duplicate records, and invalid counts never write', () => {
  const env = environment(); env.state.canLock = false;
  assert.match(env.post(signup()).error, /busy/); assert.equal(env.state.calls.length, 0);
  env.state.canLock = true; env.post(signup());
  env.state.rows.push(clone(env.state.rows[0]));
  assert.match(env.post(signup()).error, /Duplicate/);
  env.state.rows.pop(); env.state.rows[0].properties.Signups.number = -1;
  assert.match(env.post(signup()).error, /count is invalid/);
  assert.equal(env.state.locked, false);
  assert.equal(env.state.calls.filter(call => call.path === '/pages').length, 1);
});
test('Resource limit fails without removing existing resources', () => {
  const env = environment(); env.post(signup());
  const row = env.state.rows[0];
  row.properties['Resources taken'].multi_select = Array.from({ length: 100 }, (_, n) => ({ id: 'id-' + n, name: 'r-' + n }));
  assert.match(env.post(signup()).error, /resource limit/);
  assert.equal(row.properties['Resources taken'].multi_select.length, 100);
  assert.equal(row.properties.Signups.number, 1);
});
test('Rate limits respect Retry-After and writes are not replayed after uncertain errors', () => {
  const env = environment();
  env.state.replies = [{ status: 429, headers: { 'Retry-After': '2' } }];
  assert.equal(env.post(signup()).ok, true); assert.deepEqual(env.state.sleeps, [2000]);
  const longWait = environment(); longWait.state.replies = [{ status: 429, headers: { 'Retry-After': '60' } }];
  assert.match(longWait.post(signup()).error, /rate limiting/); assert.equal(longWait.state.calls.length, 1);
  for (const uncertain of [{ status: 503 }, { throw: true }]) {
    const broken = environment();
    broken.state.replies = [{ status: 200, body: { results: [], has_more: false } }, uncertain];
    const result = broken.post(signup());
    assert.match(result.error, /outcome is uncertain/);
    assert.equal(broken.state.calls.length, 2);
    assert.equal(JSON.stringify(result).includes('offline-test-placeholder'), false);
    assert.equal(broken.state.locked, false);
  }
});
test('Supplied six-test live runner works end to end against the offline API simulator', () => {
  const env = environment();
  vm.runInContext(liveTests.replace('PASTE_YOUR_EXEC_URL_HERE', 'https://script.google.com/macros/s/OFFLINE/exec'), env.context);
  // Its verification queries are editor reads, outside a web request lock.
  const original = env.context.findSignups_;
  env.context.findSignups_ = function (...args) {
    const held = env.state.locked; env.state.locked = true;
    try { return original(...args); } finally { env.state.locked = held; }
  };
  const result = env.context.runResourceSignupTests();
  assert.equal(result.passed, 6);
  assert.equal(env.state.rows.length, 1);
  assert.equal(env.state.rows[0].properties.Signups.number, 4);
});
console.log('\n' + passed + ' offline test groups passed. Live Notion and browser tests still require deployment.');
}
module.exports = { environment };

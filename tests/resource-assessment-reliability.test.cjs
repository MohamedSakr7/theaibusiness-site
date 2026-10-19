const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { environment } = require('../apps-script/resource-signups.local.test.cjs');
const html = fs.readFileSync(require('node:path').join(__dirname, '../score-your-gtm/index.html'), 'utf8');

function renderAnswers(choice, overrides = {}) {
  const elements = {};
  const context = vm.createContext({
    document: { getElementById: id => elements[id] ||= { innerHTML: '', addEventListener() {} } },
    txt: () => '', esc: value => String(value),
    railEl: {}, show() {}, window: { print() {} }
  });
  for (const name of ['AREAS', 'VERDICT', 'FIXES', 'BANDS', 'EFFORT_MAP', 'EFFORT_LABEL']) {
    vm.runInContext('var ' + name + ' = ' + html.match(new RegExp('var ' + name + ' = ([\\s\\S]*?);'))[1] + ';', context);
  }
  context.val = name => {
    if (name === 'ab_eff') return 0;
    const [key, index] = name.split('_');
    const question = context.AREAS.find(area => area.key === key).questions[Number(index)];
    return question.opts.findIndex(option => option[1] === (overrides[name] ?? choice));
  };
  vm.runInContext(html.match(/function render\(\)\{[\s\S]*?(?=  for\(var i=0;i<allSteps.length;i\+\+\) checkStep\(i\);)/)[0], context);
  context.render();
  return elements.result.innerHTML;
}

test('Actual assessment renderer gives next-level advice at 100 and acknowledges a weak area at 89', () => {
  const high = renderAnswers(3);
  assert.match(high, /class="sn">100</);
  assert.match(high, /Keep the parts working together/);
  assert.match(high, /Run one measured experiment/);
  assert.match(high, /Your next two moves/);
  assert.doesNotMatch(high, /The one thing holding you back most/);
  const mixed = renderAnswers(3, { create_0: 1, create_1: 1 });
  assert.match(mixed, /class="sn">89</);
  assert.match(mixed, /overall score is strong, but getting found is the weak spot/);
  assert.doesNotMatch(mixed, /Solid across the board/);
});

test('Old assessment URL redirects with query/hash; embedded assessment stays in place and is noindex', () => {
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const search of ['', '?utm_source=linkedin', '?embedded=0']) {
    let target;
    let captured = false;
    vm.runInNewContext(script, { URLSearchParams, window: { ResourceGate: { captureChannel() { captured = true; } }, location: { search, hash: '#start', replace: value => { assert.equal(captured, true); target = value; } } } });
    assert.equal(target, '/resources/score-your-gtm/' + (search === '?embedded=0' ? '' : search) + '#start');
  }
  let redirected = false;
  vm.runInNewContext(script, { URLSearchParams, window: { ResourceGate: { captureChannel() {} }, location: { search: '?embedded=1', replace: () => { redirected = true; } } } });
  assert.equal(redirected, false);
  assert.match(html, /name="robots" content="noindex,follow"/);
  assert.match(html, /rel="canonical" href="https:\/\/theaibusiness.net\/resources\/score-your-gtm\/"/);
  assert.doesNotMatch(html, /formsubmit|NOTIFY_EMAIL|id:"name"|id:"email"/i);
});

test('Backend deduplicates commits whose create or update response was lost', () => {
  const env = environment();
  const request = { type: 'signup', name: 'E2E TEST', email: 'e2e-test+lost@example.com', source: 'library', resource: '', requestId: 'first-request' };
  env.state.failAfterWrite = true;
  assert.equal(env.post(request).ok, false);
  assert.equal(env.state.rows[0].properties.Signups.number, 1);
  assert.equal(env.post(request).ok, true);
  assert.equal(env.state.rows[0].properties.Signups.number, 1);
  const second = { ...request, requestId: 'second-request' };
  env.state.failAfterWrite = true;
  assert.equal(env.post(second).ok, false);
  assert.equal(env.state.rows[0].properties.Signups.number, 2);
  assert.equal(env.post(second).ok, true);
  assert.equal(env.post(request).ok, true);
  assert.equal(env.state.rows[0].properties.Signups.number, 2);
  assert.equal(env.state.rows.length, 1);
});

test('Request ID history retains the latest 20 without losing recent deduplication', () => {
  const env = environment();
  const request = { type: 'signup', name: 'E2E TEST', email: 'e2e-test+history@example.com', source: 'library', resource: '', requestId: 'first-request' };
  env.post(request);
  const ids = Array.from({ length: 100 }, (_, i) => 'request-' + String(i).padStart(3, '0') + '-abcdefghijklmnopqrstuvwxyz');
  env.state.rows[0].properties['Request IDs'].rich_text = env.context.richText_(ids.join('\n'));
  assert.ok(env.state.rows[0].properties['Request IDs'].rich_text.length > 1);
  assert.equal(env.post({ ...request, requestId: ids[0] }).ok, true);
  assert.equal(env.state.rows[0].properties.Signups.number, 1);
  assert.equal(env.post({ ...request, requestId: 'new-request' }).ok, true);
  assert.equal(env.state.rows[0].properties.Signups.number, 2);
  const savedIds = env.state.rows[0].properties['Request IDs'].rich_text.map(part => part.text.content).join('').split('\n');
  assert.equal(savedIds.length, 20);
  assert.deepEqual(Array.from(savedIds), ids.slice(-19).concat('new-request'));
  assert.equal(env.post({ ...request, requestId: ids[99] }).ok, true);
  assert.equal(env.state.rows[0].properties.Signups.number, 2);
});

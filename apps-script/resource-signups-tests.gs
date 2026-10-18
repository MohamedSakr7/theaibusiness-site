/** Paste into a second Apps Script file named Tests; use the endpoint from resource-config.js. */
const RESOURCE_SIGNUPS_TEST_URL_ = 'PASTE_YOUR_EXEC_URL_HERE';

/** Writes temporary Notion records. Run once on a clean set of the three test emails. */
function runResourceSignupTests() {
  const url = RESOURCE_SIGNUPS_TEST_URL_;
  testAssert_(/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url),
    'Paste the deployed /exec URL into RESOURCE_SIGNUPS_TEST_URL_ in Tests.');
  checkConfiguration();
  const config = signupConfig_();
  ['test+1@theaibusiness.net', 'test+2@theaibusiness.net', 'test+3@theaibusiness.net'].forEach(function (email) {
    testAssert_(findSignups_(config, email).length === 0,
      'Delete or move previous test rows to Trash first: ' + email);
  });
  const email = 'test+1@theaibusiness.net';
  let firstId, firstSeen;
  const outcomes = [];
  function step(label, task) {
    task();
    outcomes.push(label);
    console.log('PASS ' + label);
  }
  step('1. New signup creates one row with Signups = 1', function () {
    const result = postLiveTest_(url, {
      type: 'signup', email: email, name: 'Resource Signup Test',
      source: 'score-your-gtm', resource: 'score-your-gtm', channel: 'LinkedIn', website: ''
    });
    testAssert_(result.ok === true && result.status === 'created', 'Expected created.');
    const row = testRow_(config, email, 1);
    firstId = row.id;
    firstSeen = row.properties['First seen'].date.start;
    testAssert_(row.properties['Email'].email === email, 'Email was not saved normalized.');
    testAssert_(savedText_(row.properties['Name'], 'title') === 'Resource Signup Test', 'Name mismatch.');
    testAssert_(row.properties['First source'].select.name === 'score-your-gtm', 'First source mismatch.');
    testAssert_(row.properties['Channel'].select.name === 'LinkedIn', 'Channel mismatch.');
    testAssert_(row.properties['First seen'].date.start === row.properties['Last seen'].date.start,
      'First seen and Last seen must start together.');
    testTags_(row, ['score-your-gtm']);
  });
  step('2. A second resource updates the same row with both resources and Signups = 2', function () {
    const result = postLiveTest_(url, {
      type: 'signup', email: email, name: 'Do Not Overwrite', role: 'Founder', company: 'Test Company',
      source: 'signup-test-resource', resource: 'signup-test-resource', channel: 'Google'
    });
    testAssert_(result.ok === true && result.status === 'updated', 'Expected updated.');
    const row = testRow_(config, email, 2);
    testAssert_(row.id === firstId, 'A different row was used.');
    testTags_(row, ['score-your-gtm', 'signup-test-resource']);
    testAssert_(savedText_(row.properties['Name'], 'title') === 'Resource Signup Test', 'Existing name changed.');
    testAssert_(savedText_(row.properties['Role'], 'rich_text') === 'Founder', 'Empty role was not filled.');
    testAssert_(savedText_(row.properties['Company'], 'rich_text') === 'Test Company', 'Empty company was not filled.');
  });
  step('3. Mixed-case email updates that same row', function () {
    const result = postLiveTest_(url, {
      type: 'signup', email: ' Test+1@TheAIBusiness.NET ', name: 'Another Name',
      source: 'library', resource: '', channel: 'Direct'
    });
    testAssert_(result.ok === true && result.status === 'updated', 'Mixed-case email did not match.');
    testAssert_(testRow_(config, email, 3).id === firstId, 'Mixed-case email created a new row.');
  });
  step('4. Return with only type, email, and resource updates that same row', function () {
    const result = postLiveTest_(url, { type: 'return', email: email, resource: 'score-your-gtm' });
    testAssert_(result.ok === true && result.status === 'updated', 'Minimal return did not update.');
    const row = testRow_(config, email, 4);
    testAssert_(row.id === firstId, 'Return used a different row.');
    testTags_(row, ['score-your-gtm', 'signup-test-resource']);
    testAssert_(row.properties['First seen'].date.start === firstSeen, 'First seen changed.');
    testAssert_(row.properties['First source'].select.name === 'score-your-gtm', 'First source changed.');
    testAssert_(row.properties['Channel'].select.name === 'LinkedIn', 'Original channel changed.');
    testAssert_(row.properties['Last seen'].date.start >= firstSeen, 'Invalid Last seen.');
  });
  step('5. Signup without a name is rejected and writes nothing', function () {
    const result = postLiveTest_(url, {
      type: 'signup', email: 'test+2@theaibusiness.net', source: 'library', resource: ''
    });
    testAssert_(result.ok === false && /name is required/i.test(result.error || ''), 'Missing name was not rejected.');
    testAssert_(findSignups_(config, 'test+2@theaibusiness.net').length === 0, 'Invalid signup wrote a row.');
  });
  step('6. Filled honeypot returns success with no create or update', function () {
    const before = testRow_(config, email, 4).properties['Last seen'].date.start;
    ['test+3@theaibusiness.net', email].forEach(function (address) {
      const result = postLiveTest_(url, {
        type: 'signup', email: address, name: 'Bot Test', source: 'library', website: 'spam'
      });
      testAssert_(result.ok === true, 'Honeypot did not return synthetic success.');
    });
    testAssert_(findSignups_(config, 'test+3@theaibusiness.net').length === 0, 'Honeypot created a row.');
    const after = testRow_(config, email, 4);
    testAssert_(after.properties['Last seen'].date.start === before, 'Honeypot changed an existing row.');
  });
  console.log('All ' + outcomes.length + ' live tests passed against the deployed /exec endpoint and Notion.');
  console.log('Delete the test+1@theaibusiness.net row afterwards. On a failed run, also check test+2 and test+3.');
  console.log('The test creates a Resources taken option named signup-test-resource; remove that option after cleanup if desired.');
  return { passed: outcomes.length, tests: outcomes };
}

function postLiveTest_(url, payload) {
  const response = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'text/plain;charset=utf-8', payload: JSON.stringify(payload),
    followRedirects: true, muteHttpExceptions: true
  });
  testAssert_(response.getResponseCode() === 200, 'The web app did not return HTTP 200. Check Anyone access and deployment.');
  let data;
  try { data = JSON.parse(response.getContentText()); }
  catch (_) { throw new Error('Expected JSON. Check the /exec URL and anonymous deployment access.'); }
  if (!data.ok && data.error && !/name is required/i.test(data.error)) throw new Error(data.error);
  return data;
}

function testRow_(config, email, count) {
  // Bounded polling accommodates brief Notion read visibility delays.
  for (let attempt = 0; attempt < 4; attempt++) {
    const rows = findSignups_(config, email);
    if (rows.length === 1 && rows[0].properties['Signups'].number === count) return rows[0];
    if (attempt < 3) Utilities.sleep(1000);
  }
  throw new Error('Expected exactly one row with Signups = ' + count + '. Inspect the test rows in Notion.');
}

function testTags_(row, names) {
  const actual = row.properties['Resources taken'].multi_select.map(function (tag) { return tag.name; }).sort();
  testAssert_(JSON.stringify(actual) === JSON.stringify(names.slice().sort()), 'Resource values were lost or duplicated.');
}

function testAssert_(condition, message) {
  if (!condition) throw new Error(message);
}

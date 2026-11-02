'use strict';
// First-party UI boundary regression using controlled, synthetic API responses.
// Invented hash references deliberately do not prove payload integrity. No
// public API or signed evidence service participates in this test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PW_MODULE);

const guiUrl = process.env.HASH_CHAIN_GUI_URL;
const mockGuiUrl = process.env.HASH_CHAIN_MOCK_GUI_URL;
assert.ok(guiUrl, 'Set HASH_CHAIN_GUI_URL to the local VITE_USE_MOCK=false GUI');
const origin = new URL(guiUrl).origin;
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname), 'Only a loopback GUI is allowed');
const output = path.resolve(process.env.HASH_CHAIN_TEST_OUTPUT || 'hash-chain-test-output');
fs.mkdirSync(output, { recursive: true });

const trace = index => `01934fff-1111-7000-8000-${index.toString(16).padStart(12, '0')}`;
const eventId = index => `01934e3a-6a1a-7000-8000-${index.toString(16).padStart(12, '0')}`;
const traces = { first: trace(1), second: trace(2), wrongTrace: trace(3), wrongId: trace(4),
  searchError: trace(5), detailError: trace(6), slow: trace(7), fast: trace(8), unknown: trace(9), single: trace(10) };
function detail(index, selectedTrace, hash, previous) {
  return {
    header: { event_id: eventId(index), trace_id: selectedTrace, timestamp_int: '1764072000000000000',
      timestamp_iso: '2025-11-25T12:00:00.000Z', timestamp_precision: 'MILLISECOND',
      event_type: 'SIG', event_type_code: 1, clock_sync_status: 'NTP_SYNCED', hash_algo: 'SHA256',
      venue_id: 'TEST', symbol: 'SYNTHETIC', account_id: 'synthetic-account', anchor_status: 'PENDING' },
    payload: { trade_data: { price: '123.45' } },
    security: { event_hash: hash, prev_hash: previous },
  };
}
const data = new Map();
function addPair(selectedTrace, firstIndex, hashCharacter) {
  const firstHash = hashCharacter.repeat(64), secondHash = 'f'.repeat(64);
  const values = [detail(firstIndex, selectedTrace, firstHash, '0'.repeat(64)),
    detail(firstIndex + 1, selectedTrace, secondHash, firstHash)];
  data.set(selectedTrace, values);
  return values;
}
const first = addPair(traces.first, 1, 'a');
first[0].security.event_hash = first[0].security.event_hash.toUpperCase();
addPair(traces.second, 3, 'b');
const wrongTrace = addPair(traces.wrongTrace, 5, 'c');
wrongTrace[0].header.trace_id = traces.first;
const wrongId = addPair(traces.wrongId, 7, 'd');
const wrongIdRequested = wrongId[0].header.event_id;
wrongId[0].header.event_id = eventId(99);
addPair(traces.detailError, 9, 'e');
const slow = addPair(traces.slow, 11, 'a');
const fast = addPair(traces.fast, 13, 'b');
data.set(traces.single, [detail(15, traces.single, 'e'.repeat(64), '0'.repeat(64))]);
const detailRows = new Map();
for (const [selectedTrace, values] of data) {
  for (const [index, value] of values.entries()) {
    const requested = selectedTrace === traces.wrongId && index === 0 ? wrongIdRequested : value.header.event_id;
    detailRows.set(requested, value);
  }
}
const checks = [], pageErrors = [], requests = [];
let browser, context, mockContext;
let releaseSlow, markSlowSeen, markSlowDone;
const slowRelease = new Promise(resolve => { releaseSlow = resolve; });
const slowSeen = new Promise(resolve => { markSlowSeen = resolve; });
const slowDone = new Promise(resolve => { markSlowDone = resolve; });
let delayedResponseDisposition = 'NOT_REQUESTED';

async function check(name, fn) {
  try { await fn(); checks.push({ name, status: 'passed' }); }
  catch (error) { checks.push({ name, status: 'failed', error: String(error) }); throw error; }
}
async function bounded(promise, description) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Timed out: ' + description)), 15000);
    })]);
  } finally { clearTimeout(timer); }
}

(async () => {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/v1/')) return route.continue();
    requests.push({ method: request.method(), path: url.pathname, search: url.search });
    const json = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (url.pathname === '/api/v1/system/status') return json({ total_events: 0, active_nodes: 0,
      precision: 'MILLISECOND', tier: 'SILVER', last_anchor: { network: 'synthetic', tx_hash: 'not-an-anchor',
        block_number: 0, anchored_at: '2025-11-25T12:00:00.000Z' } });
    if (url.pathname === '/api/v1/events') {
      const selectedTrace = url.searchParams.get('trace_id');
      if (selectedTrace === traces.searchError) return json({ error: 'TEST_UNAVAILABLE', message: 'Synthetic search outage' }, 503);
      const values = data.get(selectedTrace) || [];
      return json({ events: values.map((value, index) => ({
        event_id: selectedTrace === traces.wrongId && index === 0 ? wrongIdRequested : value.header.event_id,
        type: 'SIG', event_type_code: 1, timestamp: value.header.timestamp_iso,
        venue: 'TEST', symbol: 'SYNTHETIC', hash_prefix: value.security.event_hash.slice(0, 6), status: 'PENDING',
      })), query: { trace_id: selectedTrace }, total: selectedTrace === traces.first ? 100 : values.length });
    }
    const match = /^\/api\/v1\/events\/([^/]+)$/.exec(url.pathname);
    if (match) {
      if (match[1] === eventId(9)) return json({ error: 'TEST_UNAVAILABLE', message: 'Synthetic detail outage' }, 503);
      if (match[1] === slow[0].header.event_id) {
        delayedResponseDisposition = 'HELD';
        markSlowSeen();
        await slowRelease;
        try { await json(detailRows.get(match[1])); delayedResponseDisposition = 'RELEASED'; }
        catch { delayedResponseDisposition = 'CANCELLED_AFTER_TRACE_CHANGE'; }
        finally { markSlowDone(); }
        return;
      }
      const value = detailRows.get(match[1]);
      return value ? json(value) : json({ error: 'NOT_FOUND', message: 'Unknown synthetic event' }, 404);
    }
    return json({ error: 'NOT_FOUND', message: 'Unsupported synthetic endpoint' }, 404);
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => pageErrors.push(String(error)));

  async function select(selectedTrace) {
    await page.getByLabel('Trace ID', { exact: true }).fill(selectedTrace);
    await page.getByRole('button', { name: 'Inspect links', exact: true }).click();
  }
  async function result(selectedTrace, status) {
    const box = page.getByTestId('chain-result').filter({ hasText: selectedTrace });
    await box.waitFor();
    assert.equal(await box.getAttribute('data-status'), status);
    assert.equal(await page.getByLabel('Trace ID', { exact: true }).inputValue(), selectedTrace);
    assert.equal(new URL(page.url()).searchParams.get('trace_id'), selectedTrace);
    assert.match(await box.innerText(), /Cryptographic integrity: not checked/);
    assert.match(await box.innerText(), /Completeness: not established/);
    return box;
  }
  const eventLinks = () => page.locator('a[href*="/events/"]');
  async function displayedEvents(expected) {
    const links = await eventLinks().evaluateAll(elements => elements.map(element => element.getAttribute('href')));
    assert.deepEqual(links.map(link => link.split('/events/')[1]), expected);
  }

  await page.goto(origin + '/chain?trace_id=' + traces.first);
  await check('invented matching links remain a limited comparison and mixed-case hashes agree in summary and rows', async () => {
    const box = await result(traces.first, 'LINKS_MATCH');
    await page.getByTestId('chain-source').filter({ hasText: 'Configured API data' }).waitFor();
    assert.match(await box.innerText(), /more events than this page retrieved/);
    await displayedEvents([eventId(1), eventId(2)]);
    const rows = page.getByRole('table').getByRole('row');
    assert.match(await rows.nth(1).innerText(), /Not compared/);
    assert.match(await rows.nth(2).innerText(), /Matches/);
    assert.doesNotMatch(await rows.nth(2).innerText(), /Differs/);
    assert.doesNotMatch(await page.locator('body').innerText(), /Hash Chain Integrity Verified|tampering immediately detectable/i);
    await page.screenshot({ path: path.join(output, 'limited-link-comparison.png'), fullPage: true });
    await select(traces.second.toUpperCase());
    await result(traces.second, 'LINKS_MATCH');
    await displayedEvents([eventId(3), eventId(4)]);
    assert.ok(requests.some(request => request.path === '/api/v1/events' &&
      new URLSearchParams(request.search).get('trace_id') === traces.second));
  });

  await check('unknown trace clears previous records and does not fabricate an empty-chain success', async () => {
    await select(traces.unknown);
    await page.getByTestId('chain-empty').waitFor();
    assert.equal(await page.getByTestId('chain-result').count(), 0);
    assert.equal(await eventLinks().count(), 0);
    assert.match(await page.getByTestId('chain-empty').innerText(), /does not establish that no event occurred/);
    await page.screenshot({ path: path.join(output, 'unknown-trace.png'), fullPage: true });
  });

  await check('a singleton remains insufficient and its first hash is not called verified genesis', async () => {
    await select(traces.single);
    const box = await result(traces.single, 'INSUFFICIENT_DATA');
    assert.match(await box.innerText(), /0 adjacent links compared/);
    await displayedEvents([eventId(15)]);
    assert.match(await page.getByRole('table').innerText(), /Not compared/);
    assert.doesNotMatch(await page.getByRole('table').innerText(), /Matches|Verified/);
  });

  await check('mismatched detail event IDs and trace IDs produce invalid-data results without rendering those records', async () => {
    for (const selectedTrace of [traces.wrongTrace, traces.wrongId]) {
      await select(selectedTrace);
      await result(selectedTrace, 'INVALID_DATA');
      assert.equal(await eventLinks().count(), 0);
      assert.equal(await page.getByRole('table').count(), 0);
    }
  });

  await check('query changes and browser back/forward bind the displayed data to the current URL', async () => {
    await select(traces.first); await result(traces.first, 'LINKS_MATCH');
    await select(traces.second); await result(traces.second, 'LINKS_MATCH');
    await displayedEvents([eventId(3), eventId(4)]);
    await page.goBack(); await result(traces.first, 'LINKS_MATCH');
    await displayedEvents([eventId(1), eventId(2)]);
    await page.goForward(); await result(traces.second, 'LINKS_MATCH');
    await displayedEvents([eventId(3), eventId(4)]);
  });

  await check('an offline refetch hides the previous result while paused and resumes only after reconnection', async () => {
    await select(traces.first); await result(traces.first, 'LINKS_MATCH');
    try {
      await context.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event('offline')));
      await page.getByRole('button', { name: 'Inspect links', exact: true }).click();
      await page.getByTestId('chain-paused').waitFor();
      assert.match(await page.getByTestId('chain-paused').innerText(), /Waiting for a connection/);
      assert.equal(await page.getByTestId('chain-result').count(), 0);
      assert.equal(await eventLinks().count(), 0);
      assert.equal(await page.getByRole('table').count(), 0);
      await page.screenshot({ path: path.join(output, 'offline-paused-no-result.png'), fullPage: true });
    } finally {
      await context.setOffline(false);
      await page.evaluate(() => window.dispatchEvent(new Event('online')));
    }
    await result(traces.first, 'LINKS_MATCH');
    await displayedEvents([eventId(1), eventId(2)]);
  });

  await check('a late response from a previous trace cannot repopulate the new selection', async () => {
    await select(traces.slow);
    await bounded(slowSeen, 'the intentionally delayed detail request');
    await page.getByTestId('chain-loading').waitFor();
    assert.equal(await page.getByTestId('chain-result').count(), 0);
    assert.equal(await eventLinks().count(), 0);
    await select(traces.fast);
    await result(traces.fast, 'LINKS_MATCH');
    await displayedEvents(fast.map(value => value.header.event_id));
    releaseSlow(); await bounded(slowDone, 'release or cancellation of the old detail response');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await result(traces.fast, 'LINKS_MATCH');
    await displayedEvents(fast.map(value => value.header.event_id));
  });

  await check('search and detail errors clear the old result without fallback or a retained success banner', async () => {
    for (const selectedTrace of [traces.searchError, traces.detailError]) {
      await select(traces.first); await result(traces.first, 'LINKS_MATCH');
      await select(selectedTrace);
      await page.getByTestId('chain-error').waitFor();
      assert.equal(await page.getByTestId('chain-result').count(), 0);
      assert.equal(await eventLinks().count(), 0);
      assert.equal(await page.getByRole('table').count(), 0);
      assert.match(await page.getByTestId('chain-error').innerText(), /No comparison result is shown/);
    }
    await page.screenshot({ path: path.join(output, 'detail-error-clears-result.png'), fullPage: true });
  });

  await check('the legacy path route still works and subsequent selection uses the canonical query route', async () => {
    await page.goto(origin + '/chain/' + traces.first);
    await page.getByTestId('chain-result').filter({ hasText: traces.first }).waitFor();
    await displayedEvents([eventId(1), eventId(2)]);
    await select(traces.second);
    await result(traces.second, 'LINKS_MATCH');
    assert.equal(new URL(page.url()).pathname, '/chain');
  });

  await check('at 390px the form and result fit the viewport and any table overflow stays inside its scroll container', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await select(traces.first);
    const box = await result(traces.first, 'LINKS_MATCH');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const width = await page.evaluate(() => window.innerWidth);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      'The document itself must not need horizontal scrolling');
    for (const element of [page.getByLabel('Trace ID', { exact: true }),
      page.getByRole('button', { name: 'Inspect links', exact: true }), box]) {
      const bounds = await element.boundingBox();
      assert.ok(bounds && bounds.width > 0 && bounds.x >= -1 && bounds.x + bounds.width <= width + 1,
        'The form controls and result must fit the mobile viewport');
    }
    const tableViewport = await page.getByRole('table').evaluate(table => {
      const container = table.parentElement, bounds = container.getBoundingClientRect();
      return { left: bounds.left, right: bounds.right, clientWidth: container.clientWidth,
        scrollWidth: container.scrollWidth, overflowX: getComputedStyle(container).overflowX };
    });
    assert.ok(tableViewport.left >= -1 && tableViewport.right <= width + 1);
    if (tableViewport.scrollWidth > tableViewport.clientWidth + 1) {
      assert.ok(['auto', 'scroll'].includes(tableViewport.overflowX), 'Wide table content must scroll inside its own container');
    }
    await page.screenshot({ path: path.join(output, 'mobile-link-inspection.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
  });

  if (mockGuiUrl) {
    const mockOrigin = new URL(mockGuiUrl).origin;
    assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(mockOrigin).hostname));
    mockContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await mockContext.route('**/*', route => new URL(route.request().url()).origin === mockOrigin
      ? route.continue() : route.abort());
    const mockPage = await mockContext.newPage();
    mockPage.setDefaultTimeout(15000);
    mockPage.on('pageerror', error => pageErrors.push('mock: ' + String(error)));
    await mockPage.goto(mockOrigin + '/chain');

    await check('the production mock build labels synthetic data and displays different subsets for its two sample traces', async () => {
      await mockPage.getByTestId('chain-source').filter({ hasText: 'Synthetic demo data' }).waitFor();
      for (const [sample, selectedTrace, expectedCount] of [
        [1, '01934e3a-6a1a-7000-8000-aaaaaaaaaaaa', 4],
        [2, '01934e3b-5b2b-7000-9000-bbbbbbbbbbbb', 3],
      ]) {
        await mockPage.getByRole('button', { name: 'Sample ' + sample, exact: true }).click();
        const box = mockPage.getByTestId('chain-result').filter({ hasText: selectedTrace });
        await box.waitFor();
        assert.equal(await box.getAttribute('data-status'), 'LINKS_MATCH');
        assert.equal(await mockPage.locator('a[href*="/events/"]').count(), expectedCount);
        assert.match(await box.innerText(), /Cryptographic integrity: not checked/);
      }
      await mockPage.screenshot({ path: path.join(output, 'synthetic-second-trace.png'), fullPage: true });
    });

    await check('an unknown trace in the production mock build stays empty instead of substituting the first sample', async () => {
      await mockPage.getByLabel('Trace ID', { exact: true }).fill(traces.unknown);
      await mockPage.getByRole('button', { name: 'Inspect links', exact: true }).click();
      await mockPage.getByTestId('chain-empty').waitFor();
      assert.equal(await mockPage.getByTestId('chain-result').count(), 0);
      assert.equal(await mockPage.locator('a[href*="/events/"]').count(), 0);
    });

    await check('an unknown event detail in mock mode is not replaced by the first event', async () => {
      await mockPage.goto(mockOrigin + '/events/' + eventId(99));
      await mockPage.getByRole('heading', { name: 'Event Not Found', exact: true }).waitFor();
      assert.equal(await mockPage.getByRole('heading', { name: 'Event Details', exact: true }).count(), 0);
      assert.equal(await mockPage.getByRole('link', { name: 'Certificate', exact: true }).count(), 0);
    });
  }

  await check('the page has no uncaught render errors and all successful searches use the bounded API path', async () => {
    assert.deepEqual(pageErrors, []);
    const searches = requests.filter(request => request.path === '/api/v1/events');
    assert.ok(searches.length >= 10);
    assert.ok(searches.every(request => new URLSearchParams(request.search).get('limit') === '50'));
  });
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  releaseSlow();
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({
    status: process.exitCode ? 'failed' : 'passed',
    scope: 'First-party local browser regression with controlled synthetic API responses; no cryptographic verification, external anchor or conformance claim.',
    checks, pageErrors, requests, delayedResponseDisposition, mockModeConfigured: !!mockGuiUrl,
  }, null, 2) + '\n');
  console.log(JSON.stringify({ checks, pageErrors, delayedResponseDisposition }, null, 2));
  if (mockContext) await mockContext.close();
  if (context) await context.close();
  if (browser) await browser.close();
});

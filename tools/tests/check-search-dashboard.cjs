'use strict';
// Actual browser interactions with controlled, local API fixtures. No live
// trading data, cryptographic verification or native PDF assessment is involved.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PW_MODULE);

const origin = new URL(process.env.HASH_CHAIN_GUI_URL).origin;
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname));
const output = path.resolve(process.env.HASH_CHAIN_TEST_OUTPUT || 'hash-chain-report', 'query-states');
fs.mkdirSync(output, { recursive: true });
const eventId = index => `01934e3a-6a1a-7000-8000-${String(index + 1).padStart(12, '0')}`;
const rows = Array.from({ length: 45 }, (_, index) => ({
  event_id: eventId(index), type: index < 3 ? 'ORD' : 'EXE', event_type_code: index < 3 ? 2 : 4,
  timestamp: '2025-11-25T12:00:00.000Z', venue: 'SYNTHETIC',
  symbol: index < 2 ? 'EURUSD' : 'XAUUSD', hash_prefix: 'aaaaaa', status: 'PENDING',
}));
const system = { total_events: rows.length, active_nodes: 0, tier: 'SILVER', precision: 'MILLISECOND',
  last_anchor: { network: 'synthetic', block_number: 0, tx_hash: 'not-an-authenticated-anchor',
    anchored_at: '2025-11-25T12:00:00.000Z' } };
let mode = 'error', browser, context, browserVersion;
const checks = [], requests = [], pageErrors = [];
async function check(name, operation) {
  try { await operation(); checks.push({ name, status: 'passed' }); }
  catch (error) { checks.push({ name, status: 'failed', error: String(error) }); throw error; }
}

(async () => {
  browser = await chromium.launch({ headless: true });
  browserVersion = browser.version();
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/v1/')) return route.continue();
    requests.push({ mode, path: url.pathname, query: url.search });
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (mode === 'error') return json({ error: 'TEST_UNAVAILABLE', message: 'Synthetic request failure' }, 503);
    if (url.pathname === '/api/v1/system/status') return json({ ...system, last_anchor: mode === 'empty' ? null : system.last_anchor });
    if (url.pathname === '/api/v1/events') {
      let filtered = mode === 'empty' || url.searchParams.has('trace_id') ? [] : rows;
      if (url.searchParams.has('symbol')) filtered = filtered.filter(row => row.symbol === url.searchParams.get('symbol'));
      if (url.searchParams.has('event_type')) filtered = filtered.filter(row => row.type === url.searchParams.get('event_type'));
      const offset = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit') || 50);
      const page = filtered.slice(offset, offset + limit);
      return json({ events: page, total: page.length, query: Object.fromEntries(url.searchParams) });
    }
    const event = rows.find(row => url.pathname === '/api/v1/events/' + row.event_id);
    if (event) return json({
      header: { event_id: event.event_id, trace_id: '01934fff-1111-7000-8000-000000000001',
        timestamp_iso: event.timestamp, timestamp_int: '1764072000000000000', timestamp_precision: 'MILLISECOND',
        event_type: event.type, event_type_code: event.event_type_code, clock_sync_status: 'NTP_SYNCED',
        venue_id: event.venue, symbol: event.symbol, account_id: 'synthetic', hash_algo: 'SHA256', anchor_status: 'PENDING' },
      payload: {}, security: { event_hash: 'a'.repeat(64), prev_hash: '0'.repeat(64), hash_algo: 'SHA256' },
    });
    return json({ error: 'NOT_FOUND', message: 'Unknown synthetic route' }, 404);
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => pageErrors.push(String(error)));
  const lastSearch = () => [...requests].reverse().find(request => request.path === '/api/v1/events');

  await check('dashboard request failures are explicit and can be retried', async () => {
    await page.goto(origin);
    await page.getByRole('heading', { name: 'System metadata unavailable', exact: true }).waitFor();
    await page.getByText('Could not load recent events. No current results are available.', { exact: true }).waitFor();
    assert.equal(await page.getByText('Loading anchor data...', { exact: true }).count(), 0);
    assert.equal(await page.locator('a[href^="/events/"]').count(), 0);
    await page.screenshot({ path: path.join(output, 'dashboard-error.png'), fullPage: true });
    mode = 'normal';
    await page.getByRole('button', { name: 'Retry system metadata', exact: true }).click();
    await page.getByRole('button', { name: 'Retry recent events', exact: true }).click();
    await page.getByText('Anchor not verified', { exact: true }).waitFor();
    await page.locator('a[href^="/events/"]').first().waitFor();
    assert.match(await page.locator('body').innerText(), /does not check the transaction or anchor on-chain/);
  });

  await check('empty dashboard data has an empty state rather than a perpetual loader', async () => {
    mode = 'empty';
    await page.goto(origin);
    await page.getByText('No anchor record supplied.', { exact: true }).waitFor();
    await page.getByText('No recent events returned.', { exact: true }).waitFor();
    assert.equal(await page.getByText('Loading anchor data...', { exact: true }).count(), 0);
  });

  await check('same-page global search and repeat navigation bind the local input to the URL', async () => {
    mode = 'normal';
    await page.goto(origin + '/search?q=XAUUSD');
    await page.getByTestId('search-results').waitFor();
    await page.getByLabel('Search events', { exact: true }).fill('EURUSD');
    await page.getByLabel('Search events', { exact: true }).press('Enter');
    await page.waitForURL('**/search?q=EURUSD');
    await page.getByText(/Showing 1-2 ·/).waitFor();
    assert.equal(await page.getByLabel('Search query', { exact: true }).inputValue(), 'EURUSD');
    assert.equal(new URLSearchParams(lastSearch().query).get('symbol'), 'EURUSD');
    await page.getByLabel('Search query', { exact: true }).fill('XAUUSD');
    await page.getByText(/Showing 1-20 ·/).waitFor();
    await page.getByLabel('Search events', { exact: true }).press('Enter');
    await page.getByText(/Showing 1-2 ·/).waitFor();
    assert.equal(await page.getByLabel('Search query', { exact: true }).inputValue(), 'EURUSD');
  });

  await check('changing a filter on a later page starts at the first matching page', async () => {
    await page.goto(origin + '/search');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByText(/Showing 21-40 ·/).waitFor();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByText(/Showing 41-45 ·/).waitFor();
    assert.equal(new URLSearchParams(lastSearch().query).get('offset'), '40');
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await page.getByRole('combobox').first().selectOption('ORD');
    await page.getByText(/Showing 1-3 ·/).waitFor();
    assert.equal(new URLSearchParams(lastSearch().query).get('offset'), '0');
    assert.equal(await page.getByText('No events returned on this page.', { exact: true }).count(), 0);
  });

  await check('offline-paused search hides the old result and resumes after reconnection', async () => {
    await page.goto(origin + '/search?q=XAUUSD');
    await page.getByTestId('search-results').waitFor();
    try {
      await context.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event('offline')));
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      await page.getByText('Waiting for a connection', { exact: true }).waitFor();
      assert.equal(await page.getByTestId('search-results').count(), 0);
      assert.equal(await page.getByText('No events returned on this page.', { exact: true }).count(), 0);
    } finally {
      await context.setOffline(false);
      await page.evaluate(() => window.dispatchEvent(new Event('online')));
    }
    await page.getByTestId('search-results').waitFor();
    await page.getByText(/Showing 1-20 ·/).waitFor();
  });

  await check('unsupported hash searches do not request the unfiltered list even when submitted', async () => {
    const start = requests.length;
    await page.goto(origin + '/search?q=' + 'a'.repeat(64));
    await page.getByRole('alert').filter({ hasText: 'Unsupported search' }).waitFor();
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    assert.equal(requests.slice(start).filter(request => request.path === '/api/v1/events').length, 0);
    assert.equal(await page.getByTestId('search-results').count(), 0);
  });

  await check('an Event ID is opened explicitly through the detail route', async () => {
    await page.goto(origin + '/search?q=' + eventId(0));
    await page.getByText('0 records returned', { exact: true }).waitFor();
    const link = page.getByRole('link', { name: 'Open as Event ID', exact: true });
    assert.equal(await link.getAttribute('href'), '/events/' + eventId(0));
    await link.click();
    await page.getByRole('heading', { name: 'Event Details', exact: true }).waitFor();
    assert.ok(requests.some(request => request.path === '/api/v1/events/' + eventId(0)));
    assert.ok(requests.filter(request => request.path === '/api/v1/events').every(request =>
      !new URLSearchParams(request.query).has('event_id')));
  });

  await check('search errors remain unavailable rather than empty and retry recovers', async () => {
    mode = 'error';
    await page.goto(origin + '/search?q=XAUUSD');
    await page.getByText('Results unavailable', { exact: true }).waitFor();
    assert.equal(await page.getByTestId('search-results').count(), 0);
    assert.equal(await page.getByText('No events returned on this page.', { exact: true }).count(), 0);
    mode = 'normal';
    await page.getByRole('button', { name: 'Retry search', exact: true }).click();
    await page.getByTestId('search-results').waitFor();
    await page.getByText(/Showing 1-20 ·/).waitFor();
    await page.screenshot({ path: path.join(output, 'search-recovered.png'), fullPage: true });
  });
  await check('the query-state checks have no uncaught rendering errors', async () => assert.deepEqual(pageErrors, []));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({
    status: process.exitCode ? 'failed' : 'passed', browserVersion,
    scope: 'First-party browser interactions with controlled local API responses; no authentication, conformance, accessibility or native PDF conclusion.',
    checks, pageErrors, requests,
  }, null, 2) + '\n');
  console.log(JSON.stringify({ checks, pageErrors }, null, 2));
  if (context) await context.close();
  if (browser) await browser.close();
});

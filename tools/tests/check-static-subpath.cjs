'use strict';
// Inspect an opt-in static hash-router build served only under /explorer/app/.
// This is a first-party mock UI test, not a test of a public deployed website.
const { chromium } = require(process.env.PW_MODULE);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const root = path.resolve('dist');
const prefix = '/explorer/app/';
const output = path.resolve('subpath-evidence');
fs.mkdirSync(output, { recursive: true });
const checks = [];
const pageErrors = [];
const resources = [];
const server = http.createServer((req, res) => {
  let requested;
  try {
    requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400); res.end(); return;
  }
  // Deliberately NO SPA catch-all: ordinary deep paths must fail on static hosting.
  if (!requested.startsWith(prefix)) {
    res.writeHead(404); res.end(); return;
  }
  const relative = requested.slice(prefix.length);
  const target = path.resolve(root, relative || 'index.html');
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    res.writeHead(404); res.end(); return;
  }
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
  res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
  fs.createReadStream(target).pipe(res);
});
let browser, context;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.route('**/*', route => {
    const request = route.request();
    if (new URL(request.url()).origin === origin) return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('response', res => {
    if (new URL(res.url()).origin === origin) resources.push({ status: res.status(), url: res.url() });
  });
  page.setDefaultTimeout(15000);
  const url = origin + prefix;

  async function check(name, fn) {
    try { await fn(); checks.push({ name, status: 'passed' }); }
    catch (e) { checks.push({ name, status: 'failed', error: String(e) }); throw e; }
  }

  await check('the built index references only the /explorer/app/ base', async () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.match(html, /\/explorer\/app\/assets\/[^"'\s]+\.js/);
    assert.match(html, /\/explorer\/app\/assets\/[^"'\s]+\.css/);
    assert.ok(!html.includes('src="/assets/'), 'root asset URL must not be deployed into the subpath');
  });
  await page.goto(url);
  await check('dashboard works from a strictly served subpath', async () => {
    await page.locator('a[href*="#/events/"]').first().waitFor();
    assert.equal(new URL(page.url()).pathname, prefix);
    assert.equal(new URL(page.url()).hash, '');
  });
  const eventLink = page.locator('a[href*="#/events/"]').first();
  await eventLink.click();
  await check('event route is in hash, not missing static server deep path', async () => {
    await page.getByRole('heading', { name: 'Event Details', exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, prefix);
    assert.match(new URL(page.url()).hash, /^#\/events\//);
  });
  await page.getByRole('link', { name: 'Certificate', exact: true }).click();
  await check('certificate remains demo and handles direct browser reload', async () => {
    await page.getByRole('heading', { name: 'Event Certificate', exact: true }).waitFor();
    await page.getByText('Demo data — not verified', { exact: true }).waitFor();
    assert.match(new URL(page.url()).hash, /^#\/events\/[^/]+\/certificate$/);
    await page.reload();
    await page.getByText('Demo data — not verified', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'static-certificate.png'), fullPage: true });
  });
  await check('search route handles direct reload with query string', async () => {
    await page.goto(url + '#/search?q=XAUUSD');
    await page.getByRole('heading', { name: 'Search Events', exact: true }).waitFor();
    await page.reload();
    await page.getByRole('heading', { name: 'Search Events', exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, prefix);
  });
  await check('static assets load and do not 404', async () => {
    assert.equal(pageErrors.length, 0);
    const resourcesFailed = resources.filter(x => x.status >= 400);
    assert.deepEqual(resourcesFailed, []);
    assert.ok(resources.some(x => /\/explorer\/app\/assets\/.+\.js/.test(x.url)));
    assert.ok(resources.some(x => /\/explorer\/app\/assets\/.+\.css/.test(x.url)));
  });

  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({
    status: 'passed', checks, browser: browser.version(), origin, route_base: prefix,
    pageErrors, resources,
    limits: 'Only a loopback static server with synthetic mock data, not the public host; no direct deep-path fallback, not a deployment claim.',
  }, null, 2) + '\n');
})().catch(error => {
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({
    status: 'failed', error: String(error), checks, pageErrors, resources,
  }, null, 2) + '\n');
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  if (context) await context.close();
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
});

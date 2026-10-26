'use strict';
// Bounded Chromium regression for the mock Explorer certificate.
// Visual checks do not establish cryptographic verification, accessibility conformance or a real deployment.
const { chromium } = require(process.env.PW_MODULE);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const root = path.resolve('dist');
const output = path.resolve('ui-evidence');
fs.mkdirSync(output, { recursive: true });
const results = [];
const pageErrors = [];
const server = http.createServer((req, res) => {
  let target;
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const absolute = path.resolve(root, '.' + pathname);
    if (absolute !== root && !absolute.startsWith(root + path.sep)) {
      res.writeHead(403); res.end(); return;
    }
    target = fs.existsSync(absolute) && fs.statSync(absolute).isFile()
      ? absolute : path.join(root, 'index.html');
  } catch {
    res.writeHead(400); res.end(); return;
  }
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
  res.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream');
  fs.createReadStream(target).pipe(res);
});

let browser;
let context;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.route('**/*', route =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.setDefaultTimeout(15000);
  await page.goto(origin);
  const firstEvent = page.locator('a[href^="/events/"]').first();
  await firstEvent.waitFor();
  const eventPath = await firstEvent.getAttribute('href');
  assert.match(eventPath, /^\/events\/[0-9a-f-]+$/i);
  const certPath = eventPath + '/certificate';

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(origin + certPath);
    await page.getByRole('heading', { name: 'Event Certificate', exact: true }).waitFor();
    await page.getByText('Demo data — not verified', { exact: true }).waitFor();
    const geometry = await page.evaluate(() => {
      const surface = document.querySelector('.certificate-print-surface');
      return {
        viewport: document.documentElement.clientWidth,
        docScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        certificateWidth: surface ? surface.getBoundingClientRect().width : null,
      };
    });
    const ok = geometry.docScrollWidth <= geometry.viewport + 1
      && geometry.bodyScrollWidth <= geometry.viewport + 1
      && geometry.certificateWidth !== null && geometry.certificateWidth <= geometry.viewport + 1;
    results.push({ kind: 'viewport', width, ok, geometry });
    await page.screenshot({ path: path.join(output, 'certificate-' + width + '.png'), fullPage: true });
  }

  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(origin + certPath);
  const mobileMenu = page.getByRole('button', { name: 'Open navigation menu' });
  await mobileMenu.click();
  const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
  const navOpens = await nav.isVisible();
  await nav.getByRole('link', { name: 'Search Events' }).click();
  await page.getByRole('heading', { name: 'Search Events', exact: true }).waitFor();
  const navigationOk = navOpens && new URL(page.url()).pathname === '/search'
    && !(await nav.isVisible());
  results.push({ kind: 'mobile-navigation', ok: navigationOk });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(origin + certPath);
  await page.getByText('Demo data — not verified', { exact: true }).waitFor();
  await page.evaluate(() => {
    window.__printInvocations = 0;
    window.print = () => { window.__printInvocations += 1; };
  });
  await page.getByRole('button', { name: 'Print / Save as PDF' }).click();
  const printed = await page.evaluate(() => window.__printInvocations === 1);
  await page.emulateMedia({ media: 'print' });
  const print = await page.evaluate(() => {
    const surface = document.querySelector('.certificate-print-surface');
    const warning = Array.from(document.querySelectorAll('span'))
      .find(x => x.textContent && x.textContent.trim() === 'Demo data — not verified');
    return {
      surfaceBackground: getComputedStyle(surface).backgroundColor,
      warningColor: warning ? getComputedStyle(warning).color : null,
      warningVisible: !!warning && getComputedStyle(warning).display !== 'none',
      siteHeader: getComputedStyle(document.querySelector('header')).display,
      sidebar: getComputedStyle(document.querySelector('aside')).display,
    };
  });
  const printOk = printed && print.surfaceBackground === 'rgb(255, 255, 255)'
    && print.warningColor === 'rgb(17, 24, 39)' && print.warningVisible
    && print.siteHeader === 'none' && print.sidebar === 'none';
  results.push({ kind: 'print-media', ok: printOk, details: print, printButtonInvoked: printed });
  await page.screenshot({ path: path.join(output, 'certificate-print.png'), fullPage: true });
  results.push({ kind: 'browser-page-errors', ok: pageErrors.length === 0, errors: pageErrors });
  const allPassed = results.every(x => x.ok);
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({
    status: allPassed ? 'passed' : 'failed',
    browser: browser.version(),
    target: certPath, checks: results,
    limits: 'Built synthetic mock UI, Chromium only; print media emulation, not PDF pagination; not a live site or full accessibility review.',
  }, null, 2) + '\n');
  if (!allPassed) throw new Error('Responsive/print checks failed: ' + JSON.stringify(results.filter(x => !x.ok)));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
  if (!fs.existsSync(path.join(output, 'result.json'))) {
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({
      status: 'failed', error: String(error), checks: results, pageErrors,
    }, null, 2) + '\n');
  }
}).finally(async () => {
  if (context) await context.close();
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
});

'use strict';
// Bounded first-party browser regression for the mock Explorer certificate and proof.
// These checks do not establish cryptographic or accessibility conformance.
const playwright = require(process.env.PW_MODULE);
const browserEngine = process.env.BROWSER_ENGINE || 'chromium';
if (!['chromium', 'firefox', 'webkit'].includes(browserEngine)) {
  throw new Error('Unsupported browser engine: ' + browserEngine);
}
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
  browser = await playwright[browserEngine].launch({ headless: true });
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
  const eventId = eventPath.split('/')[2];
  const certPath = eventPath + '/certificate';

  // Obtain full identifiers from navigation targets, not from the certificate's
  // potentially abbreviated display text; otherwise truncation could self-validate.
  await page.goto(origin + eventPath);
  await page.getByRole('heading', { name: 'Event Details', exact: true }).waitFor();
  const traceLink = page.locator('a[href^="/chain/"]').first();
  await traceLink.waitFor();
  const tracePath = await traceLink.getAttribute('href');
  assert.match(tracePath, /^\/chain\/[0-9a-f-]+$/i);
  const traceId = tracePath.split('/')[2];

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
    const displayedEvent = (await page.locator('[data-certificate-field="Event ID"] dd p').innerText()).trim();
    const displayedTrace = (await page.locator('[data-certificate-field="Trace ID"] dd p').innerText()).trim();
    const identifiersOk = displayedEvent === eventId && displayedTrace === traceId;
    const ok = geometry.docScrollWidth <= geometry.viewport + 1
      && geometry.bodyScrollWidth <= geometry.viewport + 1
      && geometry.certificateWidth !== null && geometry.certificateWidth <= geometry.viewport + 1
      && identifiersOk;
    results.push({ kind: 'viewport', width, ok, geometry, fullIdentifiers: identifiersOk });
    await page.screenshot({ path: path.join(output, 'certificate-' + width + '.png'), fullPage: true });
  }

  const namedControls = await page.getByRole('link', { name: 'Back to event', exact: true }).count() === 1
    && await page.getByRole('button', { name: 'Copy Event ID', exact: true }).count() === 1
    && await page.getByRole('button', { name: 'Copy event hash', exact: true }).count() === 1
    && await page.getByRole('link', { name: 'View demo transaction on Etherscan (opens in a new tab)', exact: true }).count() === 1;
  results.push({ kind: 'certificate-icon-accessible-names', ok: namedControls });

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
  const proofHashes = (await page.locator('[data-certificate-proof-hash]').allTextContents()).map(x => x.trim());
  assert.ok(proofHashes.length > 0 && proofHashes.length <= 16, 'Bounded proof fixture required');
  assert.ok(proofHashes.every(x => /^[0-9a-f]{64}$/i.test(x)), 'Full sibling hashes required');
  fs.writeFileSync(path.join(output, 'pdf-expectations.json'), JSON.stringify({
    event_id: eventId, trace_id: traceId, proof_hashes: proofHashes,
    source: 'Identifiers from event/trace route hrefs; sibling hashes from the displayed bounded mock proof.',
  }, null, 2) + '\n');
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
  // Keep the existing PDF export options. Tagging is observed, not silently
  // enabled only in CI to imply that the user's print dialog is accessible.
  if (browserEngine === 'chromium') {
    const pdf = await page.pdf({
      path: path.join(output, 'certificate-print.pdf'),
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: false,
    });
    const pdfOk = pdf.length > 5_000 && pdf.subarray(0, 5).toString('ascii') === '%PDF-';
    results.push({ kind: 'chromium-pdf-generated', ok: pdfOk, pdfBytes: pdf.length });
  }
  // Exercise the actual page -> mock response -> verifier call. A dropped
  // tree_size argument must not silently turn this into a successful check.
  await page.emulateMedia({ media: 'screen' });
  await page.goto(origin + eventPath + '/proof');
  await page.getByRole('button', { name: 'Verify Inclusion', exact: true }).click();
  await page.getByRole('heading', { name: 'Inclusion proof matches supplied root', exact: true }).waitFor();
  const proofBoundary = await page.getByText(
    'The supplied hash and path match this root and tree size. Event contents, signatures and external anchors have not been verified.',
    { exact: true }
  ).isVisible();
  const suppliedSize = await page.getByText('Supplied Tree Size', { exact: true }).locator('..').locator('p').innerText();
  results.push({ kind: 'demo-inclusion-caller', ok: proofBoundary && /^[1-9][0-9]*$/.test(suppliedSize), suppliedSize });
  await page.screenshot({ path: path.join(output, 'demo-inclusion.png'), fullPage: true });
  results.push({ kind: 'browser-page-errors', ok: pageErrors.length === 0, errors: pageErrors });
  const allPassed = results.every(x => x.ok);
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({
    status: allPassed ? 'passed' : 'failed',
    browserEngine, browser: browser.version(),
    target: certPath, checks: results,
    limits: 'Built synthetic mock UI; Chromium/Firefox/WebKit viewports; actual PDF only in Chromium. Icon-name and field checks are not a screen-reader/PDF-UA audit or public deployment verification.',
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

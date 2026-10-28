'use strict';
// First-party browser integration over the real API and real SDK verifier.
// Successful responses are never mocked. Network failure is injected only to
// verify that a previous successful local result is cleared without fallback.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PW_MODULE);

const guiUrl = process.env.EVIDENCE_GUI_URL;
const apiUrl = process.env.EVIDENCE_API_URL;
assert.ok(guiUrl && apiUrl && process.env.VCP_EVIDENCE_BUNDLE, 'Use the integration launcher or provide its URLs and evidence path');
const source = JSON.parse(fs.readFileSync(process.env.VCP_EVIDENCE_BUNDLE, 'utf8'));
const output = path.resolve(process.env.EVIDENCE_TEST_OUTPUT || 'evidence-demo-test-output');
fs.mkdirSync(output, { recursive: true });
const checks = [];
const pageErrors = [];
let browser;
let context;

async function check(name, fn) {
  try { await fn(); checks.push({ name, status: 'passed' }); }
  catch (error) { checks.push({ name, status: 'failed', error: String(error) }); throw error; }
}

(async () => {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const origins = new Set([new URL(guiUrl).origin, new URL(apiUrl).origin]);
  await context.route('**/*', route => {
    if (origins.has(new URL(route.request().url()).origin)) return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.on('pageerror', error => pageErrors.push(String(error)));
  await page.goto(guiUrl);

  await check('real API case list loads without a precomputed verdict', async () => {
    await page.getByRole('heading', { name: 'Evidence Demo', exact: true }).waitFor();
    await page.getByTestId('evidence-case-intact').waitFor();
    assert.equal(await page.getByRole('radio').count(), 3);
    assert.equal(await page.getByTestId('local-status').count(), 0);
    assert.equal(await page.getByTestId('overall-status').count(), 0);
  });

  async function verify(id, local, overall) {
    await page.getByTestId(`evidence-case-${id}`).check();
    const responsePromise = page.waitForResponse(response => response.url() === `${apiUrl}/evidence-demo/cases/${id}/verification`);
    await page.getByTestId('run-verification').click();
    const response = await responsePromise;
    assert.equal(response.status(), 200);
    const report = await response.json();
    assert.equal(report.local_status, local);
    assert.equal(report.overall_status, overall);
    await page.getByTestId('local-status').waitFor();
    assert.equal((await page.getByTestId('local-status').innerText()).trim(), local);
    assert.equal((await page.getByTestId('overall-status').innerText()).trim(), overall);
    const anchor = page.locator('[data-check-name="external_anchor"]');
    assert.match(await anchor.innerText(), /INDETERMINATE/);
    assert.ok(report.evidence.inclusion_proofs.every(proof => proof.tree_size === 3));
    return report;
  }

  async function showSummary() {
    await page.getByTestId('evidence-summary').evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }

  await check('intact evidence passes covered local checks while full evidence stays indeterminate', async () => {
    await verify('intact', 'VALID', 'INDETERMINATE');
    await showSummary();
    await page.screenshot({ path: path.join(output, 'intact-desktop.png') });
  });

  await check('raw inspection and downloads preserve nanosecond integers and exact evidence bytes', async () => {
    const original = source.cases.find(item => item.id === 'intact');
    await page.getByText('Event JSONL · exact source string', { exact: true }).click();
    assert.equal(await page.getByTestId('evidence-events-jsonl').textContent(), original.events_jsonl);
    assert.match(original.events_jsonl, /1793145600123456789/);
    for (const [label, expected] of [['Download event JSONL', original.events_jsonl], ['Download AnchorRecord', original.anchor_record_json]]) {
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: label, exact: true }).click();
      const download = await downloadPromise;
      assert.equal(fs.readFileSync(await download.path(), 'utf8'), expected);
    }
  });

  await check('changing the signed order price produces a visible invalid result', async () => {
    const report = await verify('tampered', 'INVALID', 'INVALID');
    assert.ok(report.checks.some(item => item.scope === 'local' && item.status === 'INVALID'));
    assert.match(report.evidence.events_jsonl, /999\.000/);
    assert.equal(report.evidence.events_jsonl, source.cases.find(item => item.id === 'tampered').events_jsonl);
    await showSummary();
    await page.screenshot({ path: path.join(output, 'tampered-desktop.png') });
  });

  await check('the same evidence without a configured key is indeterminate, never a pass', async () => {
    const report = await verify('missing-key', 'INDETERMINATE', 'INDETERMINATE');
    assert.equal(report.trust.key_configured, false);
    assert.ok(report.checks.some(item => item.reason === 'KEY_NOT_ESTABLISHED'));
    assert.equal(report.evidence.events_jsonl, source.cases.find(item => item.id === 'intact').events_jsonl);
    await page.getByText('No trusted key supplied', { exact: true }).waitFor();
  });

  await check('mobile layout retains scope labels without horizontal overflow', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await showSummary();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await page.screenshot({ path: path.join(output, 'missing-key-mobile.png') });
    await page.setViewportSize({ width: 1440, height: 1000 });
  });

  await check('a failed verification request clears prior verdicts and does not use mock fallback', async () => {
    await verify('intact', 'VALID', 'INDETERMINATE');
    await page.route('**/evidence-demo/cases/*/verification', route => route.abort('failed'));
    await page.getByTestId('run-verification').click();
    await page.getByTestId('verification-error').waitFor();
    assert.equal(await page.getByTestId('local-status').count(), 0);
    assert.equal(await page.getByTestId('overall-status').count(), 0);
    assert.match(await page.getByTestId('verification-error').innerText(), /No fallback verdict/);
    await page.screenshot({ path: path.join(output, 'connection-failure.png') });
  });

  await check('an unavailable case-list endpoint has no fallback results', async () => {
    await page.route('**/evidence-demo/cases', route => route.abort('failed'));
    await page.reload();
    await page.getByTestId('evidence-api-error').waitFor();
    assert.equal(await page.getByRole('radio').count(), 0);
    assert.equal(await page.getByTestId('local-status').count(), 0);
  });

  await check('the page has no uncaught runtime errors', async () => assert.deepEqual(pageErrors, []));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ scope: 'first-party local SDK/API/browser integration; no external anchor or conformance claim', checks, pageErrors }, null, 2) + '\n');
  console.log(JSON.stringify({ checks, pageErrors }, null, 2));
  if (context) await context.close();
  if (browser) await browser.close();
});

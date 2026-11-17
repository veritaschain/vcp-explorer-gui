'use strict';
// Bounded automated accessibility regression for the synthetic VCP Explorer UI.
// Findings are not a WCAG, PDF/UA or screen-reader certification.
const { chromium } = require(process.env.PW_MODULE);
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.env.DIST_ROOT || 'dist');
const out = path.resolve('a11y-report');
fs.mkdirSync(out, { recursive: true });
const errors = [];
const results = [];
const controls = [];
const searchFilters = [];
const server = http.createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); }
  catch { res.writeHead(400); res.end(); return; }
  const file = path.resolve(root, '.' + rel);
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  const target = fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(root, 'index.html');
  res.setHeader('Content-Type', {'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'}[path.extname(target)] || 'application/octet-stream');
  fs.createReadStream(target).pipe(res);
});
let browser, context;
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({headless:true});
  context = await browser.newContext({viewport:{width:1440,height:900}});
  await context.route('**/*', route=>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('pageerror',error=>errors.push(String(error)));
  page.setDefaultTimeout(15000);
  const axePath=path.resolve(process.env.AXE_SCRIPT);
  assert.ok(fs.existsSync(axePath),'Axe script must be installed as isolated test tool');
  const short = matches=>matches.map(x=>({
    rule:x.id,impact:x.impact,description:x.help,helpUrl:x.helpUrl,
    nodes:x.nodes.map(n=>({target:n.target,summary:n.failureSummary?.slice(0,750),html:n.html.slice(0,250)}))
  }));

  // A successful whole-page axe scan can still leave every certificate word
  // inconclusive. This separate gate requires measurable text, not just no errors.
  async function certificateContrast() {
    return await page.evaluate(async()=>{
      const surfaces = document.querySelectorAll('.certificate-print-surface');
      if (surfaces.length !== 1) throw new Error('Exactly one certificate surface is required');
      const surface = surfaces[0];
      const raw = await window.axe.run(surface, {
        runOnly:{type:'rule',values:['color-contrast']},
        resultTypes:['violations','incomplete','passes','inapplicable']
      });
      const passNodes = raw.passes.flatMap(r=>r.nodes);
      const labelCount = surface.querySelectorAll('[data-certificate-field] dt').length;
      const demoPresent = surface.textContent.includes('Demo data — not verified');
      const covered = passNodes.length >= 20 && labelCount >= 10 && demoPresent;
      const ok = covered && raw.violations.length === 0 && raw.incomplete.length === 0;
      return {
        ok, covered, passingTextNodes:passNodes.length, labelCount, demoPresent,
        background:getComputedStyle(surface).backgroundColor,
        labelColor:getComputedStyle(surface.querySelector('dt')).color,
        violations:raw.violations, incomplete:raw.incomplete,
        passes:raw.passes, inapplicable:raw.inapplicable
      };
    });
  }

  async function scan(label, route, width, printMedia=false) {
    await page.setViewportSize({width,height:900});
    await page.goto(origin+route);
    const isCertificate = route.includes('certificate');
    if (isCertificate) {
      await page.getByRole('heading',{name:'Event Certificate',exact:true}).waitFor();
      await page.getByText('Demo data — not verified',{exact:true}).waitFor();
    } else {
      await page.getByRole('heading').first().waitFor();
    }
    if (printMedia) await page.emulateMedia({media:'print'});
    await page.addScriptTag({path:axePath});
    const raw = await page.evaluate(async()=>{
      return await window.axe.run(document,{
        runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']},
        resultTypes:['violations','incomplete']
      });
    });
    const item={
      label,width,printMedia,browser:browser.version(),
      violations:short(raw.violations),incomplete:short(raw.incomplete),
      passes:raw.passes.length,inapplicable:raw.inapplicable.length,
      axe_version:raw.testEngine.version,
      certificateContrast:isCertificate ? await certificateContrast() : null,
    };
    results.push(item);
    await page.screenshot({path:path.join(out,label+'.png'),fullPage:true});
    if (printMedia) await page.emulateMedia({media:'screen'});
    return item;
  }

  // The search disclosure was absent from the earlier dashboard/certificate
  // scans. Test its expanded controls and native keyboard behavior explicitly.
  async function checkSearchFilters(width) {
    const item = { width, passed: false };
    searchFilters.push(item);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + '/search');
    await page.getByRole('heading', { name: 'Search Events', exact: true }).waitFor();
    await page.addScriptTag({ path: axePath });
    const toggle = page.getByRole('button', { name: 'Filters', exact: true });
    const panelId = await toggle.getAttribute('aria-controls');
    assert.match(panelId || '', /^[a-zA-Z][a-zA-Z0-9_-]*$/, 'Filters must identify its controlled panel');
    const panel = page.locator('#' + panelId);
    assert.equal(await panel.count(), 1);
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await panel.isVisible(), false);
    assert.equal(await page.getByRole('combobox').count(), 0, 'Collapsed controls must not be in the accessibility tree');

    await toggle.focus();
    await toggle.press('Enter');
    await panel.waitFor({ state: 'visible' });
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    const names = ['Event Type', 'Symbol', 'Start Time', 'End Time'];
    for (const name of names) {
      const field = panel.getByLabel(name, { exact: true });
      assert.equal(await field.count(), 1, `${name} must identify exactly one control`);
      assert.equal(await field.isVisible(), true);
    }
    const eventType = panel.getByRole('combobox', { name: 'Event Type', exact: true });
    const symbol = panel.getByRole('combobox', { name: 'Symbol', exact: true });
    assert.equal(await eventType.count(), 1);
    assert.equal(await symbol.count(), 1);

    // Filters, Search, Event Type, Symbol retain their native DOM tab order.
    await toggle.focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('button', { name: 'Search', exact: true }).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Tab');
    assert.equal(await eventType.evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Tab');
    assert.equal(await symbol.evaluate(el => el === document.activeElement), true);
    for (const name of ['Start Time', 'End Time']) {
      await panel.getByText(name, { exact: true }).click();
      assert.equal(await panel.getByLabel(name, { exact: true }).evaluate(el => el === document.activeElement), true,
        `Clicking ${name} must focus its associated input`);
    }
    const controlNames = await panel.locator('input, select').evaluateAll(elements => elements.map(el => ({
      tag: el.tagName, type: el.type, labels: Array.from(el.labels || []).map(label => label.textContent.trim()),
    })));
    assert.deepEqual(controlNames.map(field => field.labels), names.map(name => [name]));

    async function labelScan() {
      return await panel.evaluate(async el => window.axe.run(el, {
        runOnly: { type: 'rule', values: ['label', 'select-name'] },
        resultTypes: ['violations', 'incomplete'],
      }));
    }
    const candidate = await labelScan();
    assert.equal(candidate.violations.length, 0);
    assert.equal(candidate.incomplete.length, 0);

    // Recreate the old unassociated-label defect on this test-only DOM. The
    // gate must reject every control instead of accepting visible label text.
    const associations = await panel.locator('label').evaluateAll(labels => labels.map(label => {
      const previous = label.htmlFor;
      label.removeAttribute('for');
      return previous;
    }));
    const negative = await labelScan();
    item.negativeControl = short(negative.violations);
    for (const name of names) assert.equal(await panel.getByLabel(name, { exact: true }).count(), 0);
    assert.equal(negative.violations.flatMap(rule => rule.nodes).length, 4,
      'The old unassociated labels must fail for all four controls');
    await panel.locator('label').evaluateAll((labels, values) => labels.forEach((label, i) => { label.htmlFor = values[i]; }), associations);
    const restored = await labelScan();
    assert.equal(restored.violations.length, 0);
    assert.equal(restored.incomplete.length, 0);

    await eventType.selectOption('ORD');
    await toggle.focus();
    await toggle.press('Space');
    await panel.waitFor({ state: 'hidden' });
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.getByRole('combobox').count(), 0);
    await toggle.press('Enter');
    await panel.waitFor({ state: 'visible' });
    assert.equal(await eventType.inputValue(), 'ORD', 'Collapsing a disclosure must preserve its filter value');
    item.controls = controlNames;
    item.passed = true;
    await page.screenshot({ path: path.join(out, 'search-filters-' + width + '.png'), fullPage: true });
  }
  await page.goto(origin+'/');
  await page.locator('a[href^="/events/"]').first().waitFor();
  const eventLink=await page.locator('a[href^="/events/"]').first().getAttribute('href');
  assert.match(eventLink,/^\/events\/[0-9a-f-]+$/i);
  await scan('dashboard-desktop','/',1440);
  await scan('certificate-desktop',eventLink+'/certificate',1440);
  await scan('certificate-mobile',eventLink+'/certificate',390);
  await scan('certificate-print',eventLink+'/certificate',1440,true);

  // Test-only negative controls on the same DOM; never shipped to users.
  // Restore the old translucent card plus old label color. An inconclusive
  // contrast result must fail, rather than recreate the earlier false confidence.
  for (const [name, css] of [
    ['old-translucent-styling', '.certificate-print-surface { background-color:rgb(255 255 255 / 0.05)!important; backdrop-filter:blur(16px)!important; } .certificate-print-surface .text-vcp-500 { color:#0c8de7!important; }'],
    ['opaque-low-contrast-labels', '.certificate-print-surface dt { color:#5a6e82!important; }'],
  ]) {
    const style = await page.addStyleTag({content:css});
    const observed = await certificateContrast();
    controls.push({name,rejected:!observed.ok,observed});
    await style.evaluate(el=>el.remove());
  }
  const restored = await certificateContrast();
  controls.push({name:'restored-candidate',accepted:restored.ok,observed:restored});

  await checkSearchFilters(1440);
  await checkSearchFilters(390);

  const gateFailures = results.filter(r=>r.certificateContrast && !r.certificateContrast.ok).map(r=>r.label);
  const calibrationOk = controls.length === 3 && controls[0].rejected && controls[1].rejected && controls[2].accepted;
  const totalViolations = results.reduce((n,x)=>n+x.violations.length,0);
  const searchFiltersOk = searchFilters.length === 2 && searchFilters.every(item => item.passed);
  const ok = !errors.length && !totalViolations && !gateFailures.length && calibrationOk && searchFiltersOk;
  const summary={
    status:ok?'NO_AUTOMATED_VIOLATIONS_CERTIFICATE_CONTRAST_AND_SEARCH_FILTERS_CHECKED':'ISSUES_FOUND',
    scans:results,totalViolations,certificateContrastGateFailures:gateFailures,
    calibrationOk,controls,searchFiltersOk,searchFilters,
    uniqueRules:[...new Set(results.flatMap(x=>x.violations.map(y=>y.rule)))],
    browserErrors:errors,
    limits:'Bounded first-party mock UI. Certificate text contrast must be measured with no incomplete nodes. Search checks cover four control names, disclosure state and selected native keyboard interactions. Whole-page incomplete/manual checks outside those scopes remain unresolved; not PDF/UA or screen-reader conformance.',
  };
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(summary,null,2)+'\n');
  console.log(JSON.stringify({
    status:summary.status,calibrationOk,gateFailures,searchFiltersOk,searchFilters,
    scans:results.map(x=>({label:x.label,violations:x.violations.map(v=>({rule:v.rule,nodes:v.nodes})),incomplete:x.incomplete.map(v=>({rule:v.rule,nodes:v.nodes.length})),certificateContrast:x.certificateContrast ? {ok:x.certificateContrast.ok,passingTextNodes:x.certificateContrast.passingTextNodes,violations:x.certificateContrast.violations.map(v=>({id:v.id,nodes:v.nodes})),incomplete:x.certificateContrast.incomplete.map(v=>({id:v.id,nodes:v.nodes})),background:x.certificateContrast.background,labelColor:x.certificateContrast.labelColor} : null})),
    controls:controls.map(c=>({name:c.name,rejected:c.rejected,accepted:c.accepted,violations:c.observed.violations.length,incomplete:c.observed.incomplete.length})),
    browserErrors:errors,
  },null,2));
  if(!ok) process.exitCode=1;
})().catch(e=>{
  console.error(e);process.exitCode=1;
  fs.writeFileSync(path.join(out,'error.json'),JSON.stringify({error:String(e),results,controls,searchFilters,browserErrors:errors},null,2)+'\n');
}).finally(async()=>{
  if(context)await context.close();
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
});

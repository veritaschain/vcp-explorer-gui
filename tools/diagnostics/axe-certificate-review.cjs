'use strict';
// First-party bounded accessibility diagnosis of synthetic VCP Explorer UI.
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
  async function scan(label, route, width, printMedia=false) {
    await page.setViewportSize({width,height:900});
    await page.goto(origin+route);
    if (route.includes('certificate')) {
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
    const short = matches=>matches.map(x=>({
      rule:x.id,impact:x.impact,description:x.help,helpUrl:x.helpUrl,
      nodes:x.nodes.map(n=>({target:n.target,summary:n.failureSummary?.slice(0,750),html:n.html.slice(0,250)}))
    }));
    const item={
      label,width,printMedia,browser:browser.version(),
      violations:short(raw.violations),incomplete:short(raw.incomplete),
      passes:raw.passes.length,inapplicable:raw.inapplicable.length,
      axe_version:raw.testEngine.version,
    };
    results.push(item);
    await page.screenshot({path:path.join(out,label+'.png'),fullPage:true});
    if (printMedia) await page.emulateMedia({media:'screen'});
    return item;
  }
  await page.goto(origin+'/');
  await page.locator('a[href^="/events/"]').first().waitFor();
  const eventLink=await page.locator('a[href^="/events/"]').first().getAttribute('href');
  assert.match(eventLink,/^\/events\/[0-9a-f-]+$/i);
  await scan('dashboard-desktop','/',1440);
  await scan('certificate-desktop',eventLink+'/certificate',1440);
  await scan('certificate-mobile',eventLink+'/certificate',390);
  await scan('certificate-print',eventLink+'/certificate',1440,true);
  const summary={
    status:results.some(r=>r.violations.length)?'ISSUES_FOUND':'NO_AUTOMATED_VIOLATIONS',
    scans:results,totalViolations:results.reduce((n,x)=>n+x.violations.length,0),
    uniqueRules:[...new Set(results.flatMap(x=>x.violations.map(y=>y.rule)))],
    browserErrors:errors,
    limits:'Automated WCAG 2 A/AA, WCAG 2.1 A/AA and WCAG 2.2 AA axe-core rule subset, first-party synthetic mock; incomplete/manual checks unresolved; not PDF/UA or screen-reader conformance.',
  };
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(summary,null,2)+'\n');
  console.log(JSON.stringify({
    status:summary.status,uniqueRules:summary.uniqueRules,
    scans:results.map(x=>({label:x.label,violations:x.violations.map(v=>({rule:v.rule,count:v.nodes.length,impact:v.impact})),incomplete:x.incomplete.map(v=>v.rule),passes:x.passes})),
    browserErrors:errors,
  },null,2));
  if(errors.length) process.exitCode=1;
})().catch(e=>{
  console.error(e);process.exitCode=1;
  fs.writeFileSync(path.join(out,'error.json'),JSON.stringify({error:String(e),results,browserErrors:errors},null,2)+'\n');
}).finally(async()=>{
  if(context)await context.close();
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
});

'use strict';
// Diagnostic only. Playwright tagged:true does NOT control the user's native
// browser print dialog. This experiment must not be called a PDF/UA certification.
const { chromium } = require(process.env.PW_MODULE);
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve('dist');
const out = path.resolve('pdf-tag-study');
fs.mkdirSync(out, { recursive: true });

const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end(); return; }
  const f = path.resolve(root, '.' + pathname);
  if (f !== root && !f.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  const target = fs.existsSync(f) && fs.statSync(f).isFile() ? f : path.join(root, 'index.html');
  res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(target)] || 'application/octet-stream');
  fs.createReadStream(target).pipe(res);
});
let browser, context;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({headless:true});
  context = await browser.newContext({ viewport: {width:1440,height:900} });
  await context.route('**/*', route =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.setDefaultTimeout(15000);
  await page.goto(origin);
  const eventLink = page.locator('a[href^="/events/"]').first();
  await eventLink.waitFor();
  const eventRoute = await eventLink.getAttribute('href');
  assert.match(eventRoute, /^\/events\/[a-f\d-]+$/i);
  const eventId = eventRoute.split('/')[2];
  await page.goto(origin + eventRoute);
  await page.getByRole('heading', {name:'Event Details',exact:true}).waitFor();
  const traceRoute = await page.locator('a[href^="/chain/"]').first().getAttribute('href');
  assert.match(traceRoute, /^\/chain\/[a-f\d-]+$/i);
  const traceId = traceRoute.split('/')[2];
  await page.goto(origin + eventRoute + '/certificate');
  await page.getByRole('heading',{name:'Event Certificate',exact:true}).waitFor();
  await page.getByText('Demo data — not verified',{exact:true}).waitFor();
  await page.emulateMedia({media:'print'});
  const observed = await page.evaluate(() => ({
    htmlLang: document.documentElement.lang,
    headingTags: [...document.querySelectorAll('.certificate-print-surface h2,.certificate-print-surface h3')].map(x=>({tag:x.tagName,text:x.textContent.trim()})),
    visibleNote: document.querySelector('.certificate-print-surface')?.textContent.includes('Demo data — not verified'),
  }));
  const options = {format:'A4',preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false};
  const plain = await page.pdf({...options,path:path.join(out,'default-browser-style.pdf')});
  const tagged = await page.pdf({...options,tagged:true,path:path.join(out,'opt-in-tagged.pdf')});
  assert.ok(plain.subarray(0,5).toString('ascii')==='%PDF-');
  assert.ok(tagged.subarray(0,5).toString('ascii')==='%PDF-');
  if(pageErrors.length)throw new Error('Browser page errors: '+JSON.stringify(pageErrors));
  fs.writeFileSync(path.join(out,'fixture.json'),JSON.stringify({
    source:'First-party built synthetic VCP Explorer demo',
    eventId, traceId, route:eventRoute+'/certificate',
    observed, chrome:browser.version(),
    options:{common:options,plainTaggedOption:'omitted (defaults false)',optInTaggedOption:true},
    limits:'Tagging applies only to the explicit test Playwright PDF export, never to window.print() or a native end-user print dialog. Tags and correct reading order are different questions.',
  },null,2)+'\n');
  console.log(JSON.stringify({eventId,traceId,plainBytes:plain.length,taggedBytes:tagged.length,chrome:browser.version(),observed},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;})
.finally(async()=>{
  if(context)await context.close();
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
});

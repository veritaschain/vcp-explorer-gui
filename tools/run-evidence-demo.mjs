#!/usr/bin/env node
// Local reference integration only. Builds the three checked-out repositories,
// starts loopback services and never installs packages or contacts an anchor.
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const gui = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const options = {
  sdk: path.resolve(gui, '../vcp-sdk'),
  api: path.resolve(gui, '../vcp-explorer-api'),
  apiPort: 3001,
  guiPort: 5173,
  check: false,
  browserCheck: false,
};
const usage = `Usage: node tools/run-evidence-demo.mjs [options]

  --sdk-dir PATH      SDK checkout (default: ../vcp-sdk)
  --api-dir PATH      API checkout (default: ../vcp-explorer-api)
  --api-port PORT     Loopback API port (default: 3001)
  --gui-port PORT     Loopback GUI port (default: 5173)
  --check             Check the three cases over real HTTP, then stop
  --browser-check     Also run the browser integration test, then stop

Run npm ci in the GUI, API and SDK/typescript directories first.
--browser-check needs PW_MODULE pointing to an isolated Playwright install.
The checked-in evidence uses a PUBLIC test key. It is not production evidence.
`;

for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--help') { console.log(usage); process.exit(0); }
  if (arg === '--check') { options.check = true; continue; }
  if (arg === '--browser-check') { options.check = true; options.browserCheck = true; continue; }
  const key = { '--sdk-dir': 'sdk', '--api-dir': 'api', '--api-port': 'apiPort', '--gui-port': 'guiPort' }[arg];
  const value = process.argv[++i];
  if (!key || !value || value.startsWith('--')) throw new Error(`Invalid argument: ${arg}\n${usage}`);
  if (key.endsWith('Port')) {
    if (!/^\d+$/.test(value) || Number(value) < 1024 || Number(value) > 65535) throw new Error(`${arg} must be 1024..65535`);
    options[key] = Number(value);
  } else options[key] = path.resolve(value);
}
assert.notEqual(options.apiPort, options.guiPort, 'API and GUI ports must differ');

const apiOrigin = `http://127.0.0.1:${options.apiPort}`;
const guiOrigin = `http://localhost:${options.guiPort}`;
const bundle = path.join(options.sdk, 'examples/explorer-demo/bundle.json');
const trust = path.join(options.sdk, 'examples/explorer-demo/trust.json');
const sdkModule = path.join(options.sdk, 'typescript/dist/index.js');
const env = {
  ...process.env,
  HOST: '127.0.0.1',
  PORT: String(options.apiPort),
  VCP_EVIDENCE_BUNDLE: bundle,
  VCP_EVIDENCE_TRUST: trust,
  VCP_EVIDENCE_SDK_MODULE: sdkModule,
  VCP_EVIDENCE_ORIGIN: guiOrigin,
  VITE_API_BASE_URL: `${apiOrigin}/v1`,
  VITE_EVIDENCE_API_BASE_URL: `${apiOrigin}/v1`,
  VITE_USE_MOCK: 'false',
  VITE_ROUTER_MODE: 'browser',
};
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
let stopping = false;
let serviceError;
let finish;
const finished = new Promise(resolve => { finish = resolve; });

function run(command, args, cwd, childEnv = env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: childEnv, stdio: 'inherit', shell: false });
    children.push(child);
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited ${code ?? signal}`)));
  });
}

function start(args, cwd) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: 'inherit', shell: false });
  children.push(child);
  child.once('error', error => { serviceError = error; finish(); });
  child.once('exit', (code, signal) => {
    if (!stopping) { serviceError = new Error(`Service exited unexpectedly (${code ?? signal})`); finish(); }
  });
  return child;
}

async function freePort(port) {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', resolve);
  });
  await new Promise(resolve => probe.close(resolve));
}

async function ready(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (serviceError) throw serviceError;
    if (stopping) throw new Error('Interrupted');
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (response.ok) return;
    } catch { /* wait for the owned process */ }
    await delay(200);
  }
  throw new Error(`Service did not become ready: ${url}`);
}

async function json(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  assert.equal(response.status, 200, url);
  return response.json();
}

async function checkHttp() {
  const source = JSON.parse(await readFile(bundle, 'utf8'));
  const index = await json(`${apiOrigin}/v1/evidence-demo/cases`);
  assert.deepEqual(index.cases.map(item => item.id).sort(), ['intact', 'missing-key', 'tampered']);
  const expected = { intact: ['VALID', 'INDETERMINATE'], tampered: ['INVALID', 'INVALID'], 'missing-key': ['INDETERMINATE', 'INDETERMINATE'] };
  const results = [];
  for (const [id, [local, overall]] of Object.entries(expected)) {
    const report = await json(`${apiOrigin}/v1/evidence-demo/cases/${id}/verification`);
    const original = source.cases.find(item => item.id === id);
    assert.equal(report.case_id, id);
    assert.equal(report.local_status, local, `${id}: local status`);
    assert.equal(report.overall_status, overall, `${id}: overall status`);
    assert.equal(report.evidence.events_jsonl, original.events_jsonl, `${id}: exact event bytes`);
    assert.equal(report.evidence.anchor_record_json, original.anchor_record_json, `${id}: exact anchor bytes`);
    assert.ok(report.checks.some(check => check.name === 'external_anchor' && check.status === 'INDETERMINATE'), 'Missing external proof must remain visible');
    assert.ok(report.evidence.inclusion_proofs.every(proof => proof.tree_size === 3), 'Proofs carry the actual three-leaf size');
    results.push({ case_id: id, local_status: local, overall_status: overall, checks: report.checks.length });
  }
  console.log(JSON.stringify({ source: 'live SDK → API HTTP checks', results }, null, 2));
}

async function stop() {
  if (stopping) return;
  stopping = true;
  const active = children.filter(child => child.exitCode === null && child.signalCode === null);
  for (const child of active) child.kill('SIGTERM');
  await Promise.all(active.map(child => new Promise(resolve => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 3000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
  })));
}

for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void stop().then(finish); });

try {
  for (const file of [bundle, trust, path.join(options.sdk, 'typescript/node_modules/typescript/bin/tsc'), path.join(options.api, 'node_modules/typescript/bin/tsc'), path.join(gui, 'node_modules/vite/bin/vite.js')]) {
    await access(file).catch(() => { throw new Error(`Missing ${file}. Install dependencies using the integration guide.`); });
  }
  await freePort(options.apiPort);
  await freePort(options.guiPort);
  await run(npm, ['run', 'build'], path.join(options.sdk, 'typescript'));
  await run(npm, ['run', 'build'], options.api);
  await run(npm, ['run', 'build'], gui);
  start(['dist/index.js'], options.api);
  await ready(`${apiOrigin}/v1/evidence-demo/cases`);
  start(['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(options.guiPort), '--strictPort'], gui);
  await ready(`http://127.0.0.1:${options.guiPort}/evidence-demo`);
  console.log(`\nEvidence demo: ${guiOrigin}/evidence-demo\nPublic test keys; local checks only. External anchoring remains INDETERMINATE.\n`);
  if (options.check) {
    await checkHttp();
    if (options.browserCheck) {
      if (!process.env.PW_MODULE) throw new Error('--browser-check requires PW_MODULE; see docs/EVIDENCE_DEMO_INTEGRATION.md');
      await run(process.execPath, ['tools/tests/check-evidence-demo.cjs'], gui, {
        ...env,
        EVIDENCE_GUI_URL: `${guiOrigin}/evidence-demo`,
        EVIDENCE_API_URL: `${apiOrigin}/v1`,
      });
    }
  } else {
    console.log('Press Ctrl+C to stop both local services.');
    await finished;
    if (serviceError) throw serviceError;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await stop();
}

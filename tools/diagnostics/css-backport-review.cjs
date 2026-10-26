'use strict';
// Bounded first-party diagnostic for GHSA-rj75-hqrm-r3gf. Never probes a service.
// The timing comparison adapts the upstream 6.1.5 complexity test (N=60000,
// three samples, fastest flat/space-separated ratio < 2). This is not a proof
// of asymptotic complexity or comprehensive security. MIT upstream reference:
// https://github.com/postcss/postcss-selector-parser/blob/6.1.5/src/__tests__/complexity.mjs
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const os = require('node:os');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const BASE = '832e511b5b87d2137ae16de2d1040d7bef1b525c';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
function shape(n) {
  const v = {};
  for (const key of ['type', 'value', 'attribute', 'operator', 'namespace', 'insensitive', 'quoteMark', 'spaces', 'raws']) {
    if (n[key] !== undefined) v[key] = n[key];
  }
  if (n.nodes) v.nodes = n.nodes.map(shape);
  return v;
}
if (process.argv[2] === '--worker') {
  const root = process.argv[3];
  const mode = process.argv[4];
  const parser = require(root);
  const version = require(path.join(root, 'package.json')).version;
  if (mode === 'semantic') {
    const checks = [];
    const check = (name, fn) => { fn(); checks.push({ name, passed: true }); };
    check('20000 flat classes retain 20000 nodes', () => {
      const n = parser().astSync('.a'.repeat(20000)).first.nodes;
      assert.equal(n.length, 20000);
      assert(n.every(x => x.type === 'class' && x.value === 'a'));
    });
    check('leading classes deduplicated', () => assert.deepEqual(parser().astSync('.a.b').first.nodes.map(x => [x.type, x.value]), [['class','a'],['class','b']]));
    check('leading id deduplicated', () => assert.deepEqual(parser().astSync('#x.y').first.nodes.map(x => [x.type, x.value]), [['id','x'],['class','y']]));
    check('single class emitted once', () => {
      const n = parser().astSync('.a').first.nodes;
      assert.equal(n.length, 1); assert.equal(n[0].type, 'class'); assert.equal(n[0].value, 'a');
    });
    const selectors = JSON.parse(fs.readFileSync(process.argv[5], 'utf8'));
    const corpus = selectors.map(input => {
      const ast = parser().astSync(input);
      return { input, output: ast.toString(), ast: shape(ast) };
    });
    console.log(JSON.stringify({ version, checks, corpus_count: corpus.length, corpus_sha256: sha(JSON.stringify(corpus)), corpus }));
  } else {
    const atoms = { classes: '.a', ids: '#a', interpolation: '#{a}' };
    assert(Object.hasOwn(atoms, mode));
    const atom = atoms[mode];
    const N = 60000;
    function samples(input) {
      const values = [];
      for (let i = 0; i < 3; i++) {
        const t = process.hrtime.bigint();
        const tree = parser().astSync(input);
        assert(tree.first);
        values.push(Number(process.hrtime.bigint() - t) / 1e6);
      }
      return values;
    }
    const flat = samples(atom.repeat(N));
    const spaced = samples((atom + ' ').repeat(N));
    const ratio = Math.min(...flat) / Math.max(Math.min(...spaced), 1);
    console.log(JSON.stringify({ version, pattern: mode, repeats: N, flat_ms: flat, spaced_ms: spaced, ratio, below_upstream_threshold: ratio < 2 }));
  }
  process.exit(0);
}
const subject = path.resolve(process.argv[2]);
const out = path.resolve(process.argv[3]);
fs.mkdirSync(out, { recursive: true });
const commands = [];
function write(name, value) { fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n'); }
function run(name, cmd, args, cwd = subject, timeout = 180000) {
  const r = cp.spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout, maxBuffer: 24 * 1024 * 1024, env: { ...process.env, NO_COLOR: '1' } });
  fs.writeFileSync(path.join(out, name + '.stdout'), r.stdout || '');
  fs.writeFileSync(path.join(out, name + '.stderr'), r.stderr || '');
  const row = { name, cmd, args, exit: r.status, signal: r.signal, error: r.error ? r.error.message : null };
  commands.push(row); write('commands.json', commands);
  assert(!r.error && !r.signal, `${name} failed or exceeded timeout`);
  return { row, text: r.stdout || '' };
}
function ok(name, cmd, args, cwd = subject, timeout = 180000) {
  const r = run(name, cmd, args, cwd, timeout); assert.equal(r.row.exit, 0, name); return r.text;
}
function tracked() {
  const names = cp.execFileSync('git', ['ls-files', '-z'], { cwd: subject }).toString().split('\0').filter(Boolean);
  return Object.fromEntries(names.map(n => [n, sha(fs.readFileSync(path.join(subject, n)))]));
}
function audit(name, args) {
  const r = run(name, 'npm', ['audit', ...args, '--json']);
  const data = JSON.parse(r.text);
  assert(!data.error && data.auditReportVersion === 2 && data.metadata && data.vulnerabilities);
  assert([0,1].includes(r.row.exit));
  assert.equal(r.row.exit === 0, data.metadata.vulnerabilities.total === 0);
  write(name + '.json', data); return data;
}
try {
  assert.equal(ok('commit', 'git', ['rev-parse', 'HEAD']).trim(), BASE);
  const before = tracked(); write('tracked-before.json', before);
  const packageBytes = fs.readFileSync(path.join(subject, 'package.json'));
  const lockBytes = fs.readFileSync(path.join(subject, 'package-lock.json'));
  assert.equal(sha(packageBytes), 'c6e1edba666e89b2484f32313cdcf2e4d99a9d05279d0714be35062493cdd5a6');
  assert.equal(sha(lockBytes), '1f08c5f9b71e467ac50f48b1a5342adc414b91b4003ec6799334a9ef34a08555');
  fs.writeFileSync(path.join(out, 'package.json'), packageBytes);
  fs.writeFileSync(path.join(out, 'package-lock.json'), lockBytes);
  fs.copyFileSync(__filename, path.join(out, 'review.cjs'));
  write('environment.json', { node: process.version, platform: process.platform, arch: process.arch, cpus: os.cpus().map(x => x.model), source_commit: BASE });
  ok('npm-version', 'npm', ['--version']);
  ok('install', 'npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund']);
  const full = audit('audit-full', []);
  const production = audit('audit-production', ['--omit=dev']);
  ok('dependency-tree', 'npm', ['ls', 'postcss-selector-parser', 'tailwindcss', 'postcss-nested', '--json']);
  const lock = JSON.parse(lockBytes);
  const meta = JSON.parse(ok('registry-615', 'npm', ['view', 'postcss-selector-parser@6.1.5', 'version', 'dist', '--json']));
  assert.equal(meta.version, '6.1.5');
  assert.equal(meta.dist.integrity, lock.packages['node_modules/postcss-selector-parser'].integrity);
  const packed = JSON.parse(ok('pack-615', 'npm', ['pack', 'postcss-selector-parser@6.1.5', '--ignore-scripts', '--json', '--pack-destination', out]));
  assert.equal(packed.length, 1);
  assert.equal(path.basename(packed[0].filename), packed[0].filename);
  assert.equal('sha512-' + crypto.createHash('sha512').update(fs.readFileSync(path.join(out, packed[0].filename))).digest('base64'), meta.dist.integrity);
  const req = createRequire(path.join(subject, 'package.json'));
  const parserRoot = path.dirname(req.resolve('postcss-selector-parser/package.json'));
  const nestedRoot = path.dirname(req.resolve('postcss-nested/package.json'));
  const paths = [req.resolve('postcss-selector-parser'), createRequire(req.resolve('tailwindcss/package.json')).resolve('postcss-selector-parser'), createRequire(path.join(nestedRoot, 'package.json')).resolve('postcss-selector-parser')];
  assert(paths.every(p => p === paths[0]));
  write('parser-resolution.json', { paths, version: req('postcss-selector-parser/package.json').version });
  assert.equal(req('postcss-selector-parser/package.json').version, '6.1.5');
  for (const f of ['package.json', 'dist/parser.js', 'LICENSE-MIT']) {
    fs.copyFileSync(path.join(parserRoot, f), path.join(out, 'installed-' + path.basename(f)));
  }
  ok('lint', 'npm', ['run', 'lint']);
  ok('build', 'npm', ['run', 'build']);
  ok('tests', 'npm', ['test']);
  const selectors = new Set(['.a', '.a.b', '#x.y', '[data-x="a b"] > .c:hover', ':is(.a,#b):not([hidden])', '&:hover', '#{a}', 'svg|a', '.foo\\:bar']);
  const postcss = req('postcss');
  for (const f of fs.readdirSync(path.join(subject, 'dist/assets')).filter(x => x.endsWith('.css'))) {
    const css = fs.readFileSync(path.join(subject, 'dist/assets', f), 'utf8');
    postcss.parse(css).walkRules(rule => selectors.add(rule.selector));
    fs.writeFileSync(path.join(out, 'built-' + f), css);
  }
  write('selectors.json', [...selectors].sort());
  const controls = fs.mkdtempSync(path.join(os.tmpdir(), 'selector-controls-'));
  fs.writeFileSync(path.join(controls, 'package.json'), JSON.stringify({ private: true, name: 'css-backport-controls', version: '0.0.0', dependencies: { previous: 'npm:postcss-selector-parser@6.1.4', patched7: 'npm:postcss-selector-parser@7.1.6' } }));
  ok('controls-install', 'npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], controls);
  fs.copyFileSync(path.join(controls, 'package.json'), path.join(out, 'controls-package.json'));
  fs.copyFileSync(path.join(controls, 'package-lock.json'), path.join(out, 'controls-package-lock.json'));
  const variants = { previous: [path.join(controls, 'node_modules/previous'), '6.1.4'], installed: [parserRoot, '6.1.5'], patched7: [path.join(controls, 'node_modules/patched7'), '7.1.6'] };
  const results = {};
  for (const [name, [root, version]] of Object.entries(variants)) {
    assert.equal(require(path.join(root, 'package.json')).version, version);
    fs.copyFileSync(path.join(root, 'dist/parser.js'), path.join(out, name + '-parser.js'));
    results[name] = {};
    for (const mode of ['semantic', 'classes', 'ids', 'interpolation']) {
      const text = ok(name + '-' + mode, process.execPath, ['--max-old-space-size=768', __filename, '--worker', root, mode, path.join(out, 'selectors.json')], subject, 60000);
      results[name][mode] = JSON.parse(text);
      write(name + '-' + mode + '.json', results[name][mode]);
    }
  }
  const after = tracked(); write('tracked-after.json', after); assert.deepEqual(after, before);
  const semanticEqual = new Set(Object.values(results).map(x => x.semantic.corpus_sha256)).size === 1;
  const timings = Object.fromEntries(Object.entries(results).map(([n, v]) => [n, Object.fromEntries(['classes','ids','interpolation'].map(p => [p, v[p].ratio]))]));
  const positiveControl = ['classes','ids','interpolation'].every(p => results.previous[p].ratio >= 2);
  const installedPass = ['classes','ids','interpolation'].every(p => results.installed[p].ratio < 2);
  const patched7Pass = ['classes','ids','interpolation'].every(p => results.patched7[p].ratio < 2);
  const supported = semanticEqual && positiveControl && installedPass && patched7Pass;
  write('summary.json', { status: supported ? 'BACKPORT_BEHAVIOR_SUPPORTED' : 'REVIEW_REQUIRED', source: BASE, versions: Object.fromEntries(Object.entries(variants).map(([n,v]) => [n,v[1]])), full_audit: full.metadata.vulnerabilities, production_audit: production.metadata.vulnerabilities, selectors: selectors.size, semantic_outputs_equal: semanticEqual, positive_control_detected: positiveControl, ratios: timings, tracked_source_files_unchanged: Object.keys(before).length, limits: 'First-party bounded local-process timing and semantic comparison; not a mathematical complexity proof, live exploit test, universal non-exploitability finding, external validation, or advisory database correction. Warnings are not suppressed.' });
  assert(supported, 'Backport/control comparison requires review');
} catch (e) {
  write('failure.json', { error: e.message, stack: e.stack });
  process.exitCode = 1;
} finally {
  const files = fs.readdirSync(out).filter(n => fs.statSync(path.join(out,n)).isFile() && n !== 'files.sha256.json');
  write('files.sha256.json', Object.fromEntries(files.sort().map(n => [n, sha(fs.readFileSync(path.join(out,n)))])));
}

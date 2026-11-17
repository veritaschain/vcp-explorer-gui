// Component behavior checks. Cryptographic correctness is covered by npm test.
import { build, stop } from 'esbuild';
import { createRequire } from 'node:module';
import path from 'node:path';

const renderer = process.env.REACT_TEST_RENDERER_MODULE;
if (!renderer) throw new Error('Set REACT_TEST_RENDERER_MODULE to react-test-renderer 18.3.1.');
const result = await build({
  stdin: {
    resolveDir: process.cwd(), loader: 'tsx',
    contents: `
import assert from 'node:assert/strict';
import React from 'react';
import { AxiosError } from 'axios';
import TestRenderer, { act } from ${JSON.stringify(renderer)};
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { MerkleProofPage } from './src/pages/MerkleProofPage';
import { EventDetail } from './src/pages/EventDetail';
import { CertificatePage } from './src/pages/CertificatePage';
import { getMockEvents, getMockProof, getMockEventDetail, getMockCertificate } from './src/mock-data/events';
import { verifyMerkleProof as verify } from './src/lib/crypto';

const pause = () => new Promise(resolve => setTimeout(resolve, 30));
const text = node => typeof node === 'string' ? node : node?.children?.map(text).join(' ') ?? '';
const button = (view, name) => view.root.findAllByType('button').find(node => text(node).trim() === name);
const matched = /Inclusion proof matches supplied root/;
const eventIds = getMockEvents().events.slice(0, 2).map(event => event.event_id);
const results = [];
let view, client;

async function mount(Page = MerkleProofPage) {
  client = new QueryClient({ defaultOptions: { queries: {
    retry: false, retryOnMount: false, gcTime: Infinity, staleTime: Infinity,
  } } });
  await act(async () => {
    view = TestRenderer.create(<QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/events/' + eventIds[0] + '/proof']}>
        <Link to={'/events/' + eventIds[1] + '/proof'}>Next proof</Link>
        <Routes><Route path='/events/:eventId/proof' element={<Page />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>);
    await pause();
  });
  await act(pause);
}

async function navigate() {
  await act(async () => {
    const link = view.root.findAllByType('a').find(node => text(node) === 'Next proof');
    link.props.onClick({ button: 0, preventDefault() {}, defaultPrevented: false });
    await pause();
  });
  await act(pause);
}

async function verifyCurrent() {
  await act(async () => { await button(view, 'Verify Inclusion').props.onClick(); await pause(); });
  assert.match(text(view.root), matched);
}

async function check(name, operation) {
  globalThis.__proofApi = async id => getMockProof(id);
  globalThis.__proofVerifier = verify;
  globalThis.__eventApi = async id => getMockEventDetail(id);
  globalThis.__certificateApi = async id => getMockCertificate(id);
  try {
    await operation();
    results.push({ name, passed: true });
  } catch (error) {
    results.push({ name, passed: false, error: String(error) });
  } finally {
    onlineManager.setOnline(true);
    if (view) await act(async () => view.unmount());
    client?.clear(); view = undefined; client = undefined;
  }
}

export async function run() {
  await check('another event never inherits the previous proof verdict', async () => {
    await mount();
    await verifyCurrent();
    await navigate();
    assert.doesNotMatch(text(view.root), matched);
    assert.ok(button(view, 'Verify Inclusion'));
    await verifyCurrent();
  });

  await check('a changed proof must be verified again after refresh', async () => {
    await mount();
    await verifyCurrent();
    globalThis.__proofApi = async id => ({ ...getMockProof(id), event_hash: '00'.repeat(32) });
    await act(async () => { await client.refetchQueries(); await pause(); });
    assert.doesNotMatch(text(view.root), matched);
    await act(async () => { await button(view, 'Verify Inclusion').props.onClick(); await pause(); });
    assert.match(text(view.root), /Proof not verified/);
    assert.doesNotMatch(text(view.root), matched);
  });

  await check('a late verification cannot set a verdict for the next event', async () => {
    let release;
    globalThis.__proofVerifier = async (...args) => {
      await new Promise(resolve => { release = resolve; });
      return verify(...args);
    };
    await mount();
    let pending;
    await act(async () => { pending = button(view, 'Verify Inclusion').props.onClick(); await pause(); });
    assert.match(text(view.root), /Verifying/);
    await navigate();
    assert.ok(button(view, 'Verify Inclusion'));
    await act(async () => { release(); await pending; await pause(); });
    assert.doesNotMatch(text(view.root), matched);
    assert.ok(button(view, 'Verify Inclusion'));
  });

  await check('a late verification cannot restore a verdict during refresh', async () => {
    let releaseVerification, releaseResponse;
    globalThis.__proofVerifier = async (...args) => {
      await new Promise(resolve => { releaseVerification = resolve; });
      return verify(...args);
    };
    await mount();
    let pending, refresh;
    await act(async () => { pending = button(view, 'Verify Inclusion').props.onClick(); await pause(); });
    globalThis.__proofApi = async id => {
      await new Promise(resolve => { releaseResponse = resolve; });
      return getMockProof(id);
    };
    await act(async () => { refresh = client.refetchQueries(); await pause(); });
    await act(async () => { releaseVerification(); await pending; await pause(); });
    assert.doesNotMatch(text(view.root), matched);
    await act(async () => { releaseResponse(); await refresh; await pause(); });
    assert.doesNotMatch(text(view.root), matched);
    assert.ok(button(view, 'Verify Inclusion'));
  });

  await check('a failed request is not an anchoring or missing-proof conclusion', async () => {
    globalThis.__proofApi = async () => { throw new Error('offline'); };
    await mount();
    assert.match(text(view.root), /Could not load Merkle proof/);
    assert.doesNotMatch(text(view.root), /may not have been anchored|Proof Not Available/);
    globalThis.__proofApi = async id => getMockProof(id);
    await act(async () => { button(view, 'Retry proof request').props.onClick(); await pause(); });
    assert.ok(button(view, 'Verify Inclusion'));
  });

  await check('proof HTTP 404 reports absent data without an anchoring conclusion', async () => {
    globalThis.__proofApi = async () => { throw new AxiosError('missing', undefined, undefined, undefined, { status: 404 }); };
    await mount();
    assert.match(text(view.root), /Proof Not Available/);
    assert.doesNotMatch(text(view.root), /may not have been anchored|Could not load Merkle proof/);
  });

  await check('offline-paused refresh hides both cached proof and verdict', async () => {
    await mount();
    await verifyCurrent();
    await act(async () => { onlineManager.setOnline(false); void client.refetchQueries(); await pause(); });
    assert.match(text(view.root), /Waiting for a connection/);
    assert.doesNotMatch(text(view.root), matched);
    assert.equal(button(view, 'Verify Inclusion'), undefined);
    await act(async () => { onlineManager.setOnline(true); await pause(); });
    assert.doesNotMatch(text(view.root), matched);
    assert.ok(button(view, 'Verify Inclusion'));
  });
  for (const [name, Page, method, loaded] of [
    ['event', EventDetail, '__eventApi', /Event Details/],
    ['certificate', CertificatePage, '__certificateApi', /VCP Event Certificate/],
  ]) {
    await check(name + ' request failure never becomes a missing-resource claim', async () => {
      const success = globalThis[method];
      globalThis[method] = async () => { throw new Error('offline'); };
      await mount(Page);
      assert.ok(text(view.root).includes('Could not load ' + name));
      assert.doesNotMatch(text(view.root), /Event Not Found|Certificate Not Available/);
      globalThis[method] = success;
      await act(async () => { button(view, 'Retry ' + name + ' request').props.onClick(); await pause(); });
      assert.match(text(view.root), loaded);
    });

    await check(name + ' HTTP 404 preserves the missing-resource response', async () => {
      globalThis[method] = async () => { throw new AxiosError('missing', undefined, undefined, undefined, { status: 404 }); };
      await mount(Page);
      assert.match(text(view.root), name === 'event' ? /Event Not Found/ : /Certificate Not Available/);
      assert.ok(!text(view.root).includes('Could not load ' + name));
    });

    await check(name + ' failed refresh hides the previously displayed resource', async () => {
      await mount(Page);
      assert.match(text(view.root), loaded);
      globalThis[method] = async () => { throw new Error('offline'); };
      await act(async () => { await client.refetchQueries(); await pause(); });
      assert.ok(text(view.root).includes('Could not load ' + name));
      assert.doesNotMatch(text(view.root), loaded);
      assert.equal(button(view, 'Print / Save as PDF'), undefined);
    });

    await check(name + ' offline-paused refresh hides cached data and resumes', async () => {
      await mount(Page);
      await act(async () => { onlineManager.setOnline(false); void client.refetchQueries(); await pause(); });
      assert.match(text(view.root), /Waiting for a connection/);
      assert.doesNotMatch(text(view.root), loaded);
      assert.equal(button(view, 'Print / Save as PDF'), undefined);
      await act(async () => { onlineManager.setOnline(true); await pause(); });
      assert.match(text(view.root), loaded);
    });
  }
  return results;
}
`,
  },
  bundle: true, platform: 'node', format: 'cjs', write: false,
  loader: { '.css': 'empty' },
  define: { 'process.env.NODE_ENV': '"development"' },
  alias: { '@': path.resolve('src'), react: path.resolve('node_modules/react') },
  plugins: [{
    name: 'proof-request-fixture',
    setup(build) {
      build.onResolve({ filter: /^@\/lib\/api-client$/ }, () => ({ path: 'api', namespace: 'fixture' }));
      build.onResolve({ filter: /^@\/lib\/crypto$/ }, () => ({ path: 'crypto', namespace: 'fixture' }));
      build.onLoad({ filter: /^api$/, namespace: 'fixture' }, () => ({ contents: `
        export const vcpClient = {
          getMerkleProof: (...args) => globalThis.__proofApi(...args),
          getEventById: (...args) => globalThis.__eventApi(...args),
          getCertificate: (...args) => globalThis.__certificateApi(...args),
        };
      ` }));
      build.onLoad({ filter: /^crypto$/, namespace: 'fixture' }, () => ({ resolveDir: process.cwd(), contents: `
        export { truncateHash } from ${JSON.stringify(path.resolve('src/lib/crypto.ts'))};
        export const verifyMerkleProof = (...args) => globalThis.__proofVerifier(...args);
      ` }));
    },
  }],
});
const compiled = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(
  createRequire(import.meta.url), compiled, compiled.exports,
);
const results = await compiled.exports.run();
for (const result of results) console.log(JSON.stringify(result));
stop();
process.stdout.write('', () => process.exit(results.some(result => !result.passed) ? 1 : 0));

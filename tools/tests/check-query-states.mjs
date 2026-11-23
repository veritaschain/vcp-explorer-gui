// Component/query behavior checks, not browser rendering or accessibility validation.
// The React renderer is installed separately from the application lock by CI.
import { build, stop } from 'esbuild';
import { createRequire } from 'node:module';
import path from 'node:path';

const renderer = process.env.REACT_TEST_RENDERER_MODULE;
if (!renderer) throw new Error('Set REACT_TEST_RENDERER_MODULE to the renderer matching the installed React version.');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const result = await build({
  stdin: {
    resolveDir: process.cwd(), loader: 'tsx',
    contents: `
import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from ${JSON.stringify(renderer)};
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { Dashboard } from './src/pages/Dashboard';
import { SearchPage } from './src/pages/SearchPage';
import { Header } from './src/components/layout/Header';
import { getMockEvents, getMockSystemStatus } from './src/mock-data/events';

const pause = () => new Promise(resolve => setTimeout(resolve, 30));
const text = node => typeof node === 'string' ? node : node?.children?.map(text).join(' ') ?? '';
const button = (view, name) => view.root.findAllByType('button').find(node => text(node).trim() === name);
const results = [];
const calls = [];
let view, client;

async function mount(element, route = '/') {
  client = new QueryClient({ defaultOptions: { queries: {
    retry: false, retryOnMount: false, gcTime: Infinity, staleTime: Infinity,
  } } });
  await act(async () => {
    view = TestRenderer.create(<QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true }}>{element}</MemoryRouter>
    </QueryClientProvider>);
    await pause();
  });
  await act(pause);
  return view;
}

async function check(name, operation) {
  calls.length = 0;
  globalThis.__queryStateApi = {
    getSystemStatus: async () => getMockSystemStatus(),
    searchEvents: async params => { calls.push(params); return getMockEvents(params); },
  };
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
  await check('dashboard distinguishes failed requests from loading', async () => {
    globalThis.__queryStateApi.getSystemStatus = async () => { throw new Error('offline'); };
    globalThis.__queryStateApi.searchEvents = async () => { throw new Error('offline'); };
    await mount(<Dashboard />);
    const output = text(view.root);
    assert.match(output, /System metadata unavailable/);
    assert.match(output, /Could not load recent events/);
    assert.doesNotMatch(output, /Loading anchor data/);
  });

  await check('dashboard distinguishes an empty response from loading', async () => {
    globalThis.__queryStateApi.getSystemStatus = async () => ({ ...getMockSystemStatus(), last_anchor: null });
    globalThis.__queryStateApi.searchEvents = async () => ({ events: [], total: 0, query: {} });
    await mount(<Dashboard />);
    const output = text(view.root);
    assert.match(output, /No anchor record supplied/);
    assert.match(output, /No recent events returned/);
    assert.doesNotMatch(output, /Loading anchor data/);
  });

  await check('dashboard still labels supplied anchor metadata as unverified', async () => {
    await mount(<Dashboard />);
    assert.match(text(view.root), /Anchor not verified/);
    assert.match(text(view.root), /does not check the transaction or anchor on-chain/);
  });

  await check('dashboard pending requests do not become empty or failed results', async () => {
    globalThis.__queryStateApi.getSystemStatus = () => new Promise(() => {});
    globalThis.__queryStateApi.searchEvents = () => new Promise(() => {});
    await mount(<Dashboard />);
    assert.match(text(view.root), /Loading anchor data/);
    assert.match(text(view.root), /Loading recent events/);
    assert.doesNotMatch(text(view.root), /No anchor record supplied|No recent events returned|unavailable/);
  });

  await check('failed dashboard refresh hides cached data and retry restores current data', async () => {
    await mount(<Dashboard />);
    globalThis.__queryStateApi.getSystemStatus = async () => { throw new Error('offline'); };
    globalThis.__queryStateApi.searchEvents = async () => { throw new Error('offline'); };
    await act(async () => { await client.refetchQueries(); await pause(); });
    assert.match(text(view.root), /System metadata unavailable/);
    assert.doesNotMatch(text(view.root), /Anchor not verified|12,160,243/);
    assert.equal(view.root.findAllByType('a').filter(node => node.props.href?.startsWith('/events/')).length, 0);
    globalThis.__queryStateApi.getSystemStatus = async () => getMockSystemStatus();
    globalThis.__queryStateApi.searchEvents = async params => getMockEvents(params);
    await act(async () => {
      button(view, 'Retry system metadata').props.onClick();
      button(view, 'Retry recent events').props.onClick();
      await pause();
    });
    assert.match(text(view.root), /Anchor not verified/);
    assert.doesNotMatch(text(view.root), /System metadata unavailable|Could not load recent events/);
  });

  await check('offline-paused dashboard refresh hides cached data until resumption', async () => {
    await mount(<Dashboard />);
    await act(async () => {
      onlineManager.setOnline(false);
      void client.refetchQueries();
      await pause();
    });
    assert.match(text(view.root), /Waiting for a connection/);
    assert.doesNotMatch(text(view.root), /Anchor not verified|12,160,243/);
    assert.equal(view.root.findAllByType('a').filter(node => node.props.href?.startsWith('/events/')).length, 0);
    await act(async () => { onlineManager.setOnline(true); await pause(); });
    assert.match(text(view.root), /Anchor not verified/);
  });

  const search = <><Header /><Routes><Route path='/search' element={<SearchPage />} /></Routes></>;
  await check('a second global search on the same route changes the query', async () => {
    await mount(search, '/search?q=XAUUSD');
    assert.equal(view.root.findAllByType('input').find(node => node.props['aria-label'] === 'Search query').props.value, 'XAUUSD');
    const input = view.root.findAllByType('input').find(node => node.props['aria-label'] === 'Search events');
    await act(async () => input.props.onChange({ target: { value: 'EURUSD' } }));
    await act(async () => {
      view.root.findAllByType('form')[0].props.onSubmit({ preventDefault() {} });
      await pause();
    });
    await act(pause);
    assert.equal(calls.at(-1).symbol, 'EURUSD');
    // The global search also works when its URL already has that q value but
    // the user has since edited the local search box.
    const local = view.root.findAllByType('input').find(node => node.props['aria-label'] === 'Search query');
    await act(async () => { local.props.onChange({ target: { value: 'XAUUSD' } }); await pause(); });
    assert.equal(local.props.value, 'XAUUSD');
    await act(async () => {
      view.root.findAllByType('form')[0].props.onSubmit({ preventDefault() {} });
      await pause();
    });
    assert.equal(view.root.findAllByType('input').find(node => node.props['aria-label'] === 'Search query').props.value, 'EURUSD');
    assert.equal(view.root.findAllByType('a').filter(node => node.props.href?.startsWith('/events/')).length, getMockEvents({ symbol: 'EURUSD' }).events.length);
  });

  await check('changing a filter resets later-page offset', async () => {
    const sample = getMockEvents().events[0];
    const rows = Array.from({ length: 45 }, (_, index) => ({
      ...sample, event_id: '01934e3a-6a1a-7c82-9d1b-' + String(index + 1).padStart(12, '0'),
      type: index < 3 ? 'ORD' : 'EXE',
    }));
    globalThis.__queryStateApi.searchEvents = async params => {
      calls.push(params);
      const filtered = params.event_type ? rows.filter(row => row.type === params.event_type) : rows;
      const page = filtered.slice(params.offset, params.offset + params.limit);
      return { events: page, total: page.length, query: params };
    };
    await mount(search, '/search');
    await act(async () => { button(view, 'Next').props.onClick(); await pause(); });
    await act(async () => { button(view, 'Next').props.onClick(); await pause(); });
    assert.equal(calls.at(-1).offset, 40);
    await act(async () => button(view, 'Filters').props.onClick());
    await act(async () => {
      view.root.findAllByType('select')[0].props.onChange({ target: { value: 'ORD' } });
      await pause();
    });
    assert.equal(calls.at(-1).offset, 0);
    assert.doesNotMatch(text(view.root), /No events returned/);
  });

  await check('page-count API responses permit next pages and recovery from an empty final page', async () => {
    const sample = getMockEvents().events[0];
    const rows = Array.from({ length: 40 }, (_, index) => ({
      ...sample, event_id: '01934e3a-6a1a-7c82-9d1b-' + String(index + 1).padStart(12, '0'),
    }));
    let releaseSecond;
    let holdSecond = true;
    let releaseEmpty;
    let holdEmpty = false;
    globalThis.__queryStateApi.searchEvents = async params => {
      calls.push(params);
      const page = rows.slice(params.offset, params.offset + params.limit);
      if (params.offset === 20 && holdSecond) {
        await new Promise(resolve => { releaseSecond = resolve; });
      }
      if (params.offset === 40 && holdEmpty) {
        await new Promise(resolve => { releaseEmpty = resolve; });
      }
      return { events: page, total: page.length, query: params };
    };
    await mount(search, '/search');
    assert.equal(button(view, 'Next').props.disabled, false);
    assert.equal(button(view, 'Last'), undefined);
    assert.doesNotMatch(text(view.root), /Page 1 of|of 20 results/);
    await act(async () => { button(view, 'Next').props.onClick(); await pause(); });
    assert.equal(calls.at(-1).offset, 20);
    assert.equal(button(view, 'Next').props.disabled, true);
    assert.equal(button(view, 'Previous').props.disabled, true);
    assert.equal(button(view, 'First').props.disabled, true);
    await act(async () => { holdSecond = false; releaseSecond(); await pause(); });
    assert.equal(button(view, 'Next').props.disabled, false);
    await act(async () => button(view, 'Next').props.onClick());
    await act(pause);
    assert.equal(calls.at(-1).offset, 40);
    assert.match(text(view.root), /No events returned on this page/);
    assert.equal(button(view, 'Next').props.disabled, true);
    assert.equal(button(view, 'Previous').props.disabled, false);
    assert.equal(button(view, 'First').props.disabled, false);
    assert.equal(button(view, 'Back to first page').props.disabled, false);
    await act(async () => { holdEmpty = true; void client.refetchQueries(); await pause(); });
    assert.equal(button(view, 'Back to first page').props.disabled, true);
    assert.equal(button(view, 'Previous').props.disabled, true);
    assert.equal(button(view, 'First').props.disabled, true);
    assert.equal(button(view, 'Next').props.disabled, true);
    await act(async () => { holdEmpty = false; releaseEmpty(); await pause(); });
    assert.equal(button(view, 'Back to first page').props.disabled, false);
    await act(async () => { button(view, 'Previous').props.onClick(); await pause(); });
    assert.equal(view.root.findAllByType('a').filter(node => node.props.href?.startsWith('/events/')).length, 20);
    await act(async () => { button(view, 'First').props.onClick(); await pause(); });
    assert.equal(button(view, 'First').props.disabled, true);
  });

  await check('an unsupported query never performs an unfiltered search', async () => {
    await mount(search, '/search?q=' + 'a'.repeat(64));
    assert.equal(calls.length, 0);
    assert.match(text(view.root), /Unsupported search/);
    await act(async () => view.root.findAllByType('form')[1].props.onSubmit({ preventDefault() {} }));
    assert.equal(calls.length, 0);
  });

  await check('failed search refresh hides cached results and can be retried', async () => {
    await mount(search, '/search?q=XAUUSD');
    globalThis.__queryStateApi.searchEvents = async () => { throw new Error('offline'); };
    await act(async () => { await client.refetchQueries(); await pause(); });
    assert.match(text(view.root), /Results unavailable/);
    assert.doesNotMatch(text(view.root), /No events found|Showing/);
    assert.equal(view.root.findAllByType('a').filter(node => node.props.href?.startsWith('/events/')).length, 0);
    globalThis.__queryStateApi.searchEvents = async params => getMockEvents(params);
    await act(async () => { button(view, 'Retry search').props.onClick(); await pause(); });
    assert.match(text(view.root), /Showing/);
    assert.doesNotMatch(text(view.root), /Results unavailable/);
  });

  await check('offline-paused search hides the previous page until resumption', async () => {
    await mount(search, '/search?q=XAUUSD');
    await act(async () => {
      onlineManager.setOnline(false);
      view.root.findAllByType('form')[1].props.onSubmit({ preventDefault() {} });
      await pause();
    });
    assert.match(text(view.root), /Waiting for a connection/);
    assert.doesNotMatch(text(view.root), /Showing/);
    assert.equal(view.root.findAllByType('a').filter(node => node.props.href?.startsWith('/events/')).length, 0);
    await act(async () => { onlineManager.setOnline(true); await pause(); });
    assert.match(text(view.root), /Showing/);
  });

  await check('a UUID offers explicit event-detail navigation without an event_id filter', async () => {
    const id = getMockEvents().events[0].event_id;
    await mount(search, '/search?q=' + id);
    const link = view.root.findAllByType('a').find(node => text(node).trim() === 'Open as Event ID');
    assert.equal(link?.props.href, '/events/' + id);
    assert.equal(calls.at(-1).trace_id, id);
    assert.equal(calls.at(-1).event_id, undefined);
    assert.doesNotMatch(text(view.root), /Showing 1-0/);
  });
  return results;
}
`,
  },
  bundle: true, platform: 'node', format: 'cjs', write: false,
  define: { 'process.env.NODE_ENV': '"development"' },
  alias: { '@': path.resolve('src'), react: path.resolve('node_modules/react') },
  plugins: [{
    name: 'query-state-fixture',
    setup(build) {
      build.onResolve({ filter: /^@\/lib\/api-client$/ }, () => ({ path: 'api-fixture', namespace: 'test' }));
      build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: `
        export const vcpClient = {
          getSystemStatus: (...args) => globalThis.__queryStateApi.getSystemStatus(...args),
          searchEvents: (...args) => globalThis.__queryStateApi.searchEvents(...args),
        };
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
// React act() leaves MessagePorts alive in this bundled Node-only renderer.
// Every scenario and unmount has completed; flush the report before exiting.
process.stdout.write('', () => process.exit(results.some(result => !result.passed) ? 1 : 0));

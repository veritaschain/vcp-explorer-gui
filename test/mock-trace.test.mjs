import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getMockEvents, getMockEventDetail } from '../src/mock-data/events.ts';
import { inspectChainLinks } from '../src/lib/chain-inspection.mjs';

const traces = [
  ['01934e3a-6a1a-7000-8000-aaaaaaaaaaaa', [1, 2, 3, 4]],
  ['01934e3b-5b2b-7000-9000-bbbbbbbbbbbb', [5, 6, 7]],
  ['01934e3c-4c3c-7000-a000-cccccccccccc', [8]],
  ['01934e3d-3d4d-7000-b000-dddddddddddd', [9, 10]],
  ['01934e3e-2e5e-7000-8000-eeeeeeeeeeee', [11, 12]],
];
const suffix = event => Number(event.event_id.slice(-12));

test('each known mock trace returns only its own events and all fetched details agree with that trace', () => {
  const observed = [];
  for (const [trace, expected] of traces) {
    const response = getMockEvents({ trace_id: trace });
    assert.equal(response.total, expected.length);
    assert.deepEqual(response.events.map(suffix), expected);
    const details = response.events.map(event => getMockEventDetail(event.event_id));
    const inspection = inspectChainLinks(trace, response.events.map(event => event.event_id), details);
    assert.equal(inspection.status, expected.length === 1 ? 'INSUFFICIENT_DATA' : 'LINKS_MATCH');
    assert.equal(inspection.cryptographicIntegrity, 'NOT_CHECKED');
    assert.equal(inspection.completeness, 'NOT_ESTABLISHED');
    for (const event of response.events) {
      const detail = getMockEventDetail(event.event_id);
      assert.equal(detail.header.event_id, event.event_id);
      assert.equal(detail.header.trace_id, trace);
      observed.push(event.event_id);
    }
  }
  assert.equal(new Set(observed).size, 12);
  assert.equal(getMockEvents().total, 12);
});

test('an unknown trace yields zero records and an unknown detail never substitutes a known event', () => {
  for (const trace of ['01934e3f-0000-7000-8000-ffffffffffff', 'not-a-known-trace']) {
    const result = getMockEvents({ trace_id: trace });
    assert.deepEqual(result.events, []);
    assert.equal(result.total, 0);
  }
  assert.throws(() => getMockEventDetail('01934e3f-0000-7000-8000-ffffffffffff'));
});

test('trace selection composes with event type and pagination instead of slicing an unrelated global list', () => {
  const [trace] = traces[0];
  const typed = getMockEvents({ trace_id: trace, event_type: 'ORD' });
  assert.equal(typed.total, 1);
  assert.deepEqual(typed.events.map(suffix), [2]);
  const page = getMockEvents({ trace_id: traces[1][0], limit: 1, offset: 1 });
  assert.equal(page.total, 3);
  assert.deepEqual(page.events.map(suffix), [6]);
  assert.equal(getMockEventDetail(page.events[0].event_id).header.trace_id, traces[1][0]);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChainDataError, MAX_CHAIN_EVENTS, chainEventIds, inspectChainLinks } from '../src/lib/chain-inspection.mjs';

// Deliberately invented hashes: these fixtures have no canonical event hash,
// trusted signature, external anchor, or evidence of a complete event history.
const TRACE = '01934e3a-6a1a-7000-8000-aaaaaaaaaaaa';
const OTHER_TRACE = '01934e3b-5b2b-7000-9000-bbbbbbbbbbbb';
const id = value => `01934e3a-6a1a-7000-8000-${value.toString(16).padStart(12, '0')}`;
const clone = value => structuredClone(value);
function detail(index, eventHash, prevHash) {
  return {
    header: { event_id: id(index), trace_id: TRACE, event_type: 'SIG',
      timestamp_iso: '2025-11-25T12:00:00.000Z' },
    payload: { unrelated_unverified_content: 'This is not a cryptographic fixture.' },
    security: { event_hash: eventHash, prev_hash: prevHash },
  };
}
const pair = () => [detail(1, 'a'.repeat(64), 'f'.repeat(64)), detail(2, 'b'.repeat(64), 'a'.repeat(64))];
const ids = values => values.map(value => value.header.event_id);
const search = values => ({ events: values.map(value => ({ event_id: value })), total: values.length,
  query: { trace_id: TRACE } });
function scoped(result) {
  assert.equal(result.cryptographicIntegrity, 'NOT_CHECKED');
  assert.equal(result.completeness, 'NOT_ESTABLISHED');
  assert.equal(Object.hasOwn(result, 'isValid'), false, 'Link equality must not expose a general validity flag');
}

test('search IDs preserve the supplied order and do not claim pagination is a complete trace', () => {
  const response = { ...search([id(2), id(1)]), total: 200 };
  assert.deepEqual(chainEventIds(response), [id(2), id(1)]);
  assert.deepEqual(chainEventIds(search([])), []);
  assert.deepEqual(chainEventIds({ ...search([]), total: 5 }), []);
});

test('search rejects duplicate IDs, malformed totals, unsupported IDs and oversized batches', () => {
  assert.equal(MAX_CHAIN_EVENTS, 50);
  const valid = search([id(1), id(2)]);
  const values = [null, [], { ...valid, events: null }, { ...valid, events: [{}] },
    search([id(1), id(1)]), search(['not-an-event-id']), search([id(1).toUpperCase()]),
    ...[-1, 1, 1.5, '2', Number.MAX_SAFE_INTEGER + 1].map(total => ({ ...valid, total })),
    search(Array.from({ length: 51 }, (_, index) => id(index + 1)))];
  for (const value of values) assert.throws(() => chainEventIds(value), ChainDataError);
  assert.equal(chainEventIds(search(Array.from({ length: 50 }, (_, index) => id(index + 1)))).length, 50);
});

test('matching invented hash strings report link equality, never cryptographic validity or completeness', () => {
  const values = pair(), result = inspectChainLinks(TRACE, ids(values), values);
  assert.equal(result.status, 'LINKS_MATCH');
  assert.equal(result.eventCount, 2);
  assert.equal(result.checkedLinks, 1);
  assert.equal(result.mismatchAt, null);
  scoped(result);
  values[0].payload.unrelated_unverified_content = 'Payload was changed without recomputing any hash.';
  const changed = inspectChainLinks(TRACE, ids(values), values);
  assert.equal(changed.status, 'LINKS_MATCH');
  scoped(changed);
});

test('empty and singleton results do not vacuously pass and a zero predecessor does not establish genesis', () => {
  for (const values of [[], [detail(1, 'a'.repeat(64), '0'.repeat(64))], [pair()[0]]]) {
    const result = inspectChainLinks(TRACE, ids(values), values);
    assert.equal(result.status, 'INSUFFICIENT_DATA');
    assert.equal(result.checkedLinks, 0);
    scoped(result);
  }
});

test('detail IDs and trace IDs must bind every response to its requested position and selected trace', () => {
  const changes = [
    values => { values[0].header.event_id = id(3); },
    values => { values[1].header.event_id = values[0].header.event_id; },
    values => { values[0].header.trace_id = OTHER_TRACE; },
    values => { values[1].header.trace_id = OTHER_TRACE; },
    values => { values.reverse(); },
    values => { values.pop(); },
  ];
  for (const change of changes) {
    const values = pair(), requested = ids(values);
    change(values);
    const result = inspectChainLinks(TRACE, requested, values);
    assert.equal(result.status, 'INVALID_DATA');
    scoped(result);
  }
  const values = pair();
  assert.equal(inspectChainLinks(OTHER_TRACE, ids(values), values).status, 'INVALID_DATA');
  assert.equal(inspectChainLinks(TRACE, [id(1), id(1)], values).status, 'INVALID_DATA');
});

test('adjacency is checked in the returned order without silently sorting or repairing a mismatch', () => {
  const values = pair();
  values[1].security.prev_hash = 'c'.repeat(64);
  const result = inspectChainLinks(TRACE, ids(values), values);
  assert.equal(result.status, 'LINK_MISMATCH');
  assert.equal(result.mismatchAt, 1);
  scoped(result);
  const reversed = pair().reverse();
  const reverseResult = inspectChainLinks(TRACE, ids(reversed), reversed);
  assert.equal(reverseResult.status, 'LINK_MISMATCH');
  scoped(reverseResult);
});

test('a nonzero predecessor on the first returned record remains an unchecked boundary', () => {
  const values = pair();
  for (const prevHash of ['0'.repeat(64), 'f'.repeat(64)]) {
    values[0].security.prev_hash = prevHash;
    const result = inspectChainLinks(TRACE, ids(values), values);
    assert.equal(result.status, 'LINKS_MATCH');
    assert.equal(result.checkedLinks, 1);
    scoped(result);
  }
});

test('hexadecimal case is normalized for link comparison while malformed hash values are rejected', () => {
  const values = pair();
  values[0].security.event_hash = values[0].security.event_hash.toUpperCase();
  assert.equal(inspectChainLinks(TRACE, ids(values), values).status, 'LINKS_MATCH');
  for (const bad of ['', 'a'.repeat(63), 'a'.repeat(65), 'a'.repeat(64) + '\n', 'z'.repeat(64), null, true, 0]) {
    for (const field of ['event_hash', 'prev_hash']) {
      const changed = pair(); changed[1].security[field] = bad;
      const result = inspectChainLinks(TRACE, ids(changed), changed);
      assert.equal(result.status, 'INVALID_DATA');
      scoped(result);
    }
  }
});

test('unsupported event types and invalid display timestamps cannot reach the normal rendering path', () => {
  for (const patch of [{ event_type: 'MADE_UP' }, { event_type: true },
    { timestamp_iso: '' }, { timestamp_iso: 'not-a-date' }, { timestamp_iso: 'x'.repeat(65) },
    { timestamp_iso: 1732536000000 }]) {
    const values = pair(); Object.assign(values[0].header, patch);
    const result = inspectChainLinks(TRACE, ids(values), values);
    assert.equal(result.status, 'INVALID_DATA');
    scoped(result);
  }
});

test('inspection is deterministic and does not rewrite the supplied detail records', () => {
  const values = pair(), before = clone(values);
  const first = inspectChainLinks(TRACE, ids(values), values);
  assert.deepEqual(values, before);
  assert.deepEqual(inspectChainLinks(TRACE, ids(values), values), first);
});
